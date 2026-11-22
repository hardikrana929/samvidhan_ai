import { embedText } from './embeddings.js';
import { SOURCE } from './corpus.js';

let clientPromise;
async function collection() {
  if (!process.env.MONGODB_URI || process.env.ATLAS_VECTOR_SEARCH_ENABLED !== 'true') return null;
  if (!clientPromise) {
    clientPromise = import('mongodb').then(async ({ MongoClient }) => {
      const client = new MongoClient(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_TIMEOUT_MS || 5000),
      });
      await client.connect();
      return client.db(process.env.MONGODB_DB_NAME || 'samvidhan_ai')
        .collection(process.env.MONGODB_COLLECTION || 'constitutional_chunks');
    }).catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

export async function searchAtlasChunks(question, limit = 8) {
  const coll = await collection();
  if (!coll || !process.env.GEMINI_API_KEY) return [];
  const queryVector = await embedText(question, 'RETRIEVAL_QUERY');
  const results = await coll.aggregate([
    {
      $vectorSearch: {
        index: process.env.ATLAS_VECTOR_INDEX || 'constitution_vector_index',
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(80, limit * 12),
        limit,
        filter: { sourceVersion: { $eq: SOURCE.documentDate } },
      },
    },
    { $addFields: { score: { $meta: 'vectorSearchScore' } } },
    { $project: { embedding: 0, _id: 0 } },
  ]).toArray();
  return results.map((item) => ({ ...item, source: SOURCE }));
}

export async function getAtlasStatus() {
  if (!process.env.MONGODB_URI || process.env.ATLAS_VECTOR_SEARCH_ENABLED !== 'true') {
    return { configured: false, mode: 'local_keyword_search', note: 'Atlas Vector Search is opt-in; local keyword retrieval is active.' };
  }
  try {
    const coll = await collection();
    const count = await coll.countDocuments({ sourceVersion: SOURCE.documentDate });
    const indexes = await coll.aggregate([{ $listSearchIndexes: { name: process.env.ATLAS_VECTOR_INDEX || 'constitution_vector_index' } }]).toArray();
    const index = indexes[0];
    if (!index?.queryable || count === 0) return { configured: true, mode: 'local_keyword_search', indexedChunks: count, vectorIndex: index?.status || 'not_created_or_building' };
    return { configured: true, mode: 'atlas_vector_search', indexedChunks: count, vectorIndex: index.status };
  } catch {
    return { configured: true, mode: 'local_keyword_search', warning: 'Atlas connection/index is not ready.' };
  }
}
