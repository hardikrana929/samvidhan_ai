# Interface localization and voice controls

## Interface language
- The header language selector controls the application interface language as well as the language sent to the Ask AI endpoint.
- The frontend requests a bounded JSON dictionary from `POST /api/v1/translation/interface` when the selected language changes.
- The API translates the interface dictionary with the configured Gemini model, validates that every key is present, and returns the translated labels.
- Successful dictionaries are cached in browser localStorage by language code. English uses the source labels directly.
- RTL direction is applied for Urdu, Kashmiri and Sindhi language selections.
- AI-generated UI translations are not official translations. Original Constitution quotations and source text remain in their original English form to preserve source fidelity.
- A working `GEMINI_API_KEY` is required for first-time UI localization. If translation is unavailable, the application retains English labels and displays a status message rather than showing fabricated translations.

## Voice controls
- Ask AI offers a microphone control using the browser Speech Recognition API. The transcript is inserted into the question field for user review before submission.
- After an answer is generated, Listen to answer reads the direct answer, simple explanation and limits using browser Speech Synthesis.
- Recognition and voice availability depend on browser and operating-system language support. Chrome on desktop is recommended; unsupported language voices are not guaranteed.
- Voice transcripts and generated speech are not treated as official legal text.

## Windows setup
No Python, Linux, WSL or local translation model is required. Start the existing Node.js API and Vite frontend as documented in README. Set `GEMINI_API_KEY` in `apps/api/.env` to enable first-time UI translations.

## Live bilingual answer translation

The Ask page keeps an already generated answer when the global language dropdown changes. It posts the answer's explanatory fields to `POST /api/v1/translation/answer`, which translates all fields in one Gemini request while preserving JSON keys and article identifiers. The page displays the selected-language explanation beside the original answer and leaves source citations/links intact. Translations are cached per browser session and language. Constitutional source quotations are shown in their original extracted wording in the original-answer panel; AI-generated translations are explicitly not official translations. If translation is unavailable, the original answer remains visible and an error is shown rather than silently replacing it.

Required backend setting: `GEMINI_API_KEY` in `apps/api/.env`.
