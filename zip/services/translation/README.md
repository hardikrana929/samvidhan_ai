# Translation options (Windows-friendly default)

## Default: Gemini cloud translation

The application uses the Gemini API key already used by the Node.js backend. No Python, WSL, Linux, local model download, or separate translation server is required.

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL=gemini-2.5-flash`.
3. Start the application from the repository root with `npm install` and `npm run dev`.
4. Open `http://localhost:5173/translate` and translate a short sample.

The API route is `POST /api/v1/translation/translate` with `{ "text", "sourceLanguage", "targetLanguage" }`. The API validates the source and target against the complete Scheduled Language registry and uses Gemini server-side; the key is never sent to the browser.

This is AI-generated translation, not IndicTrans2 inference and not an official Government translation. Gemini can generate output for all 22 language names/scripts, but support in the model does not establish equal quality. Review legal/constitutional translations with a qualified human before publication. The automated language matrix checks request handling and code coverage; it cannot certify linguistic accuracy.

## Optional: IndicTrans2 self-hosting

The original IndicTrans2 provider boundary remains an optional future deployment. It requires a compatible model runtime, model weights, compute and an inference adapter. It is not used by the Windows-friendly default and is not claimed operational. See the official [AI4Bharat IndicTrans2 repository](https://github.com/AI4Bharat/IndicTrans2) and model cards for setup, licensing and exact supported pairs.
