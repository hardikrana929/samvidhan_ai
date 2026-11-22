# Translation and selected-language answer fixes

- Interface translation accepts up to 250 labels (previously capped at 100), avoiding request validation HTTP 400 for the complete UI label set.
- Gemini translation calls retry temporary 429/5xx provider errors with short backoff and can use `GEMINI_FALLBACK_MODEL` when configured.
- Translation timeout defaults to 90 seconds (`AI_REQUEST_TIMEOUT_MS`) to reduce gateway timeouts on longer answer payloads.
- Structured answer translation includes the source language supplied by the frontend.
- Ask AI renders one selected-language answer panel. It no longer renders a duplicate original-answer panel beside it.
- When live translation is unavailable, the source answer remains visible once with a clear warning.

Live provider availability still depends on the configured Gemini API key, model access, quota and network. Automated tests use mocked provider responses and do not prove live provider availability.
