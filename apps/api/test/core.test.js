import test from 'node:test';
import assert from 'node:assert/strict';
import { languages, findLanguage } from '../src/languages.js';
import { parseIdentifier, provisions, supplementarySections, chunks, searchChunks, SOURCE, corpusStats } from '../src/corpus.js';
import { answerQuestionWithProvider } from '../src/answer.js';
import { getAtlasStatus, searchAtlasChunks } from '../src/atlas.js';
import { answerQuestion, situationAnswer } from '../src/answer.js';
import { translateWithGemini, translateStructuredContent } from '../src/translation.js';
import { embedText } from '../src/embeddings.js';
import { translateQuestionForRetrieval, generateGroundedExplanation } from '../src/gemini.js';
import { getLearningPaths, getQuizzes, getMyths, getAmendments, lessonById } from '../src/learning.js';
test('registry has all 22 Scheduled Languages plus English', () => {
  assert.equal(languages.length, 23);
  assert.equal(languages.filter((x) => x.scheduled).length, 22);
  assert.equal(findLanguage('kas_Deva').id, 'kashmiri');
  assert.equal(findLanguage('snd_Deva').id, 'sindhi');
  const codes = languages.flatMap((language) => [language.code, language.alternateCode].filter(Boolean));
  assert.equal(codes.length, 26); // 22 Scheduled languages + 3 alternate scripts + English
  assert.ok(codes.every((code) => findLanguage(code)));
});
test('article parser accepts canonical identifiers and rejects malformed values', () => {
  assert.equal(parseIdentifier('article 19(1)(a)'), 'Article 19(1)(A)');
  assert.equal(parseIdentifier('Article nonsense'), null);
});
test('source-grounded answer cites retrieved corpus chunks', () => {
  const answer = answerQuestion('Can freedom of speech have restrictions?');
  assert.equal(answer.status, 'grounded');
  assert.ok(answer.citations.some((c) => c.identifier === 'Article 19'));
  assert.ok(answer.citations.every((c) => chunks.some((chunk) => chunk.id === c.chunkId)));
});
test('selected-language topic queries retrieve the same source provision', () => {
  const answer = answerQuestion('કાયદા સમક્ષ સમાનતા શું છે?', 'guj_Gujr');
  assert.equal(answer.status, 'grounded');
  assert.equal(answer.answerLanguage, 'guj_Gujr');
  assert.ok(answer.citations.some((c) => c.identifier === 'Article 14'));
});
test('fundamental-rights question gets a grounded response and Gujarati explanation', () => {
  const english = answerQuestion('what is my fundamental rights?');
  const gujarati = answerQuestion('મારા મૂળભૂત અધિકારો શું છે?', 'guj_Gujr');
  assert.equal(english.status, 'grounded');
  assert.equal(english.answerType, 'fundamental_rights_overview');
  assert.match(english.whatConstitutionSays[0].identifier, /Articles 14–18/);
  assert.equal(gujarati.explanationLanguage, 'guj_Gujr');
  assert.match(gujarati.whatConstitutionSays[0].identifier, /કલમ 14થી 18/);
});
test('unknown material gets uncertainty rather than a claim', () =>
  assert.equal(answerQuestion('How do I file a patent?').status, 'insufficient_sources'));
test('situation response remains conditional and provides disclaimer', () => {
  const answer = situationAnswer('I was excluded from a public place because of caste');
  assert.match(answer.why, /may be relevant/);
  assert.match(answer.disclaimer, /not legal advice/);
});

test('cloud translation adapter sends a translation-only prompt and returns provider text', async () => {
  let sentBody;
  const translated = await translateWithGemini({
    text: 'Hello',
    sourceLanguage: 'English (eng_Latn)',
    targetLanguage: 'Gujarati (guj_Gujr)',
    apiKey: 'test-key',
    fetchImpl: async (_url, options) => {
      sentBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'નમસ્તે' }] } }] }),
      };
    },
  });
  assert.equal(translated, 'નમસ્તે');
  assert.match(sentBody.contents[0].parts[0].text, /Return only the translated text/);
  assert.match(sentBody.contents[0].parts[0].text, /Gujarati/);
});

test('cloud translation adapter rejects empty provider responses', async () => {
  await assert.rejects(
    translateWithGemini({
      text: 'Hello',
      sourceLanguage: 'English',
      targetLanguage: 'Hindi',
      apiKey: 'test-key',
      fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [] }) }),
    }),
    { code: 'INVALID_TRANSLATION_RESPONSE' },
  );
});

test('cloud translation adapter clearly reports missing Gemini configuration', async () => {
  await assert.rejects(
    translateWithGemini({
      text: 'Hello',
      sourceLanguage: 'English',
      targetLanguage: 'Hindi',
      apiKey: '',
    }),
    { code: 'TRANSLATION_NOT_CONFIGURED', status: 503 },
  );
});

test('fundamental-rights overview lists all six constitutional categories, not only demo chunks', () => {
  const answer = answerQuestion('what is my fundamental rights?', 'eng_Latn');
  assert.equal(answer.answerType, 'fundamental_rights_overview');
  assert.equal(answer.whatConstitutionSays.length, 6);
  assert.match(answer.directAnswer, /Part III.*Articles 12–35/);
  assert.match(answer.whatConstitutionSays[0].identifier, /Articles 14–18/);
  assert.match(answer.whatConstitutionSays[1].identifier, /21A/);
  assert.match(answer.whatConstitutionSays[2].identifier, /23–24/);
  assert.match(answer.whatConstitutionSays[3].identifier, /25–28/);
  assert.match(answer.whatConstitutionSays[4].identifier, /29–30/);
  assert.match(answer.whatConstitutionSays[5].identifier, /Article 32/);
  assert.equal(answer.citations[0].identifier, 'Article 12');
  assert.ok(answer.citations.every((citation) => citation.pdfPageStart > 0));
});

test('Gujarati fundamental-rights overview is fully localized and marks it as a summary', () => {
  const answer = answerQuestion('what is my fundamental rights?', 'guj_Gujr');
  assert.equal(answer.explanationLanguage, 'guj_Gujr');
  assert.match(answer.directAnswer, /ભાગ III/);
  assert.match(answer.whatConstitutionSays[0].identifier, /સમાનતાનો અધિકાર/);
  assert.match(answer.simpleExplanation, /શબ્દશઃ અનુવાદ નથી/);
  assert.match(answer.limits, /કાનૂની સલાહ નથી/);
  assert.match(answer.limits, /કલમ 300A/);
});

test('provider generation does not replace the deterministic rights overview', async () => {
  const { answerQuestionWithProvider } = await import('../src/answer.js');
  const answer = await answerQuestionWithProvider('what is my fundamental rights?', 'guj_Gujr');
  assert.equal(answer.answerType, 'fundamental_rights_overview');
  assert.equal(answer.whatConstitutionSays.length, 6);
});


test('full official source corpus is loaded with Article-level and clause-sized retrieval chunks', () => {
  assert.equal(SOURCE.documentDate, '2026-09-10');
  assert.equal(SOURCE.demo, false);
  assert.equal(SOURCE.status, 'official_source_machine_extracted_pending_human_review');
  assert.equal(corpusStats.articleRecords, 481);
  assert.equal(corpusStats.chunks, 2165);
  assert.equal(corpusStats.scheduleRecords, 12);
  assert.equal(corpusStats.appendixRecords, 3);
  assert.equal(supplementarySections.length, 15);
  assert.ok(provisions.some((item) => item.identifier === 'Article 395'));
  assert.ok(provisions.some((item) => item.identifier === 'Article 2A' && item.provisionStatus === 'omitted_in_source'));
  assert.ok(provisions.some((item) => item.identifier === 'Article 31D' && item.provisionStatus === 'omitted_in_source'));
  assert.ok(provisions.some((item) => item.identifier === 'Article 300A'));
});

test('retrieval finds exact inserted Articles and related source clauses', () => {
  assert.equal(searchChunks('Article 21A')[0].identifier, 'Article 21A');
  assert.equal(searchChunks('Article 300A')[0].identifier, 'Article 300A');
  assert.equal(searchChunks('Article 19(1)(a)')[0].text.trim(), '(a) to freedom of speech and expression;');
  assert.ok(searchChunks('right to education').some((item) => item.articleId === 'article-21a'));
  assert.ok(chunks.filter((item) => item.articleId === 'article-19').length > 5);
  assert.ok(searchChunks('Twelfth Schedule').some((item) => item.sectionId === 'schedule-twelfth'));
  assert.equal(searchChunks('What is Appendix II about?')[0].sectionId, 'appendix-ii');
  assert.ok(searchChunks('Appendix II Jammu and Kashmir').some((item) => item.sectionId === 'appendix-ii'));
});


test('Gemini retrieval embeddings use matching task types and normalized 768-dimensional vectors', async () => {
  let requestBody;
  const vector = await embedText('Article 14 equality', 'RETRIEVAL_DOCUMENT', {
    apiKey: 'test-key',
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return { ok: true, json: async () => ({ embedding: { values: Array(768).fill(1) } }) };
    },
  });
  assert.equal(requestBody.taskType, 'RETRIEVAL_DOCUMENT');
  assert.equal(requestBody.output_dimensionality, 768);
  assert.equal(vector.length, 768);
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  assert.ok(Math.abs(magnitude - 1) < 1e-9);
});


test('non-English query rewriting only returns English retrieval terms and never answers the question', async () => {
  let requestBody;
  const translated = await translateQuestionForRetrieval({
    question: 'કાયદા સમક્ષ સમાનતા શું છે?',
    language: 'guj_Gujr',
    apiKey: 'test-key',
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'equality before law Article 14' }] } }] }) };
    },
  });
  assert.equal(translated, 'equality before law Article 14');
  assert.match(requestBody.contents[0].parts[0].text, /translate only/i);
});


test('Gemini explanation is generated only from supplied passages and validates its JSON shape', async () => {
  let requestBody;
  const generated = await generateGroundedExplanation({
    question: 'What does Article 14 say?',
    language: 'eng_Latn',
    apiKey: 'test-key',
    sources: [{ identifier: 'Article 14', title: 'Equality before law', pdfPageStart: 37, pdfPageEnd: 37, text: 'The State shall not deny equality before the law.' }],
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ directAnswer: 'Article 14 protects equality before law.', simpleExplanation: 'The law must apply equally.', limits: 'This is not legal advice.' }) }] } }] }) };
    },
  });
  assert.equal(generated.directAnswer, 'Article 14 protects equality before law.');
  assert.match(requestBody.contents[0].parts[0].text, /machine-extracted/i);
  assert.match(requestBody.contents[0].parts[0].text, /PDF pages 37–37/);
});


test('assistant retrieval works from the full local corpus when Atlas and Gemini are not configured', async () => {
  const oldGemini = process.env.GEMINI_API_KEY;
  const oldMongo = process.env.MONGODB_URI;
  delete process.env.GEMINI_API_KEY;
  delete process.env.MONGODB_URI;
  try {
    const result = await answerQuestionWithProvider('What powers do Municipalities have?', 'eng_Latn');
    assert.equal(result.status, 'grounded');
    assert.equal(result.retrievalMode, 'local_keyword_search');
    assert.ok(result.citations.some((item) => item.identifier === 'Twelfth Schedule'));
    assert.ok(result.citations.some((item) => item.identifier === 'Article 243W'));
  } finally {
    if (oldGemini === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGemini;
    if (oldMongo === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = oldMongo;
  }
});


test('a local MongoDB URI does not accidentally activate Atlas Vector Search', async () => {
  const oldUri = process.env.MONGODB_URI;
  const oldFlag = process.env.ATLAS_VECTOR_SEARCH_ENABLED;
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/samvidhan_ai';
  process.env.ATLAS_VECTOR_SEARCH_ENABLED = 'false';
  try {
    const status = await getAtlasStatus();
    assert.equal(status.mode, 'local_keyword_search');
    assert.deepEqual(await searchAtlasChunks('Article 14'), []);
  } finally {
    if (oldUri === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = oldUri;
    if (oldFlag === undefined) delete process.env.ATLAS_VECTOR_SEARCH_ENABLED; else process.env.ATLAS_VECTOR_SEARCH_ENABLED = oldFlag;
  }
});

test('interface translation returns the same complete key set in the requested language', async () => {
  const { translateUiLabels } = await import('../src/translation.js');
  const translated = await translateUiLabels({
    labels: { 'Ask AI': 'Ask AI', 'Speak question': 'Speak question' },
    targetLanguage: 'Gujarati (guj_Gujr)',
    apiKey: 'test-key',
    fetchImpl: async (_url, options) => {
      const prompt = JSON.parse(options.body).contents[0].parts[0].text;
      assert.match(prompt, /Preserve each JSON key exactly/);
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"Ask AI":"AI ને પૂછો","Speak question":"પ્રશ્ન બોલો"}' }] } }] }) };
    },
  });
  assert.deepEqual(translated, { 'Ask AI': 'AI ને પૂછો', 'Speak question': 'પ્રશ્ન બોલો' });
});

test('interface translation rejects missing translated labels', async () => {
  const { translateUiLabels } = await import('../src/translation.js');
  await assert.rejects(translateUiLabels({
    labels: { 'Ask AI': 'Ask AI', 'Speak question': 'Speak question' },
    targetLanguage: 'Gujarati', apiKey: 'test-key',
    fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"Ask AI":"AI ને પૂછો"}' }] } }] }) }),
  }), { code: 'INVALID_UI_TRANSLATION' });
});


test('structured live answer translation preserves every field and translates values', async () => {
  const content = { directAnswer: 'Fundamental rights protect people.', provision_0: 'Equality before the law.', simpleExplanation: 'The law applies equally.', limits: 'Rights have constitutional limits.' };
  const translated = await translateStructuredContent({
    content, targetLanguage: 'Gujarati (guj_Gujr)', apiKey: 'test-key',
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      assert.match(request.contents[0].parts[0].text, /Preserve every key exactly/);
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ directAnswer: 'મૂળભૂત અધિકારો લોકોનું રક્ષણ કરે છે.', provision_0: 'કાયદા સમક્ષ સમાનતા.', simpleExplanation: 'કાયદો સૌને સમાન રીતે લાગુ પડે છે.', limits: 'અધિકારોને બંધારણીય મર્યાદાઓ છે.' }) }] } }] }) };
    },
  });
  assert.deepEqual(Object.keys(translated), Object.keys(content));
  assert.match(translated.directAnswer, /મૂળભૂત અધિકારો/);
});

test('structured live answer translation rejects missing fields', async () => {
  await assert.rejects(translateStructuredContent({ content: { directAnswer: 'Hello', limits: 'Limits' }, targetLanguage: 'Gujarati', apiKey: 'test-key', fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ directAnswer: 'નમસ્તે' }) }] } }] }) }) }), { code: 'INCOMPLETE_ANSWER_TRANSLATION' });
});


test('legacy Gemini 2.5 Flash configuration is upgraded to a currently recommended model', async () => {
  const { resolveGeminiModel } = await import('../src/model.js');
  assert.equal(resolveGeminiModel('gemini-2.5-flash'), 'gemini-3.8-flash');
  assert.equal(resolveGeminiModel('models/gemini-2.5-flash'), 'gemini-3.8-flash');
  assert.equal(resolveGeminiModel('gemini-3.5-flash-lite'), 'gemini-3.5-flash-lite');
  assert.equal(resolveGeminiModel(''), 'gemini-3.8-flash');
});


test('translation adapter uses the replacement model when legacy GEMINI_MODEL is configured', async () => {
  const previous = process.env.GEMINI_MODEL;
  process.env.GEMINI_MODEL = 'gemini-2.5-flash';
  let requestedUrl = '';
  try {
    await translateWithGemini({
      text: 'Hello', sourceLanguage: 'English', targetLanguage: 'Gujarati', apiKey: 'test-key',
      fetchImpl: async (url) => {
        requestedUrl = String(url);
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'નમસ્તે' }] } }] }) };
      },
    });
    assert.match(requestedUrl, /models\/gemini-3\.8-flash:generateContent$/);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = previous;
  }
});

test('cloud translation retries temporary provider overload before succeeding', async () => {
  let attempts = 0;
  const translated = await translateWithGemini({
    text: 'Hello', sourceLanguage: 'English', targetLanguage: 'Gujarati', apiKey: 'test-key',
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) return { ok: false, status: 503 };
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'નમસ્તે' }] } }] }) };
    },
  });
  assert.equal(translated, 'નમસ્તે');
  assert.equal(attempts, 2);
});

test('learning paths, lessons, and quizzes support Gujarati and Hindi localization', () => {
  // 1. Gujarati
  const guPaths = getLearningPaths('guj_Gujr');
  assert.equal(guPaths[0].title, 'અધિકારોના પાયા');
  assert.equal(guPaths[0].description, 'સમાનતા, સ્વતંત્રતા અને ગૌરવની સ્ત્રોત-આધારિત સમજ કેળવો.');
  assert.equal(guPaths[0].lessons[0].title, 'કાયદા સમક્ષ સમાનતા');
  assert.match(guPaths[0].lessons[0].body, /કલમ 14 જણાવે છે/);

  const guQuizzes = getQuizzes('guj_Gujr');
  assert.equal(guQuizzes[0].title, 'અધિકારોના મૂળભૂત તત્વો');
  assert.equal(guQuizzes[0].questions[0].prompt, 'કઈ કલમ કાયદા સમક્ષ સમાનતા ધરાવે છે?');
  assert.deepEqual(guQuizzes[0].questions[0].options, ['કલમ 14', 'કલમ 17', 'કલમ 19']);
  assert.equal(guQuizzes[0].questions[1].prompt, 'શું કલમ 19 વાણી સ્વાતંત્ર્યને સંપૂર્ણ (અમર્યાદિત) બનાવે છે?');
  assert.equal(guQuizzes[0].questions[1].options[0], 'હા, દરેક સંજોગોમાં');

  const guMyths = getMyths('guj_Gujr');
  assert.match(guMyths[0].myth, /વાણી સ્વાતંત્ર્યનો અર્થ/);

  const guAmendments = getAmendments('guj_Gujr');
  assert.equal(guAmendments[0].number, '42મો સુધારો');

  // 2. Hindi
  const hiPaths = getLearningPaths('hin_Deva');
  assert.equal(hiPaths[0].title, 'अधिकारों की नींव');
  assert.equal(hiPaths[0].description, 'समानता, स्वतंत्रता और गरिमा की स्रोत-आधारित समझ विकसित करें।');
  assert.equal(hiPaths[0].lessons[0].title, 'विधि के समक्ष समता');
  assert.match(hiPaths[0].lessons[0].body, /अनुच्छेद 14 कहता है/);

  const hiQuizzes = getQuizzes('hin_Deva');
  assert.equal(hiQuizzes[0].title, 'अधिकारों के मूल तत्व');
  assert.equal(hiQuizzes[0].questions[0].prompt, 'किस अनुच्छेद में विधि के समक्ष समता निहित है?');
  assert.deepEqual(hiQuizzes[0].questions[0].options, ['अनुच्छेद 14', 'अनुच्छेद 17', 'अनुच्छेद 19']);
  assert.equal(hiQuizzes[0].questions[1].prompt, 'क्या अनुच्छेद 19 वाक्-स्वतंत्रता को पूर्ण (असीमित) बनाता है?');
  assert.equal(hiQuizzes[0].questions[1].options[0], 'हाँ, प्रत्येक परिस्थिति में');

  const hiMyths = getMyths('hin_Deva');
  assert.match(hiMyths[0].myth, /वाक्-स्वतंत्रता का अर्थ/);

  const hiAmendments = getAmendments('hin_Deva');
  assert.equal(hiAmendments[0].number, '42वां संशोधन');

  // 3. English Fallback
  const enPaths = getLearningPaths('eng_Latn');
  assert.equal(enPaths[0].title, 'Rights foundations');
  assert.equal(enPaths[0].lessons[0].title, 'Equality before law');
});
