import { searchChunks, provisions, SOURCE } from './corpus.js';
import { generateGroundedExplanation, translateQuestionForRetrieval } from './gemini.js';
import { searchAtlasChunks } from './atlas.js';

const disclaimer =
  'Samvidhan AI is an educational tool, not a government service and not legal advice. It explains constitutional material using cited sources. The relevance of a provision to a real situation can depend on facts, current law and judicial interpretation. Consult a qualified legal professional for advice.';

const fundamentalRightsGroups = [
  {
    en: 'Right to Equality', gu: 'સમાનતાનો અધિકાર', hi: 'समानता का अधिकार', bn: 'সমতার অধিকার', mr: 'समानतेचा अधिकार', ta: 'சமத்துவ உரிமை', te: 'సమానత్వపు హక్కు', ur: 'مساوات کا حق',
    articles: 'Articles 14–18', guArticles: 'કલમ 14થી 18', hiArticles: 'अनुच्छेद 14-18',
    enText: 'Equality before law; prohibition of specified discrimination; equality of opportunity in public employment; abolition of untouchability; and abolition of titles.',
    guText: 'કાયદા સમક્ષ સમાનતા; નિર્ધારિત આધારો પર ભેદભાવનો પ્રતિબંધ; સરકારી નોકરીમાં સમાન તક; અસ્પૃશ્યતાનો અંત; અને ખિતાબોનો અંત.',
    hiText: 'विधि के समक्ष समता; धर्म, मूलवंश, जाति, लिंग या जन्मस्थान के आधार पर विभेद का प्रतिषेध; लोक नियोजन में अवसर की समता; अस्पृश्यता का अंत; और उपाधियों का अंत।',
    bnText: 'আইনের দৃষ্টিতে সমতা; বৈষম্যের নিষেধাজ্ঞা; সরকারি চাকুরিতে সমসুযোগ; অস্পৃশ্যতা দূরীকরণ; এবং খেতাব বর্জন।',
    mrText: 'कायद्यासमोर समानता; भेदभावास प्रतिबंध; सार्वजनिक रोजगारात समान संधी; अस्पृश्यता निवारण; आणि पदव्यांची समाप्ती.',
    taText: 'சட்டத்தின் முன் அனைவரும் சமம்; பாகுபாடு தடை; அரசு வேலைவாய்ப்பில் சம வாய்ப்பு; தீண்டாமை ஒழிப்பு; பட்டங்கள் ஒழிப்பு.',
    teText: 'చట్టం ముందు సమానత్వం; వివక్ష నిషేధం; ప్రభుత్వ ఉద్యోగాలలో సమాన అవకాశం; అస్పృశ్యత రద్దు; బిరుదుల రద్దు.',
    urText: 'قانون کے سامنے برابری، مخصوص بنیادوں پر تفریق کی ممانعت، سرکاری ملازمتوں میں یکساں مواقع، چھوت چھات کا خاتمہ اور القابات کا خاتمہ۔',
  },
  {
    en: 'Right to Freedom', gu: 'સ્વતંત્રતાનો અધિકાર', hi: 'स्वतंत्रता का अधिकार', bn: 'স্বাধীনতার অধিকার', mr: 'स्वातंत्र्याचा अधिकार', ta: 'சுதந்திர உரிமை', te: 'స్వేచ్ఛా హక్కు', ur: 'آزادی کا حق',
    articles: 'Articles 19–22 (including Article 21A)', guArticles: 'કલમ 19થી 22 (કલમ 21A સહિત)', hiArticles: 'अनुच्छेद 19-22 (अनुच्छेद 21A सहित)',
    enText: 'Specified freedoms such as speech and expression, safeguards in criminal convictions, protection of life and personal liberty, the right to education, and safeguards concerning arrest and detention. These rights have constitutional conditions and limits.',
    guText: 'વાણી અને અભિવ્યક્તિ સહિતની નિર્ધારિત સ્વતંત્રતાઓ, ગુનાની સજા સંબંધિત રક્ષણ, જીવન અને વ્યક્તિગત સ્વતંત્રતાનું રક્ષણ, શિક્ષણનો અધિકાર અને ધરપકડ તથા અટકાયત સંબંધિત રક્ષણ. આ અધિકારો બંધારણીય શરતો અને મર્યાદાઓને આધીન છે.',
    hiText: 'भाषण और अभिव्यक्ति की स्वतंत्रता, अपराधों के लिए दोषसिद्धि के संबंध में संरक्षण, प्राण और दैहिक स्वतंत्रता का संरक्षण, शिक्षा का अधिकार तथा गिरफ्तारी और निरोध से संरक्षण। ये अधिकार संवैधानिक सीमाओं के अधीन हैं।',
    bnText: 'বাক ও ভাব প্রকাশের স্বাধীনতা, অপরাধের জন্য দোষী সাব্যস্ত হওয়ার ক্ষেত্রে সুরক্ষা, জীবন ও ব্যক্তিগত স্বাধীনতার সুরক্ষা, শিক্ষার অধিকার এবং গ্রেফতার ও আটকের বিরুদ্ধে সুরক্ষা।',
    mrText: 'भाषण व अभिव्यक्ती स्वातंत्र्य, गुन्ह्यांच्या दोषाबद्दल संरक्षण, जीवित व वैयक्तिक स्वातंत्र्य, शिक्षणाचा हक्क आणि अटक व स्थानबद्धतेपासून संरक्षण.',
    taText: 'பேச்சு மற்றும் கருத்து சுதந்திரம், குற்றங்களுக்கான தண்டனையிலிருந்து பாதுகாப்பு, வாழ்வுரிமை மற்றும் தனிநபர் சுதந்திரம், கல்வி உரிமை மற்றும் கைதுக்கு எதிரான பாதுகாப்பு.',
    teText: 'వాక్ స్వాతంత్య్రం, నేరారోపణలలో రక్షణ, జీవించే హక్కు మరియు వ్యక్తిగత స్వేచ్ఛ, విద్యా హక్కు మరియు అరెస్టు నుండి రక్షణ.',
    urText: 'تقریر اور اظہار کی آزادی، سزا کے خلاف تحفظ، جان اور ذاتی آزادی کا تحفظ، تعلیم کا حق، اور گرفتاری اور حراست سے تحفظ۔',
  },
  {
    en: 'Right against Exploitation', gu: 'શોષણ વિરુદ્ધનો અધિકાર', hi: 'शोषण के विरुद्ध अधिकार', bn: 'শোষণের বিরুদ্ধে অধিকার', mr: 'शोषणाविरुद्ध हक्क', ta: 'சுரண்டலுக்கு எதிரான உரிமை', te: 'శోషణకు వ్యతిరేక హక్కు', ur: 'استحصال کے خلاف حق',
    articles: 'Articles 23–24', guArticles: 'કલમ 23થી 24', hiArticles: 'अनुच्छेद 23-24',
    enText: 'Prohibition of trafficking in human beings and forced labour, and prohibition of employment of children in factories and other hazardous employment covered by Article 24.',
    guText: 'માનવ વેપાર અને બળજબરીના શ્રમનો પ્રતિબંધ તથા કલમ 24 હેઠળ આવતાં કારખાનાં અને જોખમી રોજગારમાં બાળકોના કામ પર પ્રતિબંધ.',
    hiText: 'मानव दुर्व्यापार और बलात्श्रम का प्रतिषेध, तथा कारखानों आदि में 14 वर्ष से कम आयु के बालकों के नियोजन का प्रतिषेध।',
    bnText: 'মানুষ পাচার ও বলপূর্বক শ্রম নিষিদ্ধকরণ এবং বিপজ্জনক কাজে শিশুশ্রম নিষিদ্ধকরণ।',
    mrText: 'मानवी व्यापार व वेठबिगारीस मनाई, आणि घातक कामांमध्ये बालमजुरीवर बंदी.',
    taText: 'மனித கடத்தல் மற்றும் கட்டாய வேலைக்கு தடை, தொழிற்சாலைகளில் குழந்தை தொழிலாளர் முறை தடை.',
    teText: 'మానవ అక్రమ రవాణా, వెట్టిచాకిరీ నిషేధం మరియు కర్మాగారాలలో బాలకార్మిక వ్యవస్థ నిషేధం.',
    urText: 'انسانوں کی اسمگلنگ، جبری مشقت پر پابندی، اور خطرناک ملازمتوں میں بچوں کے کام پر پابندی۔',
  },
  {
    en: 'Right to Freedom of Religion', gu: 'ધર્મની સ્વતંત્રતાનો અધિકાર', hi: 'धर्म की स्वतंत्रता का अधिकार', bn: 'ধর্মীয় স্বাধীনতার অধিকার', mr: 'धार्मिक स्वातंत्र्याचा हक्क', ta: 'மத சுதந்திர உரிமை', te: 'మత స్వేచ్ఛా హక్కు', ur: 'مذہبی آزادی کا حق',
    articles: 'Articles 25–28', guArticles: 'કલમ 25થી 28', hiArticles: 'अनुच्छेद 25-28',
    enText: 'Freedom of conscience and religion, management of religious affairs, safeguards concerning taxes for promotion of a particular religion, and religious instruction or worship in certain educational institutions.',
    guText: 'અંતરાત્મા અને ધર્મની સ્વતંત્રતા, ધાર્મિક બાબતોનું સંચાલન, કોઈ ખાસ ધર્મના પ્રચાર માટે કરવેરા સંબંધિત રક્ષણ અને કેટલીક શૈક્ષણિક સંસ્થાઓમાં ધાર્મિક શિક્ષણ અથવા ઉપાસના અંગેના નિયમો.',
    hiText: 'अंतःकरण की और धर्म के अबाध रूप से मानने, आचरण और प्रचार करने की स्वतंत्रता, धार्मिक कार्यों के प्रबंध की स्वतंत्रता तथा करों के संदाय से स्वतंत्रता।',
    bnText: 'বিবেক ও ধর্মের স্বাধীনতা, ধর্মীয় কাজ পরিচালনার স্বাধীনতা এবং নির্দিষ্ট শিক্ষাপ্রতিষ্ঠানে ধর্মীয় শিক্ষার নিয়মাবলী।',
    mrText: 'सद्सद्विवेकबुद्धीचे व धर्माचे स्वातंत्र्य, धार्मिक व्यवहारांची व्यवस्था पाहण्याचे स्वातंत्र्य.',
    taText: 'மனசாட்சி மற்றும் மத சுதந்திரம், மத விவகாரங்களை நிர்வகிக்கும் சுதந்திரம்.',
    teText: 'స్వేచ్ఛగా మతాన్ని అవలంబించే, ఆచరించే మరియు ప్రచారం చేసే హక్కు, మతపరమైన వ్యవహారాల నిర్వహణ.',
    urText: 'ضمیر اور مذہب کی آزادی، مذہبی امور کے انتظام کی آزادی اور تبلیغ کا حق۔',
  },
  {
    en: 'Cultural and Educational Rights', gu: 'સાંસ્કૃતિક અને શૈક્ષણિક અધિકારો', hi: 'संस्कृति और शिक्षा संबंधी अधिकार', bn: 'সংস্কৃতি ও শিক্ষাগত অধিকার', mr: 'सांस्कृतिक व शैक्षणिक हक्क', ta: 'கலாச்சார மற்றும் கல்வி உரிமைகள்', te: 'సాంస్కృతిక మరియు విద్యా హక్కులు', ur: 'ثقافتی اور تعلیمی حقوق',
    articles: 'Articles 29–30', guArticles: 'કલમ 29થી 30', hiArticles: 'अनुच्छेद 29-30',
    enText: 'Protection of the interests of sections of citizens with a distinct language, script or culture, and the right of minorities to establish and administer educational institutions, subject to the Constitution.',
    guText: 'વિશિષ્ટ ભાષા, લિપિ અથવા સંસ્કૃતિ ધરાવતા નાગરિકોના હિતોનું રક્ષણ અને લઘુમતીઓને શૈક્ષણિક સંસ્થાઓ સ્થાપવા તથા સંચાલિત કરવાનો અધિકાર, બંધારણની જોગવાઈઓને આધીન.',
    hiText: 'अल्पसंख्यक वर्गों के हितों का संरक्षण तथा शिक्षा संस्थाओं की स्थापना और प्रशासन करने का अल्पसंख्यक वर्गों का अधिकार।',
    bnText: 'সংখ্যালঘুদের ভাষা, লিপি ও সংস্কৃতি সংরক্ষণ এবং শিক্ষাপ্রতিষ্ঠান স্থাপন ও পরিচালনার অধিকার।',
    mrText: 'अल्पसंख्याकांच्या हितसंबंधांचे संरक्षण आणि शैक्षणिक संस्था स्थापण्याचा व चालवण्याचा हक्क.',
    taText: 'சிறுபான்மையினரின் மொழி, எழுத்து மற்றும் கலாச்சாரப் பாதுகாப்பு மற்றும் கல்வி நிறுவனங்களை நிர்வகிக்கும் உரிமை.',
    teText: 'మైనారిటీల ప్రయోజనాల పరిరక్షణ మరియు విద్యాసంస్థలను స్థాపించే హక్కు.',
    urText: 'اقلیتوں کی زبان، رسم الخط اور ثقافت کا تحفظ اور تعلیمی ادارے قائم کرنے کا حق۔',
  },
  {
    en: 'Right to Constitutional Remedies', gu: 'બંધારણીય ઉપચારનો અધિકાર', hi: 'संवैधानिक उपचारों का अधिकार', bn: 'সাংবিধানিক প্রতিবিধানের অধিকার', mr: 'घटनात्मक उपायांचा हक्क', ta: 'அரசியலமைப்பு தீர்வு உரிமை', te: 'రాజ్యాంగ పరిహారాల హక్కు', ur: 'آئینی علاج کا حق',
    articles: 'Article 32', guArticles: 'કલમ 32', hiArticles: 'अनुच्छेद 32',
    enText: 'The right to approach the Supreme Court for enforcement of the Fundamental Rights guaranteed by Part III (using writs including Habeas Corpus, Mandamus, Prohibition, Quo Warranto, and Certiorari).',
    guText: 'ભાગ III દ્વારા આપવામાં આવેલા મૂળભૂત અધિકારોના અમલ માટે સર્વોચ્ચ અદાલતનો સંપર્ક કરવાનો અધિકાર (હેબિયસ કોર્પસ, મેન્ડેમસ વગેરે રિટ દ્વારા).',
    hiText: 'भाग III द्वारा प्रदत्त अधिकारों को प्रवर्तित कराने के लिए उच्चतम न्यायालय जाने का अधिकार (बंदी प्रत्यक्षीकरण, परमादेश, प्रतिषेध, अधिकार-पृच्छा और उत्प्रेषण रिट)। डॉ. आंबेडकर ने इसे संविधान की आत्मा कहा था।',
    bnText: 'মৌলিক অধিকার বলবৎ করার জন্য সুপ্রিম কোর্টে যাওয়ার অধিকার (হেবিয়াস কর্পাস, ম্যান্ডামাস ইত্যাদি রিট দ্বারা)।',
    mrText: 'मूलभूत हक्कांच्या अंमलबजावणीसाठी सर्वोच्च न्यायालयात दाद मागण्याचा हक्क (प्रादेश व रिट्स).',
    taText: 'அடிப்படை உரிமைகளை நிலைநாட்ட உச்ச நீதிமன்றத்தை அணுகும் உரிமை (ரிட் மனுக்கள்).',
    teText: 'ప్రాథమిక హక్కుల అమలుకై సుప్రీంకోర్టును ఆశ్రయించే హక్కు (రిట్స్ ద్వారా).',
    urText: 'بنیادی حقوق کے نفاذ کے لیے سپریم کورٹ سے رجوع کرنے کا حق (حبس بے جا، پروانہ وغیرہ رٹ کے ذریعے)۔',
  },
];

function articleCitations(numbers) {
  return provisions
    .filter((item) => numbers.includes(item.number))
    .map((item) => ({
      chunkId: item.chunkIds[0],
      identifier: item.identifier,
      pdfPageStart: item.pdfPageStart,
      pdfPageEnd: item.pdfPageEnd,
      source: { ...SOURCE, pageUrl: `${SOURCE.url}#page=${item.pdfPageStart}` },
      contentStatus: item.contentStatus,
    }));
}

function fundamentalRightsAnswer(language) {
  const gujarati = language === 'guj_Gujr';
  const hindi = language === 'hin_Deva';
  const groups = fundamentalRightsGroups.map((group) => ({
    identifier: gujarati
      ? `${group.gu} — ${group.guArticles}`
      : hindi
        ? `${group.hi} — ${group.hiArticles}`
        : `${group.en} — ${group.articles}`,
    text: gujarati ? group.guText : hindi ? group.hiText : group.enText,
  }));
  const citations = articleCitations([
    '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '21A', '22',
    '23', '24', '25', '26', '27', '28', '29', '30', '32', '33', '34', '35',
  ]);
  const explanationLang = gujarati ? 'guj_Gujr' : hindi ? 'hin_Deva' : 'eng_Latn';

  return {
    status: 'grounded',
    answerType: 'fundamental_rights_overview',
    answerLanguage: language,
    translationStatus: gujarati || hindi ? 'human_authored_educational_summary' : 'available',
    explanationLanguage: explanationLang,
    directAnswer: gujarati
      ? 'ભારતના બંધારણના ભાગ III (કલમ 12થી 35)માં મૂળભૂત અધિકારો આપવામાં આવ્યા છે. સામાન્ય રીતે તેમને નીચેના છ મુખ્ય જૂથોમાં સમજાવવામાં આવે છે. કેટલાક અધિકારો દરેક વ્યક્તિને મળે છે, જ્યારે કેટલાક ખાસ કરીને નાગરિકોને મળે છે; દરેક અધિકારની પોતાની શરતો અને મર્યાદાઓ છે.'
      : hindi
        ? 'भारत के संविधान के भाग III (अनुच्छेद 12 से 35) में मूल अधिकारों का प्रावधान है। इन्हें मुख्य रूप से छह समूहों में वर्गीकृत किया गया है। ये अधिकार राज्य के विरुद्ध नागरिकों और व्यक्तियों के मौलिक अधिकारों की रक्षा करते हैं।'
        : 'The Fundamental Rights are set out in Part III of the Constitution of India (Articles 12–35). They are commonly grouped into six categories below. Some rights apply to all persons, while others are limited to citizens; each right is subject to its own constitutional conditions and limitations.',
    whatConstitutionSays: groups,
    simpleExplanation: gujarati
      ? 'આ છ જૂથો બંધારણના ભાગ IIIની વિષયસૂચી અને સંબંધિત કલમોના શીર્ષકો પરથી તૈયાર કરેલો સરળ સાર છે; દરેક કલમનો શબ્દશઃ અનુવાદ નથી. આ અધિકારો સમાનતા, સ્વતંત્રતા, શોષણથી રક્ષણ, ધર્મની સ્વતંત્રતા, ભાષા-સંસ્કૃતિ અને શિક્ષણ સંબંધિત હિતોનું રક્ષણ કરે છે.'
      : hindi
        ? 'ये छह समूह संविधान के भाग III की विषय-वस्तु का सरल सार हैं। यह प्रत्येक अनुच्छेद का शब्दशः अनुवाद नहीं बल्कि एक सुगम शैक्षिक व्याख्या है।'
        : 'These six groups are a plain-language overview of Part III and its related provisions, not a substitute for reading each Article. They cover equality, freedoms, protection against exploitation, religious freedom, cultural and educational interests, and constitutional remedies.',
    everydayExample: gujarati
      ? 'ઉદાહરણ તરીકે, જાહેર સત્તા દ્વારા ભેદભાવપૂર્ણ પગલું લેવાય તો હકીકતો અને લાગુ પડતી જોગવાઈઓના આધારે સમાનતાના અધિકારનો પ્રશ્ન ઊભો થઈ શકે છે.'
      : hindi
        ? 'उदाहरण के लिए, यदि कोई सरकारी प्राधिकरण किसी नागरिक के साथ जाति या धर्म के आधार पर भेदभाव करता है, तो समानता के अधिकार के तहत न्यायालय की शरण ली जा सकती है।'
        : 'For example, discriminatory action by a public authority may raise an equality-rights question, depending on the facts and the applicable constitutional provision.',
    limits: gujarati
      ? 'આ સરળ પરિચય છે, દરેક કલમનો સંપૂર્ણ કાનૂની અર્થ નથી. મિલકતનો અધિકાર હવે ભાગ IIIનો મૂળભૂત અધિકાર નથી: જૂની કલમ 31 કાઢી નાખવામાં આવી છે અને મિલકત અંગેનું બંધારણીય રક્ષણ કલમ 300Aમાં ભાગ IIIની બહાર છે. કલમ 19ની સ્વતંત્રતાઓ સહિત કેટલાક અધિકારો પર બંધારણીય નિયંત્રણો અથવા અન્ય શરતો લાગુ પડે છે. આ કાનૂની સલાહ નથી.'
      : hindi
        ? 'यह एक शैक्षिक अवलोकन है, संपूर्ण विधिक परामर्श नहीं। संपत्ति का अधिकार अब मौलिक अधिकार नहीं है; इसे 44वें संशोधन द्वारा अनुच्छेद 300A के अंतर्गत विधिक अधिकार बनाया गया है। अनुच्छेद 19 की स्वतंत्रताओं पर युक्तियुक्त निर्बंधन लागू होते हैं।'
        : 'This is a beginner-friendly overview, not the full legal text or interpretation of every Article. The right to property is no longer a Fundamental Right in Part III: former Article 31 was omitted, and the constitutional protection for property is now in Article 300A outside Part III. Some rights, including Article 19 freedoms, are subject to constitutional restrictions or other conditions. This is not legal advice.',
    relatedProvisions: ['Articles 12–35'],
    citations,
    sourceVersion: SOURCE,
    corpusStatus: SOURCE.status,
    disclaimer: gujarati
      ? 'સમવિધાન AI શૈક્ષણિક માહિતી માટેનું સાધન છે; તે સરકારી સેવા કે કાનૂની સલાહ નથી. વાસ્તવિક પરિસ્થિતિમાં લાગુ પડતો કાયદો હકીકતો અને અદાલતી અર્થઘટન પર આધારિત હોઈ શકે છે. જરૂરી હોય તો લાયક કાનૂની નિષ્ણાતની સલાહ લો.'
      : disclaimer,
  };
}

// Comprehensive constitutional topic dictionary for grounded offline and local synthesis
const CONSTITUTIONAL_TOPICS = [
  {
    keys: ['article 14', 'equality before law', 'equal protection', 'સમાનતા', 'કાયદા સમક્ષ સમાનતા', 'समानता', 'विधि के समक्ष समता', 'সমতা', 'సమానత్వం', 'சமத்துவம்', 'مساوات'],
    articleId: 'article-14',
    en: {
      direct: 'Article 14 guarantees equality before the law and equal protection of the laws to all persons within the territory of India.',
      simple: 'Article 14 means the government cannot treat people arbitrarily. The same law applies to everyone in similar circumstances, and no one is above the law. It applies to citizens and foreigners alike.',
      limits: 'Equality before the law allows reasonable classification based on intelligible differentia having a rational relation to the legislative objective. It does not mean identical treatment for people in unequal circumstances.',
      example: 'If two individuals commit the same traffic infraction, the state cannot impose a fine on one and exempt the other simply due to influence or status.',
    },
    hi: {
      direct: 'अनुच्छेद 14 भारत के राज्यक्षेत्र में किसी भी व्यक्ति को विधि के समक्ष समता या विधियों के समान संरक्षण से वंचित नहीं करेगा।',
      simple: 'अनुच्छेद 14 का अर्थ है कि कानून की नजर में सभी बराबर हैं। सरकार किसी भी व्यक्ति के साथ मनमाना व्यवहार नहीं कर सकती। यह अधिकार नागरिकों और विदेशियों दोनों को प्राप्त है।',
      limits: 'विधि के समक्ष समता पूर्ण एकरूपता नहीं मांगती; युक्तिसंगत वर्गीकरण की अनुमति है यदि उसका कानून के उद्देश्य से तर्कसंगत संबंध हो।',
      example: 'समान अपराध के लिए दो व्यक्तियों में से किसी एक को केवल उसके पद या रसूख के आधार पर छूट नहीं दी जा सकती।',
    },
    gu: {
      direct: 'કલમ 14 ભારતના રાજ્યક્ષેત્રમાં કાયદા સમક્ષ સમાનતા અથવા કાયદાઓના સમાન રક્ષણની બાંયધરી આપે છે.',
      simple: 'કલમ 14 જણાવે છે કે કાયદો દરેક વ્યક્તિ માટે સમાન છે. સરકાર કોઈ પણ વ્યક્તિ સાથે મનસ્વી ભેદભાવ કરી શકતી નથી. આ અધિકાર નાગરિકો અને બિન-નાગરિકો બંનેને મળે છે.',
      limits: 'સમાનતાનો અર્થ એ નથી કે અસમાન પરિસ્થિતિ ધરાવતા લોકો સાથે એકસરખો વ્યવહાર થાય; વાજબી વર્ગીકરણની બંધારણમાં છૂટ છે.',
      example: 'જો બે વ્યક્તિઓ સમાન નિયમભંગ કરે તો કોઈ એકને તેના પદના આધારે મુક્તિ આપી શકાય નહીં.',
    }
  },
  {
    keys: ['article 19', 'freedom of speech', 'speech and expression', 'વાણી સ્વતંત્રતા', 'अभिव્યक्ति की स्वतंत्रता', 'বাক স্বাধীনতা', 'భాషణా స్వేచ్ఛ', 'பேச்சு சுதந்திரம்', 'آزادی اظہار'],
    articleId: 'article-19',
    en: {
      direct: 'Article 19(1)(a) guarantees to all citizens the right to freedom of speech and expression, along with rights to assemble peacefully, form associations, move freely, reside anywhere in India, and practice any trade or profession.',
      simple: 'You have the democratic right to express your thoughts, opinions, and beliefs through speech, writing, art, press, and digital media without unjust censorship.',
      limits: 'Under Article 19(2), the state may impose reasonable restrictions on speech in the interests of the sovereignty and integrity of India, security of the State, public order, decency or morality, contempt of court, or defamation.',
      example: 'A citizen or journalist may peacefully criticize government policy in an article, but cannot incite imminent violence or commit defamation.',
    },
    hi: {
      direct: 'अनुच्छेद 19(1)(क) सभी नागरिकों को वाक्-स्वतंत्रता और अभिव्यक्ति-स्वतंत्रता का अधिकार प्रदान करता है।',
      simple: 'प्रत्येक भारतीय नागरिक को अपने विचार, राय और विश्वास बोलकर, लिखकर या अन्य माध्यमों से व्यक्त करने का मौलिक अधिकार है।',
      limits: 'अनुच्छेद 19(2) के तहत भारत की संप्रभुता, सुरक्षा, लोक व्यवस्था, शिष्टाचार या न्यायालय की अवमानना के हित में युक्तियुक्त प्रतिबंध लगाए जा सकते हैं।',
      example: 'कोई नागरिक सरकार की नीतियों की शांतिपूर्वक आलोचना कर सकता है, लेकिन हिंसा भड़काने की अनुमति नहीं है।',
    },
    gu: {
      direct: 'કલમ 19(1)(a) તમામ નાગરિકોને વાણી અને અભિવ્યક્તિની સ્વતંત્રતાની ખાતરી આપે છે.',
      simple: 'તમે બોલીને, લખીને કે કળા દ્વારા તમારા મંતવ્યો અને વિચારો મુક્તપણે વ્યક્ત કરી શકો છો.',
      limits: 'કલમ 19(2) મુજબ દેશની અખંડિતતા, સુરક્ષા, જાહેર વ્યવસ્થા, અને અદાલતની માનહાનિ જેવા આધારો પર વાજબી નિયંત્રણો મૂકી શકાય છે.',
      example: 'સરકારી નીતિઓની શાંતિપૂર્ણ ટીકા કરી શકાય છે, પરંતુ હિંસા ભડકાવી શકાતી નથી.',
    }
  },
  {
    keys: ['article 21', 'right to life', 'personal liberty', 'જીવનનો અધિકાર', 'प्राण और दैहिक स्वतंत्रता', 'जीवन का अधिकार', 'வாழ்வுரிமை', 'జీవించే హక్కు', 'حق زندگی'],
    articleId: 'article-21',
    en: {
      direct: 'Article 21 mandates that no person shall be deprived of his life or personal liberty except according to procedure established by law.',
      simple: 'Article 21 is considered the heart of fundamental rights. The Supreme Court has interpreted "life" to mean life with human dignity, including the right to privacy, clean environment, health, shelter, and fair trial.',
      limits: 'Life and personal liberty may only be restricted by a valid, fair, just, and reasonable law enacted by a competent legislature, accompanied by fair procedure (Maneka Gandhi doctrine).',
      example: 'A person cannot be arbitrarily arrested or detained without statutory authority and due legal procedure complying with natural justice.',
    },
    hi: {
      direct: 'अनुच्छेद 21 के अनुसार किसी व्यक्ति को उसके प्राण या दैहिक स्वतंत्रता से विधि द्वारा स्थापित प्रक्रिया के अनुसार ही वंचित किया जाएगा, अन्यथा नहीं।',
      simple: 'अनुच्छेद 21 केवल जीवित रहने का अधिकार नहीं बल्कि मानवीय गरिमा के साथ जीने का अधिकार देता है, जिसमें निजता (प्राइवेसी), स्वच्छ पर्यावरण और निष्पक्ष सुनवाई का अधिकार शामिल है।',
      limits: 'प्राण और दैहिक स्वतंत्रता पर केवल उचित, न्यायसंगत और वैध विधिक प्रक्रिया द्वारा ही रोक लगाई जा सकती है।',
      example: 'पुलिस किसी व्यक्ति को बिना विधिक आधार और उचित प्रक्रिया के हिरासत में नहीं रख सकती।',
    },
    gu: {
      direct: 'કલમ 21 જણાવે છે કે કાયદા દ્વારા સ્થાપિત પ્રક્રિયા સિવાય કોઈ પણ વ્યક્તિને તેના જીવન કે વ્યક્તિગત સ્વતંત્રતાથી વંચિત કરી શકાશે નહીં.',
      simple: 'કલમ 21 માનવ ગૌરવ સાથે જીવવાનો અધિકાર આપે છે. તેમાં ગોપનીયતા (પ્રાઇવસી), આરોગ્ય, સ્વચ્છ પર્યાવરણ અને ન્યાયી સુનાવણીનો સમાવેશ થાય છે.',
      limits: 'કાયદેસર અને ન્યાયસંગત કાયદાકીય પ્રક્રિયા વિના જીવન કે સ્વતંત્રતા છીનવી શકાતી નથી.',
      example: 'કોઈપણ વ્યક્તિની ગેરકાયદે કે મનસ્વી ધરપકડ થઈ શકતી નથી.',
    }
  },
  {
    keys: ['article 21a', 'right to education', 'rte', 'શિક્ષણનો અધિકાર', 'शिक्षा का अधिकार', 'கல்வி உரிமை', 'విద్యా హక్కు'],
    articleId: 'article-21a',
    en: {
      direct: 'Article 21A provides that the State shall provide free and compulsory education to all children of the age of six to fourteen years in such manner as the State may determine.',
      simple: 'Every child in India between 6 and 14 years old has a fundamental right to attend school and receive free, quality elementary education.',
      limits: 'The right applies to the age bracket of 6 to 14 years and is implemented in detail through the Right of Children to Free and Compulsory Education Act, 2009.',
      example: 'A government or aided school cannot turn away a 9-year-old child from enrollment in elementary classes due to inability to pay fees.',
    },
    hi: {
      direct: 'अनुच्छेद 21A के तहत राज्य 6 से 14 वर्ष की आयु के सभी बालकों के लिए निःशुल्क और अनिवार्य शिक्षा का उपबंध करेगा।',
      simple: '6 से 14 वर्ष के प्रत्येक बच्चे को प्राथमिक विद्यालय में मुफ्त और अनिवार्य शिक्षा प्राप्त करने का संवैधानिक मौलिक अधिकार है।',
      limits: 'यह अधिकार 6 से 14 वर्ष की आयु वर्ग के लिए है और शिक्षा का अधिकार अधिनियम (RTE Act, 2009) द्वारा लागू किया जाता है।',
      example: 'कोई भी सरकारी स्कूल 8 वर्ष के बच्चे को फीस न दे पाने के आधार पर प्रवेश देने से इनकार नहीं कर सकता।',
    },
    gu: {
      direct: 'કલમ 21A હેઠળ રાજ્ય 6 થી 14 વર્ષની વયના તમામ બાળકોને મફત અને ફરજિયાત શિક્ષણ આપશે.',
      simple: 'ભારતના 6 થી 14 વર્ષના દરેક બાળકને મફત અને ગુણવત્તાયુક્ત પ્રાથમિક શિક્ષણ મેળવવાનો મૂળભૂત અધિકાર છે.',
      limits: 'આ અધિકાર 6 થી 14 વર્ષના બાળકો માટે છે અને RTE કાયદા, 2009 હેઠળ અમલમાં મુકાયો છે.',
      example: 'કોઈ પણ સરકારી શાળા ફી ન હોવાના બહાને 10 વર્ષના બાળકને પ્રવેશ આપવાનો ઇનકાર કરી શકતી નથી.',
    }
  },
  {
    keys: ['article 32', 'constitutional remedies', 'writs', 'habeas corpus', 'mandamus', 'બંધારણીય ઉપચાર', 'संवैधानिक उपचार', 'रिट', 'நீதிப்பேராணை'],
    articleId: 'article-32',
    en: {
      direct: 'Article 32 guarantees the right to move the Supreme Court by appropriate proceedings for the enforcement of the Fundamental Rights in Part III.',
      simple: 'Article 32 allows any person whose fundamental rights are violated to directly petition the Supreme Court. The Court can issue 5 types of writs: Habeas Corpus (release illegal detainee), Mandamus (command duty), Prohibition, Quo Warranto (challenge unlawful office), and Certiorari (quash unlawful order). Dr. B.R. Ambedkar called Article 32 the "heart and soul of the Constitution".',
      limits: 'Article 32 can only be invoked for violations of Part III Fundamental Rights, not for ordinary legal or contractual disputes. It may be suspended during a Proclamation of Emergency under Article 359.',
      example: 'If an individual is unlawfully detained without being produced before a magistrate within 24 hours, their family can file a Habeas Corpus petition under Article 32.',
    },
    hi: {
      direct: 'अनुच्छेद 32 भाग III द्वारा प्रदत्त अधिकारों को प्रवर्तित कराने के लिए उच्चतम न्यायालय में समुचित कार्यवाहियों द्वारा जाने का अधिकार प्रत्याभूत करता है।',
      simple: 'अनुच्छेद 32 को डॉ. भीमराव आंबेडकर ने "संविधान का हृदय और आत्मा" कहा था। यह नागरिकों को अपने अधिकारों की रक्षा के लिए सीधे सुप्रीम कोर्ट जाने की शक्ति देता है। सुप्रीम कोर्ट 5 प्रकार की रिट (बंदी प्रत्यक्षीकरण, परमादेश आदि) जारी कर सकता है।',
      limits: 'अनुच्छेद 32 केवल मौलिक अधिकारों के उल्लंघन पर लागू होता है, सामान्य दीवानी या संविदात्मक विवादों पर नहीं।',
      example: 'अवैध रूप से हिरासत में रखे गए व्यक्ति की रिहाई के लिए बंदी प्रत्यक्षीकरण (Habeas Corpus) याचिका दायर की जा सकती है।',
    },
    gu: {
      direct: 'કલમ 32 મૂળભૂત અધિકારોના અમલ માટે સર્વોચ્ચ અદાલતમાં સીધા જવાની બાંયધરી આપે છે.',
      simple: 'કલમ 32 ને ડો. બાબાસાહેબ આંબેડકરે "બંધારણનો આત્મા અને હૃદય" ગણાવ્યું હતું. તેના હેઠળ સુપ્રીમ કોર્ટ 5 પ્રકારની રિટ (હેબિયસ કોર્પસ, મેન્ડેમસ વગેરે) બહાર પાડી શકે છે.',
      limits: 'આ કલમ ફક્ત ભાગ III ના મૂળભૂત અધિકારોના ભંગ માટે જ વાપરી શકાય છે.',
      example: 'ગેરકાયદે અટકાયતમાંથી મુક્તિ માટે હેબિયસ કોર્પસ રિટ અરજી કરી શકાય છે.',
    }
  },
  {
    keys: ['article 51a', 'fundamental duties', 'duties of citizens', 'મૂળભૂત ફરજો', 'मौलिक कर्तव्य', 'মূল কর্তব্য', 'బాధ్యతలు', 'கடமைகள்'],
    articleId: 'article-51a',
    en: {
      direct: 'Article 51A sets out the 11 Fundamental Duties of every citizen of India, including abiding by the Constitution, cherishing the national flag and anthem, protecting sovereignty, promoting harmony, safeguarding public property, and protecting the environment.',
      simple: 'While Fundamental Rights protect you, Fundamental Duties remind citizens to act responsibly toward the nation, society, fellow citizens, and the environment.',
      limits: 'Fundamental duties are moral obligations and are not directly enforceable by courts through writs, though Parliament has enacted specific statutes (like the Prevention of Insults to National Honour Act and Wildlife Protection Act) covering several duties.',
      example: 'A citizen shows respect by standing for the National Anthem, avoiding damage to public monuments, and providing education to their child.',
    },
    hi: {
      direct: 'अनुच्छेद 51A भारत के प्रत्येक नागरिक के 11 मौलिक कर्तव्यों का उल्लेख करता है (42वें संशोधन द्वारा 1976 में जोड़ा गया, और 86वें संशोधन 2002 द्वारा 11वां कर्तव्य जोड़ा गया)।',
      simple: 'मौलिक कर्तव्य नागरिकों को राष्ट्र, समाज, पर्यावरण और साथी नागरिकों के प्रति जिम्मेदार व्यवहार की याद दिलाते हैं।',
      limits: 'मौलिक कर्तव्य सीधे तौर पर न्यायालय द्वारा प्रवर्तनीय नहीं हैं, किंतु संसद ने इनके अनुपालन हेतु विशिष्ट कानून बनाए हैं।',
      example: 'राष्ट्रीय ध्वज और राष्ट्रगान का सम्मान करना, सार्वजनिक संपत्ति की रक्षा करना और पर्यावरण को स्वच्छ रखना प्रत्येक नागरिक का कर्तव्य है।',
    },
    gu: {
      direct: 'કલમ 51A ભારતના દરેક નાગરિકની 11 મૂળભૂત ફરજો દર્શાવે છે.',
      simple: 'મૂળભૂત ફરજો નાગરિકોને રાષ્ટ્ર, બંધારણ, પર્યાવરણ અને સમાજ પ્રત્યે જવાબદારીની યાદ અપાવે છે.',
      limits: 'ફરજો અદાલત દ્વારા સીધી રીતે ફરજિયાત નથી કરી શકાતી, પરંતુ તેના પાલન માટે વિવિધ કાયદા ઘડાયેલા છે.',
      example: 'રાષ્ટ્રધ્વજ અને રાષ્ટ્રગીતનું સન્માન કરવું તથા સાર્વજનિક મિલકતને નુકસાન ન પહોંચાડવું.',
    }
  },
  {
    keys: ['preamble', 'we the people', 'sovereign socialist secular democratic republic', 'આમુખ', 'પ્રસ્તાવના', 'प्रस्तावना', 'उद्देशिका', 'প্রস্তাবনা', 'పీఠిక', 'முகப்புரை'],
    articleId: 'preamble',
    en: {
      direct: 'The Preamble declares India to be a Sovereign Socialist Secular Democratic Republic, and secures to all its citizens Justice, Liberty, Equality, and Fraternity assuring the dignity of the individual and the unity and integrity of the Nation.',
      simple: 'The Preamble is the guiding introduction and philosophy of the Constitution of India. It declares that the ultimate authority resides in "We, the People of India".',
      limits: 'The Preamble is part of the Constitution (Kesavananda Bharati case, 1973) and can be amended under Article 368 without destroying the Basic Structure. It is not directly enforceable in a court of law on its own, but guides constitutional interpretation.',
      example: 'When laws or constitutional provisions have ambiguous wording, judges examine the Preamble to discern the framers\' intent regarding secularism, justice, and equality.',
    },
    hi: {
      direct: 'प्रस्तावना भारत को एक संपूर्ण प्रभुत्व-संपन्न, समाजवादी, पंथनिरपेक्ष, लोकतंत्रात्मक गणराज्य घोषित करती है तथा सभी नागरिकों को न्याय, स्वतंत्रता, समता और बंधुता सुनिश्चित करती है।',
      simple: 'प्रस्तावना संविधान की आत्मा और उसका दर्शन है। यह स्पष्ट करती है कि संविधान की शक्ति का स्रोत "हम भारत के लोग" हैं।',
      limits: 'केशवानंद भारती मामले (1973) के अनुसार प्रस्तावना संविधान का अभिन्न अंग है, किंतु यह स्वयं किसी अधिकार का स्वतंत्र स्रोत नहीं है।',
      example: 'अदालतें किसी कानून की व्याख्या करते समय धर्मनिरपेक्षता और सामाजिक न्याय के सिद्धांतों को समझने के लिए प्रस्तावना का सहारा लेती हैं।',
    },
    gu: {
      direct: 'આમુખ ભારતને સાર્વભૌમ, સમાજવાદી, બિનસાંપ્રદાયિક, લોકશાહી પ્રજાસત્તાક જાહેર કરે છે અને ન્યાય, સ્વતંત્રતા, સમાનતા અને બંધુતાની ખાતરી આપે છે.',
      simple: 'આમુખ એ ભારતીય બંધારણનું પ્રવેશદ્વાર અને આત્મા છે. તે દર્શાવે છે કે સત્તાનો અંતિમ સ્ત્રોત "અમે, ભારતના લોકો" છીએ.',
      limits: 'આમુખ બંધારણનો ભાગ છે પરંતુ અદાલતમાં સીધા દાવા માટે સ્વતંત્ર આધાર નથી.',
      example: 'ન્યાયાલયો કાયદાકીય અર્થઘટન વખતે આમુખના આદર્શોને ધ્યાનમાં રાખે છે.',
    }
  },
  {
    keys: [
      'મને કોઈ મારે', 'કોઈ મારે', 'મારે સુ કરવું', 'શારીરિક હિંસા', 'હુમલો', 'મારપીટ',
      'કોઈ માર મારે', 'ધમકી', 'मारपीट', 'कोई मारे', 'शारीरिक हिंसा', 'assault', 'beaten',
      'attack', 'violence', 'police'
    ],
    articleId: 'article-21',
    en: {
      direct: 'Under Article 21 of the Constitution, every person has the fundamental right to protection of life and personal liberty, which includes security of the person against physical violence and unlawful force.',
      simple: 'If someone hits, assaults, or threatens you, it is an offense against your bodily safety and personal liberty. Immediate remedies include calling 112 (National Emergency Number) and registering a First Information Report (FIR) at the nearest police station under criminal law. If the police refuse to register an FIR, you have the right to approach the Superintendent of Police or file a complaint before a Judicial Magistrate, or seek constitutional protection from the High Court under Article 226.',
      limits: 'While the Constitution guarantees personal liberty against arbitrary state action, protection against private assault is primarily enforced through criminal statutes (BNS / IPC and CrPC / BNSS) and police machinery. The state cannot use excessive or unlawful force against citizens.',
      example: 'If an individual is assaulted in public or at home, they can immediately seek medical attention, obtain a medical report (MLC), and lodge an FIR. In cases of police brutality or unlawful detention, a writ petition under Article 226 or Article 32 can be filed.',
    },
    hi: {
      direct: 'संविधान के अनुच्छेद 21 के अंतर्गत प्रत्येक व्यक्ति को जीवन और दैहिक स्वतंत्रता का मौलिक अधिकार प्राप्त है, जिसमें किसी भी प्रकार की शारीरिक हिंसा या गैरकानूनी हमले से सुरक्षा शामिल है।',
      simple: 'यदि कोई व्यक्ति आपके साथ मारपीट करता है या आपको मारता है, तो यह आपकी शारीरिक सुरक्षा का गंभीर उल्लंघन और संज्ञेय अपराध है। ऐसे में तुरंत 112 (आपातकालीन नंबर) पर कॉल करें और नजदीकी पुलिस थाने में प्रथम सूचना रिपोर्ट (FIR) दर्ज कराएं। यदि पुलिस एफआईआर दर्ज न करे, तो पुलिस अधीक्षक (SP) या न्यायिक मजिस्ट्रेट के समक्ष परिवाद दायर किया जा सकता है, अथवा अनुच्छेद 226 के तहत उच्च न्यायालय में संरक्षण याचिका दायर की जा सकती है।',
      limits: 'संविधान व्यक्तिगत स्वतंत्रता की गारंटी देता है, जबकि निजी व्यक्तियों द्वारा की गई मारपीट पर मुख्य रूप से आपराधिक कानूनों (BNS/IPC) और पुलिस तंत्र द्वारा कार्रवाई की जाती है।',
      example: 'मारपीट की स्थिति में पीड़ित नजदीकी सरकारी अस्पताल से मेडिकल रिपोर्ट (MLC) बनवाकर पुलिस में एफआईआर दर्ज करा सकता है। अवैध हिरासत या पुलिस उत्पीड़न के विरुद्ध अनुच्छेद 32 या 226 के तहत रिट दायर की जा सकती है।',
    },
    gu: {
      direct: 'ભારતીય બંધારણની કલમ 21 હેઠળ દરેક વ્યક્તિને જીવન અને વ્યક્તિગત સ્વાતંત્ર્યનું રક્ષણ મળે છે, જેમાં શારીરિક હિંસા અને ગેરકાયદે બળપ્રયોગ સામે સુરક્ષાનો સમાવેશ થાય છે.',
      simple: 'જો કોઈ વ્યક્તિ તમારા પર શારીરિક હુમલો કરે અથવા તમને મારે, તો તે તમારી શારીરિક સુરક્ષા અને જીવનના અધિકારનું ગંભીર ઉલ્લંઘન છે. તાત્કાલિક પગલાં તરીકે: ૧) તાત્કાલિક ૧૧૨ (ઇમરજન્સી હેલ્પલાઇન) પર કૉલ કરો, ૨) નજીકના પોલીસ સ્ટેશનમાં જઈને એફઆઈઆર (FIR) નોંધાવો, ૩) નજીકની સરકારી હૉસ્પિટલમાં જઈને સારવાર કરાવી મેડિકલ સર્ટિફિકેટ (MLC) મેળવો. જો પોલીસ ફરિયાદ ન લે, તો પોલીસ અધિક્ષક (SP) સમક્ષ અરજી કરી શકાય છે અથવા જ્યુડિશિયલ મેજિસ્ટ્રેટ સમક્ષ કલમ ૧૫૬(૩) હેઠળ ફરિયાદ કરી શકાય છે, તેમજ કલમ ૨૨૬ હેઠળ વડી અદાલતમાં રક્ષણ માંગી શકાય છે.',
      limits: 'બંધારણ વ્યક્તિગત સ્વતંત્રતાની ખાતરી આપે છે, જ્યારે સામાન્ય નાગરિકો દ્વારા થતી મારામારી કે હિંસા અંગે ભારતીય ફોજદારી કાયદા (BNS/IPC અને BNSS/CrPC) હેઠળ પોલીસ અને અદાલત દ્વારા પગલાં લેવાય છે.',
      example: 'જો કોઈ વ્યક્તિ પર જાહેર કે ખાનગી જગ્યાએ હુમલો થાય, તો તે પોલીસ સ્ટેશનમાં એફઆઈઆર કરાવી શકે છે. જો પોલીસ ગેરકાયદે અટકાયત કરે કે સુરક્ષા ન આપે, તો કલમ ૨૨૬ અથવા ૩૨ હેઠળ હાઈકોર્ટ કે સુપ્રીમ કોર્ટમાં હેબિયસ કોર્પસ કે રક્ષણ રિટ કરી શકાય છે.',
    }
  }
];

function formatRetrievedAnswer(question, language, sources) {
  const gujarati = language === 'guj_Gujr';
  const hindi = language === 'hin_Deva';

  if (!sources.length) {
    return {
      status: 'insufficient_sources',
      message: gujarati
        ? 'મને આ પ્રશ્ન માટે બંધારણ સ્ત્રોતમાં સંબંધિત અંશો મળ્યા નથી. કૃપા કરીને કલમ નંબર (દા.ત. કલમ 14, 19, 21, 32) અથવા વધુ ચોક્કસ પ્રશ્ન સાથે પ્રયાસ કરો.'
        : hindi
          ? 'मुझे इस प्रश्न के लिए संविधान स्रोत में पर्याप्त प्रासंगिक अंश नहीं मिले। कृपया अनुच्छेद संख्या (जैसे अनुच्छेद 14, 19, 21, 32) या अधिक विशिष्ट प्रश्न के साथ पुनः प्रयास करें।'
          : 'I could not find sufficiently relevant passages in the currently imported Constitution source. Try an Article number or a more specific question.',
      citations: [],
    };
  }

  const identifiers = [...new Set(sources.map((item) => item.identifier))];
  const citations = sources.map((item) => ({
    chunkId: item.id,
    identifier: item.identifier,
    pdfPageStart: item.pdfPageStart,
    pdfPageEnd: item.pdfPageEnd,
    contentStatus: item.contentStatus,
    source: { ...SOURCE, pageUrl: `${SOURCE.url}#page=${item.pdfPageStart}` },
  }));

  // Check if query matches any rich constitutional topic
  const normalizedQ = question.toLowerCase();
  const matchedTopic = CONSTITUTIONAL_TOPICS.find((topic) =>
    topic.keys.some((k) => normalizedQ.includes(k.toLowerCase())) ||
    identifiers.some((id) => topic.keys.includes(id.toLowerCase()))
  );

  let directAnswer = '';
  let simpleExplanation = '';
  let limits = '';
  let everydayExample = '';
  const explanationLanguage = gujarati ? 'guj_Gujr' : hindi ? 'hin_Deva' : 'eng_Latn';

  if (matchedTopic) {
    const localized = (gujarati && matchedTopic.gu) ? matchedTopic.gu : (hindi && matchedTopic.hi) ? matchedTopic.hi : matchedTopic.en;
    directAnswer = localized.direct;
    simpleExplanation = localized.simple;
    limits = localized.limits;
    everydayExample = localized.example || '';
  } else {
    // Grounded synthesis from source excerpts
    if (gujarati) {
      directAnswer = `આ પ્રશ્ન માટે બંધારણના નીચેના સ્ત્રોત અંશો સંબંધિત હોઈ શકે છે: ${identifiers.join(', ')}. નીચે મૂળ અંગ્રેજી સ્ત્રોત લખાણ અને તેની કલમ/પાનાની માહિતી જુઓ.`;
      simpleExplanation = 'નીચેનું મૂળ સ્ત્રોત લખાણ અંગ્રેજીમાં છે. આ આપમેળે કાઢેલું લખાણ છે; પ્રકાશન અથવા કાનૂની ઉપયોગ પહેલાં માનવીય ચકાસણી જરૂરી છે.';
      limits = 'આ શૈક્ષણિક માહિતી છે, કાનૂની નિર્ણય કે સલાહ નથી. સંબંધિત જોગવાઈનો અર્થ હકીકતો, સુધારા, અન્ય કાયદા અને ન્યાયિક અર્થઘટન પર આધારિત હોઈ શકે છે.';
    } else if (hindi) {
      directAnswer = `इस प्रश्न के संबंध में भारतीय संविधान के निम्नलिखित प्रावधान प्रासंगिक हैं: ${identifiers.join(', ')}। नीचे उद्धृत मूल संवैधानिक अंश और स्रोत पृष्ठ देखें।`;
      simpleExplanation = 'संविधान के इन प्रावधानों के अनुसार संबंधित अधिकार या प्रशासनिक शक्तियां निर्धारित प्रक्रिया द्वारा लागू होती हैं।';
      limits = 'यह एक शैक्षिक व्याख्या है, विधिक सलाह नहीं। किसी भी प्रावधान का वास्तविक अनुप्रयोग तथ्यों, न्यायिक निर्णयों और लागू कानूनों पर निर्भर करता है।';
    } else {
      directAnswer = `The imported Constitution contains relevant source passages in ${identifiers.join(', ')}. Review the exact excerpts and source-page references below.`;
      simpleExplanation = `These provisions outline the constitutional rules and rights concerning ${identifiers.join(', ')}. They define how powers are exercised and rights are protected under the Constitution of India.`;
      limits = 'This is educational information, not a legal determination or legal advice. Application may depend on facts, amendments, other laws and judicial interpretation.';
    }
  }

  return {
    status: 'grounded',
    answerLanguage: language,
    translationStatus: (gujarati || hindi) ? 'human_authored_educational_summary' : (language === 'eng_Latn' ? 'available' : 'model_generated_when_gemini_configured'),
    explanationLanguage,
    directAnswer,
    whatConstitutionSays: sources.map((item) => ({
      identifier: item.identifier,
      title: item.title,
      text: item.text,
      pdfPageStart: item.pdfPageStart,
      pdfPageEnd: item.pdfPageEnd,
      contentStatus: item.contentStatus,
    })),
    simpleExplanation,
    everydayExample,
    limits,
    relatedProvisions: identifiers,
    citations,
    sourceVersion: SOURCE,
    corpusStatus: SOURCE.status,
    disclaimer: gujarati
      ? 'સમવિધાન AI શૈક્ષણિક માહિતી માટેનું સાધન છે; તે સરકારી સેવા કે કાનૂની સલાહ નથી. વાસ્તવિક પરિસ્થિતિમાં લાગુ પડતો કાયદો હકીકતો અને અદાલતી અર્થઘટન પર આધારિત હોઈ શકે છે. જરૂરી હોય તો લાયક કાનૂની નિષ્ણાતની સલાહ લો.'
      : disclaimer,
  };
}

export function answerQuestion(question, language = 'eng_Latn', retrievedSources = null) {
  const fundamental = /fundamental\s+rights?|મૂળભૂત\s*(અધિકાર|હક)|मौलिक\s*अधिकार|بنیادی\s*حقوق/i.test(question);
  if (fundamental) return fundamentalRightsAnswer(language);
  const sources = retrievedSources || searchChunks(question, 6);
  return formatRetrievedAnswer(question, language, sources);
}

export async function answerQuestionWithProvider(question, language = 'eng_Latn') {
  const fundamental = /fundamental\s+rights?|મૂળભૂત\s*(અધિકાર|હક)|मौलिक\s*अधिकार|بنیادی\s*حقوق/i.test(question);
  if (fundamental) return fundamentalRightsAnswer(language);

  const searchQuestion = await translateQuestionForRetrieval({ question, language });
  let sources = [];
  let retrievalMode = 'local_keyword_search';
  try {
    sources = await searchAtlasChunks(searchQuestion, 8);
    if (sources.length) retrievalMode = 'atlas_vector_search';
  } catch {
    // A missing/unready Atlas index must not prevent local source retrieval.
  }
  if (!sources.length) sources = searchChunks(searchQuestion, 8);
  const fallback = formatRetrievedAnswer(question, language, sources);
  if (fallback.status !== 'grounded') return fallback;

  // Attempt live generation with Gemini if configured
  try {
    const generated = await generateGroundedExplanation({
      question,
      language,
      sources: fallback.whatConstitutionSays,
    });
    if (generated && generated.directAnswer) {
      return {
        ...fallback,
        ...generated,
        generationStatus: 'generated',
        retrievalMode,
      };
    }
  } catch {
    // Retain fallback knowledge synthesis
  }

  return {
    ...fallback,
    generationStatus: 'source_only_fallback',
    retrievalMode,
  };
}

export function situationAnswer(description, language = 'eng_Latn') {
  const gujarati = language === 'guj_Gujr';
  const hindi = language === 'hin_Deva';

  let sources = searchChunks(description, 6);
  if (!sources.length) {
    const lower = description.toLowerCase();
    if (lower.includes('મારે') || lower.includes('હુમલો') || lower.includes('मारपीट') || lower.includes('attack') || lower.includes('violence') || lower.includes('beaten') || lower.includes('કોઈ મારે')) {
      sources = searchChunks('Article 21 life personal liberty protection', 6);
    }
  }

  const base = answerQuestion(description, language, sources.length ? sources : null);
  const potential = base.citations?.map((citation) => citation.identifier) ?? [];
  return {
    ...base,
    type: 'educational_situation',
    potentialProvisions: potential.length ? potential : ['Article 21', 'Article 22', 'Article 32'],
    why: gujarati
      ? 'આ જોગવાઈઓ સંબંધિત હોઈ શકે છે: કૃત્ય કોણે કર્યું, સ્થળ, ચોક્કસ આચરણ અને લાગુ પડતો કાયદો. આ કોઈ વ્યક્તિ કે સંસ્થાએ ગેરકાયદે કૃત્ય કર્યું હોવાનો અંતિમ નિર્ણય નથી.'
      : hindi
        ? 'ये प्रावधान इस आधार पर प्रासंगिक हो सकते हैं कि कार्रवाई किसने की, स्थान क्या था, और लागू कानून क्या है। यह कोई अंतिम विधिक निष्कर्ष नहीं है।'
        : 'These provisions may be relevant depending on who acted, the place, the precise conduct, and applicable law. This is not a conclusion that any person or institution acted unlawfully.',
    missingFacts: gujarati
      ? [
          'આ પ્રતિબંધ કે શારીરિક હુમલો કોણે કર્યો (સરકારી અધિકારી, પોલીસ કે ખાનગી વ્યક્તિ)?',
          'શું આ ઘટના જાહેર સ્થળે બની હતી કે બંધારણીય જોગવાઈ હેઠળ આવે છે?',
          'વાસ્તવમાં શું બન્યું અથવા કહેવાયું, અને તેનો કાનૂની આધાર શું હતો?',
        ]
      : hindi
        ? [
            'यह प्रतिबंध या हमला किसने किया (सरकारी अधिकारी, पुलिस या कोई निजी व्यक्ति)?',
            'क्या यह घटना सार्वजनिक स्थान पर हुई अथवा संवैधानिक दायरे में आती है?',
            'वास्तव में क्या घटित हुआ अथवा कहा गया, और उसका विधिक आधार क्या था?',
          ]
        : [
            'Who imposed the restriction?',
            'Was the place public or covered by the constitutional text?',
            'What exactly was said or done, and on what basis?',
          ],
    nextStep: gujarati
      ? 'વાસ્તવિક વિવાદ અથવા શારીરિક હુમલાના કિસ્સામાં, તાત્કાલિક પોલીસ સહાય (112), એફઆઈઆર અથવા લાયક વકીલની કાનૂની સલાહ લો.'
      : hindi
        ? 'वास्तविक विवाद या शारीरिक हमले की स्थिति में, तत्काल पुलिस सहायता (112), एफआईआर दर्ज कराने या योग्य अधिवक्ता से विधिक सलाह लेने पर विचार करें।'
        : 'For a real dispute, consider qualified legal advice or an appropriate official resource.',
    disclaimer: gujarati
      ? 'સમવિધાન AI શૈક્ષણિક માહિતી માટેનું સાધન છે; તે સરકારી સેવા કે કાનૂની સલાહ નથી. વાસ્તવિક પરિસ્થિતિમાં લાગુ પડતો કાયદો હકીકતો અને અદાલતી અર્થઘટન પર આધારિત હોઈ શકે છે. જરૂરી હોય તો લાયક કાનૂની નિષ્ણાતની સલાહ લો.'
      : disclaimer,
  };
}
