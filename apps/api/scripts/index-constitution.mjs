import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';
import { embedText } from '../src/embeddings.js';

const corpusUrl = new URL('../src/generated-corpus.json', import.meta.url);
const corpus = JSON.parse(await readFile(corpusUrl, 'utf8'));
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is missing from apps/api/.env');
if (process.env.ATLAS_VECTOR_SEARCH_ENABLED !== 'true') throw new Error('Set ATLAS_VECTOR_SEARCH_ENABLED=true only when MONGODB_URI points to a MongoDB Atlas deployment with Vector Search. Local MongoDB uses the built-in keyword retriever.');
if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required to generate document embeddings.');

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function embedWithRetry(text) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await embedText(text, 'RETRIEVAL_DOCUMENT');
    } catch (error) {
      lastError = error;
      if (attempt === 4) break;
      await sleep(Math.min(15000, 1000 * (2 ** attempt)));
    }
  }
  throw lastError;
}

async function mapLimit(items, concurrency, callback) {
  let next = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      await callback(items[index], index);
    }
  });
  await Promise.all(workers);
}

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'samvidhan_ai');
  const collection = db.collection(process.env.MONGODB_COLLECTION || 'constitutional_chunks');
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ sourceVersion: 1, articleId: 1 });

  const existing = await collection.find(
    { sourceVersion: corpus.source.documentDate },
    { projection: { id: 1, contentHash: 1, embedding: 1 } },
  ).toArray();
  const existingById = new Map(existing.map((item) => [item.id, item]));
  const pending = corpus.chunks.filter((chunk) => {
    const embeddingText = `${chunk.identifier}: ${chunk.title}\n${chunk.text}`;
    const hash = createHash('sha256').update(embeddingText).digest('hex');
    const saved = existingById.get(chunk.id);
    return !saved || saved.contentHash !== hash || saved.embedding?.length !== 768;
  });

  console.log(`Corpus: ${corpus.articles.length} Article records, ${corpus.chunks.length} chunks.`);
  console.log(`Existing vectors: ${existing.length}; vectors to create/update: ${pending.length}.`);
  let completed = 0;
  await mapLimit(pending, Number(process.env.EMBEDDING_CONCURRENCY || 2), async (chunk) => {
    const embedding = await embedWithRetry(`${chunk.identifier}: ${chunk.title}\n${chunk.text}`);
    const contentHash = createHash('sha256').update(`${chunk.identifier}: ${chunk.title}\n${chunk.text}`).digest('hex');
    await collection.updateOne(
      { id: chunk.id },
      {
        $set: {
          ...chunk,
          sourceName: corpus.source.name,
          sourceUrl: corpus.source.url,
          sourceVersion: corpus.source.documentDate,
          sourceSha256: corpus.source.sha256,
          contentHash,
          embedding,
          indexedAt: new Date(),
        },
      },
      { upsert: true },
    );
    completed += 1;
    if (completed % 20 === 0 || completed === pending.length) {
      console.log(`Embedded and stored ${completed}/${pending.length} changed chunks.`);
    }
  });

  console.log(`Done. ${corpus.chunks.length} Constitution chunks are stored for Atlas Vector Search.`);
  console.log(`Create the Atlas index using apps/api/config-constitution-vector-index.json.`);
} finally {
  await client.close();
}
