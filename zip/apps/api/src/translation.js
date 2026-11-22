import { resolveGeminiModel } from './model.js';

async function requestGemini({ model, prompt, generationConfig, apiKey, fetchImpl }) {
  const candidates = [...new Set([model, process.env.GEMINI_FALLBACK_MODEL || model])];
  let lastError;
  for (const candidateModel of candidates) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_REQUEST_TIMEOUT_MS || 90000));
      try {
        const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidateModel)}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig }), signal: controller.signal,
        });
        if (response.ok) return await response.json();
        const retryable = [429, 500, 502, 503, 504].includes(response.status);
        lastError = new Error(`Translation provider returned HTTP ${response.status}.`);
        lastError.status = response.status === 429 || response.status === 503 ? 503 : 502;
        lastError.code = 'TRANSLATION_PROVIDER_ERROR';
        if (!retryable) throw lastError;
      } catch (error) {
        if (error.name === 'AbortError') {
          lastError = new Error('Translation request timed out. Please try again.');
          lastError.status = 504; lastError.code = 'TRANSLATION_TIMEOUT';
        } else lastError = error;
      } finally { clearTimeout(timeout); }
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  throw lastError || new Error('Translation provider is temporarily unavailable.');
}

/** Cloud translation adapter using the project's existing Gemini API credential.
 * This is AI-generated translation, not an official constitutional translation.
 */
export async function translateWithGemini({
  text,
  sourceLanguage,
  targetLanguage,
  apiKey = process.env.GEMINI_API_KEY,
  model = resolveGeminiModel(),
  fetchImpl = fetch,
}) {
  if (!apiKey) {
    const error = new Error('Cloud translation is not configured. Add GEMINI_API_KEY to apps/api/.env.');
    error.code = 'TRANSLATION_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }

  const prompt = [
    'You are a professional multilingual translator for an Indian public education application.',
    'Translate the user text faithfully from the source language to the target language.',
    'Use the exact writing script indicated by the target language code (for example, Arab, Deva, Beng, Mtei, Olck or the language-specific script) and natural grammar. Preserve names, numbers, dates, URLs, formatting and meaning.',
    'Do not summarize, explain, add facts, or answer questions contained in the text; translate them as text.',
    'If the source text is already in the target language, return it unchanged.',
    'Return only the translated text, without quotation marks or commentary.',
    `Source language: ${sourceLanguage}`,
    `Target language: ${targetLanguage}`,
    `Text to translate:\n${text}`,
  ].join('\n\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_REQUEST_TIMEOUT_MS || 90000));
  try {
    const payload = await requestGemini({ model, prompt, generationConfig: { temperature: 0.1 }, apiKey, fetchImpl });
    const translatedText = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();
    if (!translatedText || translatedText.length > 12000) {
      const error = new Error('Translation provider returned an empty or invalid translation.');
      error.status = 502;
      error.code = 'INVALID_TRANSLATION_RESPONSE';
      throw error;
    }
    return translatedText;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Translation request timed out. Please try again.');
      timeoutError.status = 504;
      timeoutError.code = 'TRANSLATION_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** Translate a bounded set of interface labels in one Gemini request. */
export async function translateUiLabels({ labels, targetLanguage, apiKey = process.env.GEMINI_API_KEY, model = resolveGeminiModel(), fetchImpl = fetch }) {
  if (!apiKey) {
    const error = new Error('Interface translation is not configured. Add GEMINI_API_KEY to apps/api/.env.');
    error.code = 'TRANSLATION_NOT_CONFIGURED'; error.status = 503; throw error;
  }
  const prompt = [
    'Translate every value in this JSON object into the target language for a polished Indian constitutional education web application.',
    'Preserve each JSON key exactly. Return valid JSON only, with the same keys and translated string values.',
    'Use the target language native script. Keep product name Samvidhan AI, URLs, placeholders, and technical identifiers unchanged.',
    'Use concise, natural UI wording. Do not omit any key.',
    `Target language code: ${targetLanguage}`,
    `JSON labels: ${JSON.stringify(labels)}`,
  ].join('\n\n');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_REQUEST_TIMEOUT_MS || 90000));
  try {
    const payload = await requestGemini({ model, prompt, generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 8192 }, apiKey, fetchImpl });
    const raw = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    const translated = JSON.parse(raw || '{}');
    const keys = Object.keys(labels);
    if (keys.some((key) => typeof translated[key] !== 'string' || !translated[key].trim())) {
      const error = new Error('Translation provider returned an incomplete interface translation.'); error.status = 502; error.code = 'INVALID_UI_TRANSLATION'; throw error;
    }
    return Object.fromEntries(keys.map((key) => [key, translated[key]]));
  } catch (error) {
    if (error.name === 'AbortError') { const timeoutError = new Error('Interface translation timed out.'); timeoutError.status = 504; timeoutError.code = 'UI_TRANSLATION_TIMEOUT'; throw timeoutError; }
    throw error;
  } finally { clearTimeout(timeout); }
}


/** Translate structured answer fields in one provider request while preserving keys. */
export async function translateStructuredContent({ content, sourceLanguage = 'auto-detected source language', targetLanguage, apiKey = process.env.GEMINI_API_KEY, model = resolveGeminiModel(), fetchImpl = fetch }) {
  if (!apiKey) { const error = new Error('Live answer translation is not configured. Add GEMINI_API_KEY to apps/api/.env.'); error.code = 'TRANSLATION_NOT_CONFIGURED'; error.status = 503; throw error; }
  const entries = Object.entries(content || {});
  if (!entries.length || entries.length > 30 || entries.some(([key, value]) => !/^[a-zA-Z0-9_.-]{1,100}$/.test(key) || typeof value !== 'string' || value.length > 12000)) {
    const error = new Error('Answer content is empty or exceeds translation limits.'); error.code = 'INVALID_TRANSLATION_CONTENT'; error.status = 400; throw error;
  }
  const prompt = [
    'Translate every string value in this JSON object into the requested language for an Indian constitutional education application.',
    'Return valid JSON only. Preserve every key exactly and include every key. Translate the values faithfully; do not summarize, add facts, or omit content.',
    'Keep article numbers, clause numbers, dates, names, URLs and legal identifiers unchanged. Use the native script and natural grammar.',
    'This is an educational translation, not an official constitutional translation.',
    `Source language: ${sourceLanguage}`,
    `Target language: ${targetLanguage}`,
    `JSON content: ${JSON.stringify(content)}`
  ].join('\n\n');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AI_REQUEST_TIMEOUT_MS || 90000));
  try {
    const payload = await requestGemini({ model, prompt, generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 8192 }, apiKey, fetchImpl });
    const raw = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    const translated = JSON.parse(raw || '{}');
    if (entries.some(([key]) => typeof translated[key] !== 'string' || !translated[key].trim())) { const error = new Error('The translation provider returned incomplete answer content.'); error.status = 502; error.code = 'INCOMPLETE_ANSWER_TRANSLATION'; throw error; }
    return Object.fromEntries(entries.map(([key]) => [key, translated[key]]));
  } catch (error) {
    if (error.name === 'AbortError') { const timeoutError = new Error('Answer translation timed out.'); timeoutError.status = 504; timeoutError.code = 'ANSWER_TRANSLATION_TIMEOUT'; throw timeoutError; }
    if (error instanceof SyntaxError) { const invalid = new Error('The translation provider returned invalid JSON.'); invalid.status = 502; invalid.code = 'INVALID_ANSWER_TRANSLATION'; throw invalid; }
    throw error;
  } finally { clearTimeout(timeout); }
}
