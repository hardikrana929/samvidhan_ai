/** Resolve model IDs to models currently intended for new Gemini Developer API projects.
 * Gemini 2.5 Flash generation access is restricted for projects without prior usage;
 * transparently upgrade that legacy setting instead of returning provider HTTP 404.
 */
export function resolveGeminiModel(configured = process.env.GEMINI_MODEL) {
  const model = String(configured || '').trim().replace(/^models\//, '');
  if (!model || model === 'gemini-2.5-flash' || model === 'gemini-2.5-flash-latest') {
    return 'gemini-3.8-flash';
  }
  return model;
}
