import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { languages, findLanguage } from './languages.js';
import { translateWithGemini, translateUiLabels, translateStructuredContent } from './translation.js';
import { provisions, supplementarySections, findProvision, searchCorpus, SOURCE, corpusStats } from './corpus.js';
import { getAtlasStatus } from './atlas.js';
import { answerQuestionWithProvider, situationAnswer } from './answer.js';
import {
  learningPaths,
  lessons,
  quizzes,
  myths,
  amendments,
  enrich,
  lessonById,
  getLearningPaths,
  getQuizzes,
  getMyths,
  getAmendments,
} from './learning.js';
const app = express();
const port = Number(process.env.PORT || 5000);
const rawClientUrl = process.env.CLIENT_URL;
const allowedOrigins = rawClientUrl
  ? rawClientUrl.split(',').map((u) => u.trim().replace(/\/+$/, ''))
  : [];

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.some((u) => u === cleanOrigin || u === origin)) {
        return callback(null, cleanOrigin);
      }
      if (
        cleanOrigin === 'https://samvidhan-ai-web.vercel.app' ||
        cleanOrigin.endsWith('.vercel.app') ||
        cleanOrigin === 'http://localhost:5173' ||
        cleanOrigin === 'http://localhost:3000'
      ) {
        return callback(null, cleanOrigin);
      }
      if (process.env.NODE_ENV === 'production' && !rawClientUrl) {
        return callback(null, cleanOrigin);
      }
      return callback(null, cleanOrigin);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '32kb' }));
const askLimit = rateLimit({
  windowMs: Number(process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS || 60000),
  limit: Number(process.env.ASSISTANT_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
});
const interfaceTranslationLimit = rateLimit({ windowMs: 60000, limit: 30, standardHeaders: true, legacyHeaders: false });
const text = z.string().trim().min(3).max(4000);
const feedback = [];
const publicQuiz = (quiz) => ({
  ...quiz,
  questions: quiz.questions.map(({ answer, ...question }) => question),
});
app.get(['/health', '/api/v1/health'], (_, res) =>
  res.json({
    status: 'ok',
    services: {
      api: 'available',
      database: process.env.MONGODB_URI ? 'configured' : 'not_configured',
      gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not_configured',
      translation: process.env.GEMINI_API_KEY ? 'gemini_cloud_configured' : 'not_configured',
      corpus: `${corpusStats.articleRecords} article records / ${corpusStats.chunks} source chunks`,
      speech: 'browser_web_speech_api',
    },
  }),
);
app.get(['/ready', '/api/v1/ready'], async (_, res) => {
  const retrieval = await getAtlasStatus();
  res.status(200).json({ ready: true, corpus: corpusStats, source: SOURCE, retrieval });
});
app.get('/api/v1/corpus/status', async (_, res) => {
  res.json({ source: SOURCE, stats: corpusStats, retrieval: await getAtlasStatus() });
});
app.get('/api/v1/languages', (_, res) => res.json({ languages }));
app.get('/api/v1/provisions', (req, res) => {
  const q = String(req.query.q || '').trim();
  const items = q
    ? searchCorpus(q, 30)
    : provisions;
  res.json({ items, demo: false, source: SOURCE, stats: corpusStats });
});
app.get('/api/v1/schedules', (req, res) => {
  const q = String(req.query.q || '').trim().toLocaleLowerCase();
  const items = supplementarySections.filter((item) =>
    !q || `${item.identifier} ${item.title} ${item.text}`.toLocaleLowerCase().includes(q),
  );
  res.json({ items, source: SOURCE, stats: corpusStats });
});
app.get('/api/v1/schedules/:id', (req, res) => {
  const item = supplementarySections.find((section) => section.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not_found', message: 'This Schedule or Appendix is not in the imported source corpus.' });
  return res.json(item);
});

app.get('/api/v1/provisions/:id', (req, res) => {
  const p = findProvision(req.params.id);
  if (!p)
    return res.status(404).json({
      code: 'PROVISION_NOT_FOUND',
      message: 'This provision is not present in the imported source corpus.',
    });
  res.json(p);
});
// Development learning content is source-linked and does not require an account.
app.get('/api/v1/learning/paths', (req, res) => {
  const lang = req.query.lang || 'eng_Latn';
  res.json({
    items: getLearningPaths(lang),
  });
});
app.get('/api/v1/learning/lessons/:id', (req, res) => {
  const lang = req.query.lang || 'eng_Latn';
  const lesson = lessonById(req.params.id, lang);
  if (!lesson)
    return res.status(404).json({
      code: 'LESSON_NOT_FOUND',
      message: 'That lesson is not available.',
    });
  res.json(lesson);
});
app.get('/api/v1/quizzes', (req, res) => {
  const lang = req.query.lang || 'eng_Latn';
  res.json({ items: getQuizzes(lang).map(publicQuiz) });
});
app.post('/api/v1/quizzes/:id/submit', (req, res) => {
  const lang = req.body?.language || req.query.lang || 'eng_Latn';
  const localizedQuizzes = getQuizzes(lang);
  const quiz = localizedQuizzes.find((item) => item.id === req.params.id) || quizzes.find((item) => item.id === req.params.id);
  const originalQuiz = quizzes.find((item) => item.id === req.params.id);
  const data = z
    .object({
      answers: z.record(z.string(), z.number().int().nonnegative()),
      language: z.string().optional(),
    })
    .safeParse(req.body);
  if (!quiz || !originalQuiz)
    return res.status(404).json({ code: 'QUIZ_NOT_FOUND', message: 'That quiz is not available.' });
  if (!data.success)
    return res.status(400).json({
      code: 'INVALID_QUIZ_ATTEMPT',
      message: 'Submit question IDs with selected option indexes.',
    });
  const results = quiz.questions.map((question) => {
    const origQ = originalQuiz.questions.find((q) => q.id === question.id) || question;
    return {
      id: question.id,
      correct: data.data.answers[question.id] === origQ.answer,
      answer: origQ.answer,
      explanation: question.explanation,
      provisions: (question.provisionIds || origQ.provisionIds || []).map((id) => enrich({ provisionIds: [id] }).provisions[0]),
    };
  });
  res.json({
    quizId: quiz.id,
    score: results.filter((item) => item.correct).length,
    total: results.length,
    results,
  });
});
app.get('/api/v1/myths', (req, res) => {
  const lang = req.query.lang || 'eng_Latn';
  res.json({ items: getMyths(lang) });
});
app.get('/api/v1/amendments', (req, res) => {
  const lang = req.query.lang || 'eng_Latn';
  res.json({ items: getAmendments(lang) });
});
app.post('/api/v1/feedback', askLimit, (req, res) => {
  const data = z
    .object({
      category: z.enum(['citation', 'translation', 'explanation', 'bug', 'other']),
      message: text,
      page: z.string().max(200).optional(),
    })
    .safeParse(req.body);
  if (!data.success)
    return res.status(400).json({
      code: 'INVALID_FEEDBACK',
      message: 'Provide a category and feedback between 3 and 4000 characters.',
    });
  const item = {
    id: `feedback-${Date.now()}`,
    ...data.data,
    createdAt: new Date().toISOString(),
  };
  feedback.push(item);
  res.status(201).json({
    status: 'received',
    id: item.id,
    message:
      'Thank you. Feedback is stored only for this development API session and does not change constitutional content.',
  });
});
app.post('/api/v1/content/awareness', askLimit, (req, res) => {
  const data = z
    .object({
      provisionId: z.string().min(1),
      format: z.enum(['short', 'classroom', 'quiz']),
    })
    .safeParse(req.body);
  const provision = provisions.find((item) => item.id === data.data?.provisionId);
  if (!data.success || !provision)
    return res.status(400).json({
      code: 'INVALID_CONTENT_REQUEST',
      message: 'Choose a provision from the imported corpus and a supported format.',
    });
  const content =
    data.data.format === 'short'
      ? `${provision.identifier}: ${provision.title}. Read the constitutional text, then consider its scope and limits. Educational information only.`
      : data.data.format === 'classroom'
        ? `Classroom prompt: Read ${provision.identifier} (${provision.title}). What words identify its protection, and what questions would need further legal context?`
        : `Knowledge check: Which provision is titled “${provision.title}”? Answer: ${provision.identifier}.`;
  res.json({
    content,
    label: 'Template based on imported source metadata; the corpus is machine-extracted and pending human review.',
    citation: { identifier: provision.identifier, source: provision.source },
  });
});
app.post('/api/v1/assistant/ask', askLimit, async (req, res) => {
  const data = z
    .object({
      question: text,
      language: z.string().optional(),
      level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    })
    .safeParse(req.body);
  if (!data.success)
    return res.status(400).json({
      code: 'INVALID_REQUEST',
      message: 'Provide a question between 3 and 4000 characters.',
    });
  if (data.data.language && !findLanguage(data.data.language))
    return res.status(400).json({
      code: 'INVALID_LANGUAGE',
      message: 'Select a supported language code.',
    });
  res.json(await answerQuestionWithProvider(data.data.question, data.data.language));
});
app.post('/api/v1/situations/analyze', askLimit, (req, res) => {
  const data = z.object({ description: text, language: z.string().optional() }).safeParse(req.body);
  if (!data.success)
    return res.status(400).json({
      code: 'INVALID_REQUEST',
      message: 'Provide a situation between 3 and 4000 characters.',
    });
  res.json(situationAnswer(data.data.description, data.data.language || 'eng_Latn'));
});
app.post('/api/v1/translation/interface', interfaceTranslationLimit, async (req, res) => {
  const data = z.object({ targetLanguage: z.string().min(1), labels: z.record(z.string(), z.string().min(1).max(500)).refine((value) => Object.keys(value).length > 0 && Object.keys(value).length <= 250) }).safeParse(req.body);
  const target = data.success ? findLanguage(data.data.targetLanguage) : null;
  if (!data.success || !target) return res.status(400).json({ code: 'INVALID_UI_TRANSLATION_REQUEST', message: 'Choose a supported interface language.' });
  if (data.data.targetLanguage === 'eng_Latn') return res.json({ translations: data.data.labels, targetLanguage: data.data.targetLanguage });
  try {
    const translations = await translateUiLabels({ labels: data.data.labels, targetLanguage: `${target.nativeName} (${data.data.targetLanguage})` });
    res.json({ translations, targetLanguage: data.data.targetLanguage, provider: 'Gemini API', translationType: 'AI-generated interface translation' });
  } catch (error) {
    res.status(error.status || 502).json({ code: error.code || 'UI_TRANSLATION_FAILED', message: error.message || 'Interface translation is temporarily unavailable.' });
  }
});
app.post('/api/v1/translation/answer', askLimit, async (req, res) => {
  const data = z.object({ targetLanguage: z.string().min(1), sourceLanguage: z.string().optional(), content: z.record(z.string(), z.string().max(12000)).refine(value => Object.keys(value).length > 0 && Object.keys(value).length <= 30) }).safeParse(req.body);
  const target = data.success ? findLanguage(data.data.targetLanguage) : null;
  if (!data.success || !target) return res.status(400).json({ code: 'INVALID_ANSWER_TRANSLATION_REQUEST', message: 'Provide answer content and a supported target language.' });
  if (data.data.targetLanguage === 'eng_Latn') return res.json({ translatedContent: data.data.content, targetLanguage: data.data.targetLanguage, provider: 'Original English content' });
  try {
    const translatedContent = await translateStructuredContent({ content: data.data.content, sourceLanguage: data.data.sourceLanguage || 'auto-detected source language', targetLanguage: `${target.nativeName} (${data.data.targetLanguage})` });
    res.json({ translatedContent, targetLanguage: data.data.targetLanguage, provider: 'Gemini API', translationType: 'AI-generated; not an official constitutional translation' });
  } catch (error) {
    res.status(error.status || 502).json({ code: error.code || 'ANSWER_TRANSLATION_FAILED', message: error.message || 'Live answer translation is temporarily unavailable.' });
  }
});

// Resilient constitutional translation dictionary for offline/fallback translation
const FALLBACK_CONSTITUTIONAL_TRANSLATIONS = {
  hin_Deva: {
    // Complete Constitutional Passages
    'no person shall be deprived of his life or personal liberty except according to procedure established by law.':
      'विधि द्वारा स्थापित प्रक्रिया के अनुसार ही किसी व्यक्ति को उसके प्राण या दैहिक स्वतंत्रता से वंचित किया जाएगा, अन्यथा नहीं।',
    'the state shall not deny to any person equality before the law or the equal protection of the laws within the territory of india.':
      'राज्य भारत के राज्यक्षेत्र में किसी व्यक्ति को विधि के समक्ष समता से या विधियों के समान संरक्षण से वंचित नहीं करेगा।',
    'all citizens shall have the right to freedom of speech and expression and to assemble peaceably and without arms.':
      'सभी नागरिकों को वाक्-स्वतंत्रता और अभिव्यक्ति-स्वतंत्रता का तथा शांतिपूर्वक और निरायुध सम्मेलन का अधिकार होगा।',
    'it shall be the duty of every citizen of india to abide by the constitution and respect its ideals and institutions, the national flag and the national anthem.':
      'संविधान का पालन करना और उसके आदर्शों, संस्थाओं, राष्ट्रध्वज और राष्ट्रगान का आदर करना भारत के प्रत्येक नागरिक का कर्तव्य होगा।',
    'we, the people of india, having solemnly resolved to constitute india into a sovereign socialist secular democratic republic and to secure to all its citizens justice, liberty, equality and fraternity.':
      'हम, भारत के लोग, भारत को एक संपूर्ण प्रभुत्व-संपन्न, समाजवादी, पंथनिरपेक्ष, लोकतंत्रात्मक गणराज्य बनाने के लिए तथा उसके समस्त नागरिकों को न्याय, स्वतंत्रता, समता और बंधुता सुनिश्चित करने के लिए दृढ़संकल्प होकर...',

    'we, the people of india': 'हम, भारत के लोग',
    'sovereign socialist secular democratic republic': 'संपूर्ण प्रभुत्व-संपन्न, समाजवादी, पंथनिरपेक्ष, लोकतंत्रात्मक गणराज्य',
    'justice, liberty, equality and fraternity': 'न्याय, स्वतंत्रता, समता और बंधुता',
    'equality before the law': 'विधि के समक्ष समता',
    'equal protection of the laws': 'विधियों का समान संरक्षण',
    'protection of life and personal liberty': 'प्राण और दैहिक स्वतंत्रता का संरक्षण',
    'freedom of speech and expression': 'वाक्-स्वतंत्रता और अभिव्यक्ति-स्वतंत्रता',
    'right to education': 'शिक्षा का अधिकार',
    'fundamental rights': 'मौलिक अधिकार',
    'fundamental duties': 'मौलिक कर्तव्य',
    'directive principles of state policy': 'राज्य की नीति के निदेशक तत्व',
    'constitution of india': 'भारत का संविधान',
    'abolition of untouchability': 'अस्पृश्यता का अंत',
    'prohibition of discrimination': 'विभेद का प्रतिषेध',
    'supreme court': 'उच्चतम न्यायालय',
    'high court': 'उच्च न्यायालय',
    'president of india': 'भारत के राष्ट्रपति',
    'prime minister': 'प्रधान मंत्री',
    'parliament': 'संसद',
    'citizen': 'नागरिक',
    'citizenship': 'नागरिकता',
    'remedies for enforcement of rights': 'अधिकारों के प्रवर्तन के लिए उपचार',
    'habeas corpus': 'बंदी प्रत्यक्षीकरण',
    'mandamus': 'परमादेश',
    'prohibition': 'प्रतिषेध',
    'quo warranto': 'अधिकार-पृच्छा',
    'certiorari': 'उत्प्रेषण',
    'assault': 'शारीरिक हमला / मारपीट',
    'physical violence': 'शारीरिक हिंसा',
    'police station': 'पुलिस थाना',
    'first information report': 'प्रथम सूचना रिपोर्ट (एफआईआर)',
    'fir': 'एफआईआर (FIR)',
    'magistrate': 'मजिस्ट्रेट',
    'bail': 'जमानत',
    'arrest': 'गिरफ्तारी',
    'detention': 'हिरासत',
  },
  guj_Gujr: {
    // Complete Constitutional Passages
    'no person shall be deprived of his life or personal liberty except according to procedure established by law.':
      'કાયદા દ્વારા સ્થાપિત પ્રક્રિયા સિવાય કોઈપણ વ્યક્તિને તેના જીવન કે વ્યક્તિગત સ્વાતંત્ર્યથી વંચિત કરી શકાશે નહીં.',
    'the state shall not deny to any person equality before the law or the equal protection of the laws within the territory of india.':
      'રાજ્ય ભારતના રાજ્યક્ષેત્રમાં કોઈપણ વ્યક્તિને કાયદા સમક્ષ સમાનતા અથવા કાયદાઓના સમાન રક્ષણનો ઇનકાર કરશે નહીં.',
    'all citizens shall have the right to freedom of speech and expression and to assemble peaceably and without arms.':
      'તમામ નાગરિકોને વાણી અને અભિવ્યક્તિની સ્વતંત્રતાનો અને શસ્ત્રો વિના શાંતિપૂર્વક ભેગા થવાનો અધિકાર રહેશે.',
    'it shall be the duty of every citizen of india to abide by the constitution and respect its ideals and institutions, the national flag and the national anthem.':
      'બંધારણનું પાલન કરવું અને તેના આદર્શો અને સંસ્થાઓ, રાષ્ટ્રધ્વજ અને રાષ્ટ્રગીતનો આદર કરવો એ ભારતના દરેક નાગરિકની ફરજ રહેશે.',
    'we, the people of india, having solemnly resolved to constitute india into a sovereign socialist secular democratic republic and to secure to all its citizens justice, liberty, equality and fraternity.':
      'અમે, ભારતના લોકો, ભારતને એક સાર્વભૌમ, સમાજવાદી, બિનસાંપ્રદાયિક, લોકશાહી પ્રજાસત્તાક બનાવવાનો અને તેના તમામ નાગરિકોને ન્યાય, સ્વાતંત્ર્ય, સમાનતા અને બંધુતા આપવાનો ગંભીરતાપૂર્વક સંકલ્પ કરીએ છીએ.',

    'we, the people of india': 'અમે, ભારતના લોકો',
    'sovereign socialist secular democratic republic': 'સાર્વભૌમ સમાજવાદી બિનસાંપ્રદાયિક લોકશાહી પ્રજાસત્તાક',
    'justice, liberty, equality and fraternity': 'ન્યાય, સ્વતંત્રતા, સમાનતા અને બંધુતા',
    'equality before the law': 'કાયદા સમક્ષ સમાનતા',
    'equal protection of the laws': 'કાયદાઓનું સમાન રક્ષણ',
    'protection of life and personal liberty': 'જીવન અને વ્યક્તિગત સ્વતંત્રતાનું રક્ષણ',
    'freedom of speech and expression': 'વાણી અને અભિવ્યક્તિની સ્વતંત્રતા',
    'right to education': 'શિક્ષણનો અધિકાર',
    'fundamental rights': 'મૂળભૂત અધિકારો',
    'fundamental duties': 'મૂળભૂત ફરજો',
    'directive principles of state policy': 'રાજ્યનીતિના માર્ગદર્શક સિદ્ધાંતો',
    'constitution of india': 'ભારતનું બંધારણ',
    'abolition of untouchability': 'અસ્પૃશ્યતા નાબૂદી',
    'prohibition of discrimination': 'ભેદભાવનો પ્રતિબંધ',
    'supreme court': 'સર્વોચ્ચ અદાલત',
    'high court': 'વડી અદાલત',
    'president of india': 'ભારતના રાષ્ટ્રપતિ',
    'prime minister': 'વડાપ્રધાન',
    'parliament': 'સંસદ',
    'citizen': 'નાગરિક',
    'citizenship': 'નાગરિકત્વ',
    'remedies for enforcement of rights': 'અધિકારોના અમલ માટેના ઉપાયો',
    'habeas corpus': 'હેબિયસ કોર્પસ (બંદી પ્રત્યક્ષીકરણ)',
    'mandamus': 'મેન્ડેમસ (પરમાદેશ)',
    'prohibition': 'પ્રોહિબિશન (પ્રતિષેધ)',
    'quo warranto': 'કો-વોરન્ટો (અધિકાર-પૃચ્છા)',
    'certiorari': 'સર્શિયોરારી (ઉત્પ્રેષણ)',
    'assault': 'શારીરિક હુમલો / મારપીટ',
    'physical violence': 'શારીરિક હિંસા',
    'police station': 'પોલીસ સ્ટેશન',
    'first information report': 'પ્રથમ માહિતી અહેવાલ (એફઆઈઆર)',
    'fir': 'એફઆઈઆર (FIR)',
    'magistrate': 'મેજિસ્ટ્રેટ',
    'bail': 'જામીન',
    'arrest': 'ધરપકડ',
    'detention': 'અટકાયત',
  },
  ben_Beng: {
    'we, the people of india': 'আমরা, ভারতের জনগণ',
    'sovereign socialist secular democratic republic': 'সার্বভৌম সমাজতান্ত্রিক ধর্মনিরপেক্ষ গণতান্ত্রিক সাধারণতন্ত্র',
    'justice, liberty, equality and fraternity': 'ন্যায়বিচার, স্বাধীনতা, সমতা ও সৌভ্রাতৃত্ব',
    'equality before the law': 'আইনের দৃষ্টিতে সমতা',
    'equal protection of the laws': 'আইনের সমান সংরক্ষণ',
    'protection of life and personal liberty': 'জীবন ও ব্যক্তিগত স্বাধীনতার সুরক্ষা',
    'freedom of speech and expression': 'বাক ও ভাব প্রকাশের স্বাধীনতা',
    'right to education': 'শিক্ষার অধিকার',
    'fundamental rights': 'মৌলিক অধিকার',
    'fundamental duties': 'মৌলিক কর্তব্য',
    'constitution of india': 'ভারতের সংবিধান',
  },
  mar_Deva: {
    'we, the people of india': 'आम्ही, भारताचे लोक',
    'sovereign socialist secular democratic republic': 'सार्वभौम समाजवादी धर्मनिरपेक्ष लोकशाही गणराज्य',
    'justice, liberty, equality and fraternity': 'न्याय, स्वातंत्र्य, समता व बंधुता',
    'equality before the law': 'कायद्यासमोर समानता',
    'protection of life and personal liberty': 'जीवित व वैयक्तिक स्वातंत्र्य',
    'freedom of speech and expression': 'भाषण व अभिव्यक्ती स्वातंत्र्य',
    'right to education': 'शिक्षणाचा हक्क',
    'fundamental rights': 'मूलभूत हक्क',
    'fundamental duties': 'मूलभूत कर्तव्ये',
    'constitution of india': 'भारताचे संविधान',
  },
  tam_Taml: {
    'we, the people of india': 'இந்திய மக்களாகிய நாம்',
    'equality before the law': 'சட்டத்தின் முன் அனைவரும் சமம்',
    'protection of life and personal liberty': 'வாழ்வுரிமை மற்றும் தனிநபர் சுதந்திரம்',
    'freedom of speech and expression': 'பேச்சு மற்றும் கருத்து சுதந்திரம்',
    'right to education': 'கல்வி உரிமை',
    'fundamental rights': 'அடிப்படை உரிமைகள்',
    'fundamental duties': 'அடிப்படை கடமைகள்',
    'constitution of india': 'இந்திய அரசியலமைப்பு',
  },
  tel_Telu: {
    'we, the people of india': 'భారతదేశ ప్రజలమైన మేము',
    'equality before the law': 'చట్టం ముందు సమానత్వం',
    'protection of life and personal liberty': 'జీవించే హక్కు మరియు వ్యక్తిగత స్వేచ్ఛ',
    'freedom of speech and expression': 'వాక్ స్వాతంత్య్రం మరియు భావ ప్రకటన స్వేచ్ఛ',
    'right to education': 'విద్యా హక్కు',
    'fundamental rights': 'ప్రాథమిక హక్కులు',
    'fundamental duties': 'ప్రాథమిక విధులు',
    'constitution of india': 'భారత రాజ్యాంగం',
  },
  urd_Arab: {
    'we, the people of india': 'ہم، بھارت کے عوام',
    'equality before the law': 'قانون کے سامنے برابری',
    'protection of life and personal liberty': 'جان اور ذاتی آزادی کا تحفظ',
    'freedom of speech and expression': 'تقریر اور اظہار رائے کی آزادی',
    'right to education': 'تعلیم کا حق',
    'fundamental rights': 'بنیادی حقوق',
    'fundamental duties': 'بنیادی فرائض',
    'constitution of india': 'دستور ہند',
  }
};

function resilientTranslate(text, sourceLang, targetLang) {
  if (!text || sourceLang === targetLang) return text;

  // 1. Reverse translation: Gujarati or Hindi to English
  if (targetLang === 'eng_Latn') {
    const srcDict = FALLBACK_CONSTITUTIONAL_TRANSLATIONS[sourceLang];
    if (srcDict) {
      const trimmed = text.trim();
      for (const [enKey, localizedVal] of Object.entries(srcDict)) {
        if (localizedVal.trim() === trimmed || localizedVal.toLowerCase() === trimmed.toLowerCase()) {
          return enKey.charAt(0).toUpperCase() + enKey.slice(1);
        }
      }
    }
  }

  // 2. Cross-translation: Gujarati to Hindi or Hindi to Gujarati
  if (sourceLang === 'guj_Gujr' && targetLang === 'hin_Deva') {
    const guDict = FALLBACK_CONSTITUTIONAL_TRANSLATIONS.guj_Gujr;
    const hiDict = FALLBACK_CONSTITUTIONAL_TRANSLATIONS.hin_Deva;
    const trimmed = text.trim();
    for (const [enKey, guVal] of Object.entries(guDict)) {
      if (guVal.trim() === trimmed && hiDict[enKey]) {
        return hiDict[enKey];
      }
    }
  }
  if (sourceLang === 'hin_Deva' && targetLang === 'guj_Gujr') {
    const hiDict = FALLBACK_CONSTITUTIONAL_TRANSLATIONS.hin_Deva;
    const guDict = FALLBACK_CONSTITUTIONAL_TRANSLATIONS.guj_Gujr;
    const trimmed = text.trim();
    for (const [enKey, hiVal] of Object.entries(hiDict)) {
      if (hiVal.trim() === trimmed && guDict[enKey]) {
        return guDict[enKey];
      }
    }
  }

  const targetDict = FALLBACK_CONSTITUTIONAL_TRANSLATIONS[targetLang];
  if (!targetDict) return text;

  const lower = text.toLowerCase().trim();
  // Exact phrase match
  if (targetDict[lower]) return targetDict[lower];

  // Try punctuation-stripped match
  const stripped = lower.replace(/[.,;:]+$/, '');
  if (targetDict[stripped]) return targetDict[stripped];

  // Normalized whitespace match
  const normalized = lower.replace(/\s+/g, ' ');
  for (const [enKey, targetVal] of Object.entries(targetDict)) {
    if (enKey.replace(/\s+/g, ' ') === normalized) {
      return targetVal;
    }
  }

  // Sentence-by-sentence and substring keyword replacements
  let translated = text;
  // Sort keys by length descending to replace longest phrases first
  const sortedEntries = Object.entries(targetDict).sort((a, b) => b[0].length - a[0].length);
  for (const [enKey, targetVal] of sortedEntries) {
    if (enKey.length > 2) {
      const regex = new RegExp(enKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(translated)) {
        translated = translated.replace(regex, targetVal);
      }
    }
  }

  // Article / clause nomenclature
  if (targetLang === 'guj_Gujr') {
    translated = translated.replace(/\bArticle\s+(\d+[A-Za-z]*)\b/gi, 'કલમ $1');
    translated = translated.replace(/\bPart\s+([IVXLCDM]+)\b/gi, 'ભાગ $1');
  } else if (targetLang === 'hin_Deva') {
    translated = translated.replace(/\bArticle\s+(\d+[A-Za-z]*)\b/gi, 'अनुच्छेद $1');
    translated = translated.replace(/\bPart\s+([IVXLCDM]+)\b/gi, 'भाग $1');
  }

  return translated;
}

app.post('/api/v1/translation/translate', askLimit, async (req, res) => {
  const data = z
    .object({
      text: z.string().trim().min(1).max(4000),
      sourceLanguage: z.string().min(1),
      targetLanguage: z.string().min(1),
    })
    .safeParse(req.body);
  const source = data.success ? findLanguage(data.data.sourceLanguage) : null;
  const target = data.success ? findLanguage(data.data.targetLanguage) : null;
  if (!data.success || !source || !target) {
    return res.status(400).json({
      code: 'INVALID_TRANSLATION_REQUEST',
      message: 'Enter text and select valid supported language codes.',
    });
  }
  const sourceLabel = `${source.nativeName} (${data.data.sourceLanguage})`;
  const targetLabel = `${target.nativeName} (${data.data.targetLanguage})`;
  try {
    const translatedText = await translateWithGemini({
      text: data.data.text,
      sourceLanguage: sourceLabel,
      targetLanguage: targetLabel,
    });
    res.json({
      translatedText,
      sourceLanguage: data.data.sourceLanguage,
      targetLanguage: data.data.targetLanguage,
      provider: 'Gemini API',
      translationType: 'AI-generated; not an official translation',
    });
  } catch (error) {
    const fallback = resilientTranslate(data.data.text, data.data.sourceLanguage, data.data.targetLanguage);
    if (fallback && fallback !== data.data.text) {
      return res.json({
        translatedText: fallback,
        sourceLanguage: data.data.sourceLanguage,
        targetLanguage: data.data.targetLanguage,
        provider: 'Constitutional Language Engine',
        translationType: 'Resilient translation engine',
      });
    }
    res.status(error.status || 502).json({
      code: error.code || 'TRANSLATION_FAILED',
      message: error.message || 'Translation is temporarily unavailable.',
    });
  }
});
app.use(
  (err, _, res, __) => (
    console.error('request_error', { message: err.message }),
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    })
  ),
);
export function startServer() {
  return app.listen(port, () => console.log(`Samvidhan API listening on ${port}`));
}

// Keep imports side-effect free so integration tests can start an isolated server.
if (process.argv[1]?.endsWith('server.js')) startServer();

export { app };
