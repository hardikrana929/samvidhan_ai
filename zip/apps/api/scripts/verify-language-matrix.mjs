import { languages } from '../src/languages.js';

const apiBase = (process.env.TRANSLATION_VERIFY_API || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const delayMs = Number(process.env.TRANSLATION_VERIFY_DELAY_MS || 6500);
const sourceLanguage = 'eng_Latn';
const sample = 'The Constitution of India guarantees equality before the law.';
const targets = languages.flatMap((language) => [
  language.code,
  ...(language.alternateCode ? [language.alternateCode] : []),
]).filter((code) => code !== sourceLanguage);

let passed = 0;
const failures = [];
console.log(`Checking ${targets.length} target language/script codes via ${apiBase}`);
console.log('This verifies live provider response only, not translation quality or legal accuracy.');

for (const [index, targetLanguage] of targets.entries()) {
  try {
    const response = await fetch(`${apiBase}/translation/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sample, sourceLanguage, targetLanguage }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.translatedText !== 'string' || !body.translatedText.trim()) {
      throw new Error(`${response.status} ${body.code || ''} ${body.message || 'empty translation'}`.trim());
    }
    passed += 1;
    console.log(`PASS ${targetLanguage}: ${body.translatedText.slice(0, 90).replace(/\s+/g, ' ')}`);
  } catch (error) {
    failures.push({ code: targetLanguage, message: error.message });
    console.error(`FAIL ${targetLanguage}: ${error.message}`);
  }
  if (index < targets.length - 1 && delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

console.log(`\nResult: ${passed}/${targets.length} live language/script requests passed.`);
if (failures.length) {
  console.error('Failures:', JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log('All codes returned non-empty translations. Human linguistic review is still required.');
}
