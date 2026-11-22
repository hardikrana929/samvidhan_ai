import { provisions, SOURCE } from './corpus.js';

const ref = (id) => provisions.find((item) => item.id === id);
const citation = (id) => {
  const p = ref(id);
  if (!p) {
    if (id === 'preamble') {
      return { identifier: 'Preamble', title: 'Preamble to the Constitution of India', source: SOURCE };
    }
    return { identifier: String(id || 'Provision'), title: String(id || ''), source: SOURCE };
  }
  return { identifier: p.identifier, title: p.title, source: p.source };
};

export const learningPaths = [
  {
    id: 'rights-foundations',
    title: 'Rights foundations',
    level: 'beginner',
    durationMinutes: 18,
    description: 'Build a source-first understanding of equality, liberty and dignity.',
    lessons: ['equality', 'liberty'],
  },
  {
    id: 'public-life',
    title: 'Rights in public life',
    level: 'beginner',
    durationMinutes: 15,
    description: 'Explore discrimination, public access and constitutional safeguards.',
    lessons: ['public-access'],
  },
];

export const lessons = [
  {
    id: 'equality',
    pathId: 'rights-foundations',
    title: 'Equality before law',
    objective: 'Identify the core protection in Article 14.',
    body: 'Article 14 says that the State must not deny equality before the law or equal protection of the laws within India. It is a starting point for thinking about equal treatment by public authorities.',
    provisionIds: ['article-14'],
  },
  {
    id: 'liberty',
    pathId: 'rights-foundations',
    title: 'Speech and expression',
    objective: 'Recognise both the freedom and its constitutional limits.',
    body: 'Article 19 protects several freedoms for citizens, including speech and expression. Article 19(2) also lists grounds on which laws may impose reasonable restrictions on speech.',
    provisionIds: ['article-19'],
  },
  {
    id: 'public-access',
    pathId: 'public-life',
    title: 'Discrimination and public access',
    objective: 'Recognise the text concerning public places and untouchability.',
    body: 'Article 15 prohibits specified discrimination and addresses access to listed public places. Article 17 abolishes untouchability and forbids its practice in any form.',
    provisionIds: ['article-15', 'article-17'],
  },
];

export const quizzes = [
  {
    id: 'rights-basics',
    title: 'Rights basics',
    topic: 'Fundamental rights',
    level: 'beginner',
    questions: [
      {
        id: 'q-equality',
        prompt: 'Which Article contains equality before law?',
        options: ['Article 14', 'Article 17', 'Article 19'],
        answer: 0,
        explanation: 'Article 14 contains the equality-before-law guarantee.',
        provisionIds: ['article-14'],
      },
      {
        id: 'q-speech',
        prompt: 'Does Article 19 make freedom of speech absolute?',
        options: [
          'Yes, in every circumstance',
          'No, Article 19(2) permits reasonable restrictions on listed grounds',
          'Only for public officials',
        ],
        answer: 1,
        explanation: 'Article 19(2) lists constitutional grounds for reasonable restrictions.',
        provisionIds: ['article-19'],
      },
    ],
  },
];

export const myths = [
  {
    id: 'speech-absolute',
    myth: 'Freedom of speech means no law can ever restrict speech.',
    fact: 'Article 19(2) permits laws imposing reasonable restrictions on listed constitutional grounds. Whether a particular restriction is valid depends on law and facts.',
    provisionIds: ['article-19'],
  },
  {
    id: 'equality-identical',
    myth: 'Equality before law means every person must always be treated identically.',
    fact: 'Article 14 uses the terms equality before law and equal protection of laws. Applying it to a real policy requires legal and factual context.',
    provisionIds: ['article-14'],
  },
];

export const amendments = [
  {
    id: '42nd',
    number: '42nd Amendment',
    year: 1976,
    summary: 'The Preamble was amended to add “Socialist”, “Secular” and “integrity”.',
    provisionIds: ['preamble'],
    sourceNote:
      'Confirm historical and current constitutional text against the official Legislative Department edition.',
  },
  {
    id: '86th',
    number: '86th Amendment',
    year: 2002,
    summary:
      'Inserted Article 21A concerning free and compulsory education for children in the stated age range.',
    provisionIds: [],
    sourceNote:
      'This development corpus does not yet include Article 21A; use an official consolidated edition for the text.',
  },
];

export const LEARNING_TRANSLATIONS = {
  guj_Gujr: {
    paths: {
      'rights-foundations': {
        title: 'અધિકારોના પાયા',
        description: 'સમાનતા, સ્વતંત્રતા અને ગૌરવની સ્ત્રોત-આધારિત સમજ કેળવો.',
      },
      'public-life': {
        title: 'જાહેર જીવનમાં અધિકારો',
        description: 'ભેદભાવ, જાહેર સ્થળોએ પ્રવેશ અને બંધારણીય સુરક્ષા અંગે જાણો.',
      },
    },
    lessons: {
      'equality': {
        title: 'કાયદા સમક્ષ સમાનતા',
        objective: 'કલમ 14 માં રહેલ મુખ્ય સુરક્ષાને ઓળખો.',
        body: 'કલમ 14 જણાવે છે કે રાજ્ય ભારતમાં કાયદા સમક્ષ સમાનતા અથવા કાયદાઓના સમાન રક્ષણનો ઇનકાર કરશે નહીં. તે સરકારી સત્તાવાળાઓ દ્વારા સમાન વ્યવહાર વિચારવાનો પ્રારંભિક બિંદુ છે.',
      },
      'liberty': {
        title: 'વાણી અને અભિવ્યક્તિ',
        objective: 'સ્વતંત્રતા અને તેની બંધારણીય મર્યાદાઓ બંનેને સમજો.',
        body: 'કલમ 19 નાગરિકો માટે વાણી અને અભિવ્યક્તિ સહિતની વિવિધ સ્વતંત્રતાઓનું રક્ષણ કરે છે. કલમ 19(2) એવા આધારો પણ દર્શાવે છે કે જેના પર વાણી પર વાજબી નિયંત્રણો મૂકી શકાય છે.',
      },
      'public-access': {
        title: 'ભેદભાવ અને જાહેર પ્રવેશ',
        objective: 'જાહેર સ્થળો અને અસ્પૃશ્યતા સંબંધિત લખાણને સમજો.',
        body: 'કલમ 15 નિર્ધારિત આધારો પર ભેદભાવનો પ્રતિબંધ મૂકે છે અને જાહેર સ્થળોએ પ્રવેશની ખાતરી આપે છે. કલમ 17 અસ્પૃશ્યતા નાબૂદ કરે છે અને કોઈપણ સ્વરૂપમાં તેના આચરણ પર પ્રતિબંધ મૂકે છે.',
      },
    },
    quizzes: {
      'rights-basics': {
        title: 'અધિકારોના મૂળભૂત તત્વો',
        topic: 'મૂળભૂત અધિકારો',
        questions: {
          'q-equality': {
            prompt: 'કઈ કલમ કાયદા સમક્ષ સમાનતા ધરાવે છે?',
            options: ['કલમ 14', 'કલમ 17', 'કલમ 19'],
            explanation: 'કલમ 14 કાયદા સમક્ષ સમાનતાની ખાતરી આપે છે.',
          },
          'q-speech': {
            prompt: 'શું કલમ 19 વાણી સ્વાતંત્ર્યને સંપૂર્ણ (અમર્યાદિત) બનાવે છે?',
            options: [
              'હા, દરેક સંજોગોમાં',
              'ના, કલમ 19(2) નિર્ધારિત આધારો પર વાજબી નિયંત્રણોની મંજૂરી આપે છે',
              'માત્ર સરકારી અધિકારીઓ માટે',
            ],
            explanation: 'કલમ 19(2) વાજબી નિયંત્રણો માટે બંધારણીય આધારો દર્શાવે છે.',
          },
        },
      },
    },
    myths: {
      'speech-absolute': {
        myth: 'વાણી સ્વાતંત્ર્યનો અર્થ એ છે કે કોઈ કાયદો ક્યારેય વાણી પર પ્રતિબંધ મૂકી શકે નહીં.',
        fact: 'કલમ 19(2) યાદીબદ્ધ બંધારણીય આધારો પર વાજબી નિયંત્રણો લાદતા કાયદાઓની મંજૂરી આપે છે. કોઈ ચોક્કસ નિયંત્રણ માન્ય છે કે નહીં તે કાયદા અને હકીકતો પર આધાર રાખે છે.',
      },
      'equality-identical': {
        myth: 'કાયદા સમક્ષ સમાનતાનો અર્થ એ છે કે દરેક વ્યક્તિ સાથે હંમેશા એકસરખો વ્યવહાર થવો જોઈએ.',
        fact: 'કલમ 14 કાયદા સમક્ષ સમાનતા અને કાયદાઓના સમાન રક્ષણ શબ્દોનો ઉપયોગ કરે છે. વાસ્તવિક નીતિમાં તેનો અમલ કાનૂની અને વાસ્તવિક સંદર્ભ પર આધાર રાખે છે.',
      },
    },
    amendments: {
      '42nd': {
        number: '42મો સુધારો',
        summary: 'આમુખમાં "સમાજવાદી", "બિનસાંપ્રદાયિક" અને "અખંડિતતા" શબ્દો ઉમેરવા માટે સુધારો કરવામાં આવ્યો હતો.',
        sourceNote: 'સત્તાવાર કાયદાકીય વિભાગની આવૃત્તિ સામે ઐતિહાસિક અને વર્તમાન બંધારણીય લખાણ ચકાસો.',
      },
      '86th': {
        number: '86મો સુધારો',
        summary: 'નિર્ધારિત વયજૂથના બાળકો માટે મફત અને ફરજિયાત શિક્ષણ અંગે કલમ 21A ઉમેરવામાં આવી.',
        sourceNote: 'આ વિકાસ સંગ્રહમાં હજુ સુધી કલમ 21A શામેલ નથી; લખાણ માટે સત્તાવાર સંકલિત આવૃત્તિનો ઉપયોગ કરો.',
      },
    },
  },
  hin_Deva: {
    paths: {
      'rights-foundations': {
        title: 'अधिकारों की नींव',
        description: 'समानता, स्वतंत्रता और गरिमा की स्रोत-आधारित समझ विकसित करें।',
      },
      'public-life': {
        title: 'सार्वजनिक जीवन में अधिकार',
        description: 'भेदभाव, सार्वजनिक स्थानों तक पहुंच और संवैधानिक सुरक्षा उपायों को समझें।',
      },
    },
    lessons: {
      'equality': {
        title: 'विधि के समक्ष समता',
        objective: 'अनुच्छेद 14 में निहित मुख्य संरक्षण को पहचानें।',
        body: 'अनुच्छेद 14 कहता है कि राज्य भारत में विधि के समक्ष समता या विधियों के समान संरक्षण से वंचित नहीं करेगा। यह सार्वजनिक प्राधिकारियों द्वारा समान व्यवहार का आधार है।',
      },
      'liberty': {
        title: 'वाक् और अभिव्यक्ति',
        objective: 'स्वतंत्रता और उसकी संवैधानिक सीमाओं दोनों को पहचानें।',
        body: 'अनुच्छेद 19 नागरिकों के लिए वाक् और अभिव्यक्ति सहित कई स्वतंत्रताओं की रक्षा करता है। अनुच्छेद 19(2) उन आधारों की सूची देता है जिन पर उचित प्रतिबंध लगाए जा सकते हैं।',
      },
      'public-access': {
        title: 'भेदभाव और सार्वजनिक पहुंच',
        objective: 'सार्वजनिक स्थानों और अस्पृश्यता से संबंधित पाठ को पहचानें।',
        body: 'अनुच्छेद 15 निर्दिष्ट आधारों पर भेदभाव का प्रतिषेध करता है और सार्वजनिक स्थानों तक पहुंच सुनिश्चित करता है। अनुच्छेद 17 अस्पृश्यता का अंत करता है।',
      },
    },
    quizzes: {
      'rights-basics': {
        title: 'अधिकारों के मूल तत्व',
        topic: 'मौलिक अधिकार',
        questions: {
          'q-equality': {
            prompt: 'किस अनुच्छेद में विधि के समक्ष समता निहित है?',
            options: ['अनुच्छेद 14', 'अनुच्छेद 17', 'अनुच्छेद 19'],
            explanation: 'अनुच्छेद 14 विधि के समक्ष समता की गारंटी देता है।',
          },
          'q-speech': {
            prompt: 'क्या अनुच्छेद 19 वाक्-स्वतंत्रता को पूर्ण (असीमित) बनाता है?',
            options: [
              'हाँ, प्रत्येक परिस्थिति में',
              'नहीं, अनुच्छेद 19(2) सूचीबद्ध आधारों पर उचित प्रतिबंध की अनुमति देता है',
              'केवल सरकारी अधिकारियों के लिए',
            ],
            explanation: 'अनुच्छेद 19(2) उचित प्रतिबंधों के लिए संवैधानिक आधारों की सूची देता है।',
          },
        },
      },
    },
    myths: {
      'speech-absolute': {
        myth: 'वाक्-स्वतंत्रता का अर्थ है कि कोई भी कानून कभी भी भाषण पर प्रतिबंध नहीं लगा सकता।',
        fact: 'अनुच्छेद 19(2) सूचीबद्ध संवैधानिक आधारों पर उचित प्रतिबंध लगाने वाले कानूनों की अनुमति देता है। कोई विशेष प्रतिबंध वैध है या नहीं, यह कानून और तथ्यों पर निर्भर करता है।',
      },
      'equality-identical': {
        myth: 'विधि के समक्ष समता का अर्थ है कि प्रत्येक व्यक्ति के साथ हमेशा एक समान व्यवहार किया जाना चाहिए।',
        fact: 'अनुच्छेद 14 विधि के समक्ष समता और विधियों के समान संरक्षण शब्दों का उपयोग करता है। इसे वास्तविक नीति पर लागू करने के लिए कानूनी और तथ्यात्मक संदर्भ की आवश्यकता होती है।',
      },
    },
    amendments: {
      '42nd': {
        number: '42वां संशोधन',
        summary: 'प्रस्तावना में "समाजवादी", "पंथनिरपेक्ष" और "अखंडता" शब्द जोड़ने के लिए संशोधन किया गया था।',
        sourceNote: 'आधिकारिक विधायी विभाग संस्करण के विरुद्ध ऐतिहासिक और वर्तमान संवैधानिक पाठ की पुष्टि करें।',
      },
      '86th': {
        number: '86वां संशोधन',
        summary: 'निर्दिष्ट आयु वर्ग के बच्चों के लिए मुफ्त और अनिवार्य शिक्षा से संबंधित अनुच्छेद 21A जोड़ा गया।',
        sourceNote: 'इस विकास संग्रह में अभी अनुच्छेद 21A शामिल नहीं है; पाठ के लिए आधिकारिक समेकित संस्करण का उपयोग करें।',
      },
    },
  },
};

export function enrich(item) {
  return { ...item, provisions: (item.provisionIds || []).map(citation) };
}

export function lessonById(id, lang = 'eng_Latn') {
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) return null;
  const enriched = enrich(lesson);
  const localized = LEARNING_TRANSLATIONS[lang]?.lessons?.[id];
  if (localized) {
    return { ...enriched, ...localized };
  }
  return enriched;
}

export function getLearningPaths(lang = 'eng_Latn') {
  return learningPaths.map((path) => {
    const localizedPath = LEARNING_TRANSLATIONS[lang]?.paths?.[path.id] || {};
    return {
      ...path,
      ...localizedPath,
      lessons: path.lessons.map((id) => lessonById(id, lang)),
    };
  });
}

export function getQuizzes(lang = 'eng_Latn') {
  return quizzes.map((quiz) => {
    const localizedQuiz = LEARNING_TRANSLATIONS[lang]?.quizzes?.[quiz.id] || {};
    return {
      ...quiz,
      title: localizedQuiz.title || quiz.title,
      topic: localizedQuiz.topic || quiz.topic,
      questions: quiz.questions.map((q) => {
        const localizedQ = localizedQuiz.questions?.[q.id] || {};
        return {
          ...q,
          prompt: localizedQ.prompt || q.prompt,
          options: localizedQ.options || q.options,
          explanation: localizedQ.explanation || q.explanation,
        };
      }),
    };
  });
}

export function getMyths(lang = 'eng_Latn') {
  return myths.map((item) => {
    const enriched = enrich(item);
    const localized = LEARNING_TRANSLATIONS[lang]?.myths?.[item.id];
    return localized ? { ...enriched, ...localized } : enriched;
  });
}

export function getAmendments(lang = 'eng_Latn') {
  return amendments.map((item) => {
    const enriched = enrich(item);
    const localized = LEARNING_TRANSLATIONS[lang]?.amendments?.[item.id];
    return localized ? { ...enriched, ...localized } : enriched;
  });
}
