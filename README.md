# Samvidhan AI

A source-first educational Constitution of India learning application. The checked-in corpus is extracted from the Legislative Department's sixth pocket-size diglot edition dated 10 September 2026 (the preface says the text incorporates amendments through the 106th Amendment Act, 2023).

## Windows setup (PowerShell / VS Code)

Requirements: Node.js 20+ and npm. No Python, WSL, Linux, local translation model, or GPU is needed for the default application.

1. Extract the ZIP and open its root folder in VS Code.
2. Create the backend environment file:

   ```powershell
   Copy-Item apps/api/.env.example apps/api/.env
   ```

3. Add your Gemini API key to `apps/api/.env`. Keep the file private; it is ignored by Git.
4. Install dependencies and start both apps:

   ```powershell
   npm install
   npm run dev
   ```

5. Open `http://localhost:5173`.

## Full Constitution corpus

The repository includes `apps/api/src/generated-corpus.json`, built from `data/constitution-official.pdf`:

- 402 PDF pages.
- 481 Article records, including inserted and omitted Article records represented in the source.
- All 12 Schedules and 3 Appendices.
- 2,165 bounded clause/passage chunks for retrieval.
- Article identifiers, headings, extracted text, clause-reference hints, PDF page ranges, source URL, edition date and PDF SHA-256.

**Content status is `machine_extracted_pending_human_review`.** This is not a claim that every extracted character, heading, clause boundary or legal interpretation has been human-verified. The PDF is an official Legislative Department source; the JSON is a machine extraction. The app shows that distinction and links to the source PDF at the relevant page. Human editorial review is required before production legal/educational publication.

### Local retrieval without Atlas

The app works immediately using a deterministic local keyword retrieval index over all 2,165 passages. It does not require MongoDB for local development. A local MongoDB URI does not activate Atlas Vector Search; keep `ATLAS_VECTOR_SEARCH_ENABLED=false` for local MongoDB and use the built-in keyword retriever. If Atlas is not configured or its vector index is not ready, the API falls back to local keyword retrieval rather than returning fake success.

### Optional MongoDB Atlas Vector Search

Atlas adds semantic retrieval for questions whose wording differs from the English source text. It requires a MongoDB Atlas deployment with Vector Search support and a Gemini API key for embeddings.

1. Create an Atlas database and database user. Allow your development IP in Atlas Network Access.
2. In `apps/api/.env`, set:

   ```env
   MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
   ATLAS_VECTOR_SEARCH_ENABLED=true
   MONGODB_DB_NAME=samvidhan_ai
   MONGODB_COLLECTION=constitutional_chunks
   ATLAS_VECTOR_INDEX=constitution_vector_index
   GEMINI_EMBEDDING_MODEL=gemini-embedding-001
   EMBEDDING_DIMENSIONS=768
   EMBEDDING_CONCURRENCY=2
   ```

3. Run the indexer from the project root:

   ```powershell
   npm run index:constitution
   ```

   The indexer generates one Gemini embedding per source passage and upserts it into MongoDB. It skips unchanged passages on later runs. This uses Gemini embedding quota and may incur charges depending on your account/plan; 2,165 passages can take several minutes. Do not run it repeatedly unless the corpus changed or embeddings need rebuilding.

4. In MongoDB Atlas, open the `samvidhan_ai` database and `constitutional_chunks` collection. Create a **Vector Search** index named `constitution_vector_index` using the exact JSON in `apps/api/config-constitution-vector-index.json`:

   ```json
   {
     "fields": [
       { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
       { "type": "filter", "path": "sourceVersion" }
     ]
   }
   ```

5. Wait until the index status is `READY` / queryable. Restart the API if necessary, then check:

   ```powershell
   Invoke-RestMethod http://localhost:5000/ready
   Invoke-RestMethod http://localhost:5000/api/v1/corpus/status
   ```

   `retrieval.mode` should report `atlas_vector_search`. If not, inspect the Atlas URI, database user, network access, vector index name and index status. Local keyword retrieval remains available as a fallback.

The embedding provider is `gemini-embedding-001`, using `RETRIEVAL_DOCUMENT` for corpus passages and `RETRIEVAL_QUERY` for user questions. The 768-dimensional vectors are normalized before storage. The dimension must match the Atlas index definition.

## Re-importing a newer official PDF (optional)

The checked-in JSON already contains the imported corpus; you do not need to re-import it to run the app. To update it from a later official PDF on Windows:

1. Replace `data/constitution-official.pdf` only after confirming that it is an official, newer consolidated edition.
2. Install Poppler for Windows and add its `Library/bin` folder (the folder containing `pdftotext.exe`) to your PATH.
3. Set `CONSTITUTION_DOCUMENT_DATE` to the date stated in the new PDF preface, then run:

   ```powershell
   $env:CONSTITUTION_DOCUMENT_DATE = "YYYY-MM-DD"
   npm run corpus:import
   ```

4. Review the generated corpus and source hash before committing. If Atlas is enabled, rerun `npm run index:constitution` to index the changed source version.

No Python packages are used by this workflow. The importer uses Poppler's `pdftotext -layout` command and a Node.js parser.

## Translation

Open `http://localhost:5173/translate`. The backend calls Gemini using the server-side `GEMINI_API_KEY`. The registry includes all 22 Scheduled Languages and the configured alternate script codes for Kashmiri, Manipuri and Sindhi. This is cloud AI translation, **not IndicTrans2** and not an official constitutional translation. The app does not claim that all 22 language outputs have been linguistically certified; language-by-language human review is still required.

## Voice

The Ask AI page uses browser Web Speech APIs where available. Microphone recognition requires a supported browser (try current Chrome), microphone permission and an available speech language. Text-to-speech uses browser/OS voices. Recognition and playback quality vary by device and language; review transcripts before submitting.

## Commands

```powershell
npm test
npm run lint
npm run build
```

`npm install` is required after this update because the API workspace now uses the official MongoDB Node.js driver for optional Atlas indexing and retrieval.

## Current limitations

- The PDF extraction is machine-generated and pending human review; it must not be represented as a fully human-verified legal corpus.
- Atlas semantic retrieval requires a configured Atlas deployment, a queryable Vector Search index, and Gemini embedding access. Local keyword retrieval works without Atlas.
- AI explanations and cloud translations require a valid Gemini API key and remain subject to language/model quality limits.
- Voice depends on browser and operating-system speech support.
- The original IndicTrans2 self-hosted Python service is not part of the Windows-only default runtime. No Python, WSL or local model is required for this setup.
- Authentication, reviewer approvals, durable feedback storage and production admin workflows remain separate implementation work.

## Security

Never commit `.env` files. Rotate any credential that was included in a previously shared archive. Gemini and MongoDB credentials must remain in backend environment variables only. Use a least-privilege Atlas database user and restrict Network Access in production.


### Gemini translation HTTP 404 fix

New projects should use `GEMINI_MODEL=gemini-3.8-flash`. Google has restricted generation access to Gemini 2.5 Flash for projects without prior usage. The backend now automatically maps a legacy `GEMINI_MODEL=gemini-2.5-flash` value to `gemini-3.8-flash`, so an existing local `.env` file does not need to be replaced for this specific migration. This shared model resolver is used by Ask AI, text translation, interface localization, and bilingual answer translation.

If translation still fails, check that `GEMINI_API_KEY` is a valid Google AI Studio key, that the Generative Language API is enabled for its project, and restart the API after editing `apps/api/.env`. Do not put the key in `apps/web/.env` or frontend source.
