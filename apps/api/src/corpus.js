import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const corpusPath = new URL('./generated-corpus.json', import.meta.url);
const corpus = JSON.parse(readFileSync(fileURLToPath(corpusPath), 'utf8'));

const stopWords = new Set([
  'a', 'about', 'after', 'again', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'between', 'both', 'but', 'by', 'can',
  'could', 'did', 'do', 'does', 'for', 'from', 'had', 'has', 'have', 'how', 'i', 'in',
  'into', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our', 'should', 'that',
  'the', 'their', 'them', 'there', 'these', 'they', 'this', 'to', 'under', 'was',
  'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'would', 'you', 'article', 'constitution', 'india',
  'your', 'શું', 'મારા', 'મારી', 'મને', 'છે', 'કે', 'અને', 'માં', 'का', 'की', 'के',
  'क्या', 'है', 'मेरा', 'मेरे', 'और', 'में', 'کو', 'کیا', 'ہے', 'اور',
]);

export const SOURCE = Object.freeze(corpus.source);
export const corpusStats = Object.freeze(corpus.stats);
export const supplementarySections = (corpus.sections || []).map((section) => ({ ...section, source: SOURCE }));
export const provisions = corpus.articles.map((article) => ({
  ...article,
  source: SOURCE,
  keywords: tokenize(`${article.identifier} ${article.title} ${article.text}`),
}));
export const chunks = corpus.chunks.map((chunk) => ({ ...chunk, source: SOURCE }));

export function tokenize(value) {
  return String(value)
    .toLocaleLowerCase()
    .normalize('NFKC')
    .match(/[\p{L}\p{N}]+/gu)?.filter((word) => word.length > 1 && !stopWords.has(word)) ?? [];
}

export function parseIdentifier(value) {
  const match = String(value)
    .trim()
    .match(/^(?:article|કલમ|અનુચ્છેદ|अनुच्छेद|दफा)?\s*(\d{1,3}[A-Z]?(?:\(\d+\)(?:\([a-z]\))?)?)$/i);
  return match ? `Article ${match[1].toUpperCase()}` : null;
}

function directArticleId(query) {
  const parsed = parseIdentifier(query);
  if (parsed) {
    const number = parsed.replace(/^Article\s+/i, '').match(/^(\d{1,3}[a-z]?)/i)?.[1];
    return number ? `article-${number.toLowerCase()}` : null;
  }
  const sentenceMatch = String(query).match(/(?:article|કલમ|અનુચ્છેદ|अनुच्छेद|दफा)\s*(\d{1,3}[a-z]?)/i);
  if (sentenceMatch) {
    return `article-${sentenceMatch[1].toLowerCase()}`;
  }
  return null;
}

// Query aliases are retrieval hints only. They are never shown as constitutional text.
const aliases = [
  { terms: ['equality', 'equal before law', 'discrimination', 'સમાનતા', 'કાયદા સમક્ષ સમાનતા', 'ભેદભાવ', 'સમાન અધિકાર', 'समानता', 'बराबरी', 'विभेद', 'भेदभाव', 'مساوات'], add: ['equality equal discrimination prohibition article 14 article 15 article 16'] },
  { terms: ['fundamental rights', 'મૂળભૂત અધિકારો', 'મૂળભૂત અધિકાર', 'मौलिक अधिकार', 'بنیادی حقوق'], add: ['part iii fundamental rights article 14 article 19 article 21 article 32'] },
  { terms: ['freedom of speech', 'વાણી સ્વતંત્રતા', 'વાણીની સ્વતંત્રતા', 'અભિવ્યક્તિની સ્વતંત્રતા', 'અભિવ્યક્તિ', 'બોલવાનો અધિકાર', 'वाक्-स्वतंत्रता', 'अभिव्यक्ति की स्वतंत्रता', 'भाषण'], add: ['freedom speech expression assemble article 19'] },
  { terms: ['untouchability', 'અસ્પૃશ્યતા', 'અસ્પૃશ્યતાનો અંત', 'अस्पृश्यता'], add: ['untouchability abolition article 17'] },
  { terms: ['right to education', 'શિક્ષણનો અધિકાર', 'શિક્ષણ', 'શાળા', 'શિક્ષણનો હક', 'शिक्षा का अधिकार', 'शिक्षा'], add: ['right education free compulsory children article 21a'] },
  { terms: ['right to life', 'જીવનનો અધિકાર', 'જીવન', 'સ્વતંત્રતા', 'જીવવાનો અધિકાર', 'ગોપનીયતા', 'પ્રાઇવસી', 'जीवन का अधिकार', 'प्राण', 'दैहिक स्वतंत्रता', 'निजता'], add: ['life personal liberty fair procedure article 21'] },
  { terms: ['મને કોઈ મારે', 'કોઈ મારે', 'મારે સુ કરવું', 'શારીરિક હિંસા', 'હુમલો', 'મારપીટ', 'કોઈ માર મારે', 'धमकी', 'मारपीट', 'कोई मारे', 'शारीरिक हिंसा', 'assault', 'beaten', 'attack', 'violence'], add: ['protection life personal liberty procedure established law article 21 article 22 article 32'] },
  { terms: ['ધરપકડ', 'પોલીસ', 'અટકાયત', 'ગેરકાયદે ધરપકડ', 'गिरफ्तारी', 'पुलिस', 'हिरासत', 'arrest', 'detention'], add: ['protection against arrest and detention article 22 article 21'] },
  { terms: ['religion', 'ધર્મની સ્વતંત્રતા', 'ધર્મ', 'ધાર્મિક', 'પૂજા', 'અંતરાત્મા', 'धर्म की स्वतंत्रता', 'धार्मिक'], add: ['freedom conscience religion articles 25 26 27 28'] },
  { terms: ['child labour', 'exploitation', 'બાળમજૂરી', 'શોષણ', 'વેઠપ્રથા', 'બાળ મજૂર', 'बाल श्रम', 'शोषण'], add: ['child employment forced labour article 23 24'] },
  { terms: ['remedies', 'writs', 'habeas corpus', 'mandamus', 'બંધારણીય ઉપચાર', 'રિટ', 'સુપ્રીમ કોર્ટ', 'સર્વોચ્ચ અદાલત', 'હાઇકોર્ટ', 'સંવિધાનનો આત્મા', 'संवैधानिक उपचार', 'रिट', 'सुप्रीम कोर्ट'], add: ['remedies enforcement fundamental rights supreme court writs article 32'] },
  { terms: ['fundamental duties', 'મૂળભૂત ફરજો', 'નાગરિક ફરજ', 'ફરજો', 'मौलिक कर्तव्य', 'नागरिक कर्तव्य'], add: ['fundamental duties citizens respect flag anthem environment article 51a'] },
  { terms: ['preamble', 'આમુખ', 'પ્રસ્તાવના', 'અમે ભારતના લોકો', 'સાર્વભૌમ', 'બિનસાંપ્રદાયિક', 'લોકશાહી', 'પ્રજાસત્તાક', 'प्रस्तावना', 'उद्देशिका', 'हम भारत के लोग'], add: ['preamble sovereign socialist secular democratic republic justice liberty equality fraternity'] },
];

function directSectionId(query) {
  const value = String(query).toLocaleLowerCase();
  const scheduleWords = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
  const named = value.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+schedule\b/);
  if (named) return `schedule-${named[1]}`;
  const numbered = value.match(/\bschedule\s+(1[0-2]|[1-9])\b/);
  if (numbered) return `schedule-${scheduleWords[Number(numbered[1]) - 1]}`;
  const appendix = value.match(/\bappendix\s+(i{1,3})\b/);
  if (appendix) return `appendix-${appendix[1]}`;
  return null;
}

function expandedTerms(query) {
  const extra = aliases
    .filter((item) => item.terms.some((term) => query.toLocaleLowerCase().includes(term.toLocaleLowerCase())))
    .flatMap((item) => tokenize(item.add));
  return [...new Set([...tokenize(query), ...extra])];
}

export function searchChunks(query, limit = 8) {
  const terms = expandedTerms(query);
  if (!terms.length) return [];
  const directId = directArticleId(query);
  const directSection = directSectionId(query);
  if (directSection) {
    return chunks.filter((chunk) => chunk.sectionId === directSection).slice(0, limit);
  }
  if (directId) {
    const directChunks = chunks.filter((chunk) => chunk.articleId === directId);
    const clauseMatch = String(query).match(/\((\d+)\)(?:\(([a-z])\))?/i);
    if (clauseMatch) {
      const mainClause = clauseMatch[1];
      const subClause = clauseMatch[2]?.toLowerCase();
      const exact = directChunks.filter((chunk) =>
        chunk.clauseReferences?.includes(mainClause) && (!subClause || chunk.clauseReferences?.includes(subClause)),
      );
      const parent = directChunks.filter((chunk) => chunk.clauseReferences?.includes(mainClause) && !exact.includes(chunk));
      return [...exact, ...parent].slice(0, limit);
    }
    return directChunks.slice(0, limit);
  }
  const phrase = String(query).toLocaleLowerCase().trim();

  const ranked = chunks.map((chunk) => {
    const title = `${chunk.identifier} ${chunk.title}`.toLocaleLowerCase();
    const text = `${title} ${chunk.text}`.toLocaleLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 8;
      const count = text.split(term).length - 1;
      if (count) score += Math.min(6, 1 + Math.log2(count + 1));
    }
    if (phrase.length > 5 && text.includes(phrase)) score += 12;
    if (directId && chunk.articleId === directId) score += 100;
    const clauseMatch = phrase.match(/\((\d+)\)(?:\(([a-z])\))?/i);
    if (directId && clauseMatch && chunk.articleId === directId) {
      if (chunk.clauseReferences?.includes(clauseMatch[1])) score += 12;
      if (clauseMatch[2] && chunk.clauseReferences?.includes(clauseMatch[2].toLowerCase())) score += 4;
    }
    return { ...chunk, score };
  });

  return ranked
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score || a.identifier.localeCompare(b.identifier))
    .slice(0, limit);
}

export function searchCorpus(query, limit = 8) {
  const selected = new Map();
  for (const chunk of searchChunks(query, limit * 2)) {
    if (!selected.has(chunk.articleId)) {
      const article = provisions.find((item) => item.id === chunk.articleId);
      if (article) selected.set(chunk.articleId, { ...article, score: chunk.score });
    }
  }
  return [...selected.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

export function findProvision(identifierOrId) {
  const raw = String(identifierOrId).trim();
  const byId = provisions.find((item) => item.id.toLowerCase() === raw.toLowerCase());
  if (byId) return byId;
  const canonical = parseIdentifier(raw.replace(/-/g, ' '));
  return canonical ? provisions.find((item) => item.identifier === canonical) : null;
}
