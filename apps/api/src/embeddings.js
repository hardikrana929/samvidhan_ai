const MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
export const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS || 768);

export async function embedText(text, taskType = 'RETRIEVAL_QUERY', options = {}) {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const fetchImpl = options.fetchImpl ?? fetch;
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is required to create semantic embeddings.');
    error.code = 'EMBEDDINGS_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:embedContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        content: { parts: [{ text: String(text).slice(0, 8000) }] },
        taskType,
        output_dimensionality: EMBEDDING_DIMENSIONS,
      }),
    },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error?.message || `Embedding provider returned HTTP ${response.status}.`);
    error.code = 'EMBEDDING_PROVIDER_ERROR';
    error.status = response.status === 429 ? 503 : 502;
    throw error;
  }
  const values = body.embedding?.values;
  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS || values.some((v) => !Number.isFinite(v))) {
    const error = new Error('Embedding provider returned an invalid vector.');
    error.code = 'INVALID_EMBEDDING_RESPONSE';
    error.status = 502;
    throw error;
  }
  if (MODEL === 'gemini-embedding-001' && EMBEDDING_DIMENSIONS !== 3072) {
    const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
    if (!magnitude) throw new Error('Embedding provider returned a zero vector.');
    return values.map((value) => value / magnitude);
  }
  return values;
}
