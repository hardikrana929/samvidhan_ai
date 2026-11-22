# API

`GET /health` and `GET /ready` expose dependency status without secrets. Public API prefix: `/api/v1`.

- `GET /languages` — language registry and capability labels.
- `GET /corpus/status` — source metadata, Article/chunk counts and active retrieval mode.
- `GET /provisions?q=` and `GET /provisions/:id` — imported Article records and exact extracted text.
- `GET /schedules?q=` and `GET /schedules/:id` — all twelve Schedules and three Appendices.
- `POST /assistant/ask` — `{question, language?, level?}`; retrieves source passages, then returns a grounded answer or `insufficient_sources`.
- `POST /situations/analyze` — `{description, language?}`; returns conditional educational pointers and a disclaimer.
- `POST /translation/translate` — `{text, sourceLanguage, targetLanguage}`; uses backend Gemini cloud translation. Output is AI-generated, not an official or human-verified translation.
- `GET /learning/paths`, `GET /learning/lessons/:id` — learning material.
- `GET /quizzes`, `POST /quizzes/:id/submit` — quiz questions and scored educational feedback.
- `GET /myths`, `GET /amendments` — educational explainers.
- `POST /feedback` — validates development-session feedback; it does not modify source content.
- `POST /content/awareness` — creates a labelled template from a selected imported provision.

The assistant response citations include Article identifier, PDF page range, source URL and source content status. Gemini does not author citation metadata. All text input is capped at 4,000 characters; assistant endpoints are rate limited.

## Retrieval modes

- `local_keyword_search`: always available from the checked-in corpus.
- `atlas_vector_search`: enabled when `MONGODB_URI`, Gemini embeddings, a populated Atlas collection and a queryable vector index are configured.

Atlas indexing: `npm run index:constitution` from the project root. The vector index definition is `apps/api/config-constitution-vector-index.json`.
