import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, useLocation } from 'react-router-dom';
import './styles.css';
import { t as translateKey, UI_TRANSLATIONS, translateAnswerText, translateTextRobust } from './translations.js';

const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:5000/api/v1');

const LanguageContext = createContext('eng_Latn');
const useLanguage = () => useContext(LanguageContext);
const useT = () => {
  const lang = useLanguage();
  return (key) => translateKey(lang, key);
};

const speechLocale = {
  eng_Latn: 'en-IN',
  guj_Gujr: 'gu-IN',
  hin_Deva: 'hi-IN',
  asm_Beng: 'as-IN', ben_Beng: 'bn-IN', brx_Deva: 'hi-IN',
  doi_Deva: 'doi-IN', kan_Knda: 'kn-IN',
  kas_Arab: 'ks-IN', kas_Deva: 'ks-IN', gom_Deva: 'kok-IN', mai_Deva: 'mai-IN',
  mal_Mlym: 'ml-IN', mni_Mtei: 'mni-IN', mni_Beng: 'mni-IN', mar_Deva: 'mr-IN',
  npi_Deva: 'ne-NP', ory_Orya: 'or-IN', pan_Guru: 'pa-IN', san_Deva: 'sa-IN',
  sat_Olck: 'sat-IN', snd_Arab: 'sd-IN', snd_Deva: 'sd-IN', tam_Taml: 'ta-IN',
  tel_Telu: 'te-IN', urd_Arab: 'ur-IN',
};

export const supportedLanguages = [
  { id: 'english', nativeName: 'English', code: 'eng_Latn', direction: 'ltr' },
  { id: 'gujarati', nativeName: 'ગુજરાતી (Gujarati)', code: 'guj_Gujr', direction: 'ltr' },
  { id: 'hindi', nativeName: 'हिन्दी (Hindi)', code: 'hin_Deva', direction: 'ltr' },
];

const defaultLanguages = supportedLanguages;

function useApi(path) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let active = true;
    fetch(API + path)
      .then((r) => r.json())
      .then((res) => { if (active) setData(res); })
      .catch(() => { if (active) setData({ error: true }); });
    return () => { active = false; };
  }, [path]);
  return data;
}

// Header with Language Dropdown, Professional Highlighted Nav, and Theme Toggle
function Header({ languages, language, setLanguage, dark, setDark }) {
  const t = useT();
  const themeTooltip = dark ? t('Switch to light mode') : t('Switch to dark mode');

  return (
    <header>
      <Link className="brand" to="/">
        <span className="brand-icon">⚖️</span>
        <span>{t('brandName')}</span>
      </Link>
      <nav className="main-nav">
        <NavLink to="/explore" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
          <span className="nav-tab-icon">📖</span>
          <span>{t('Explore')}</span>
        </NavLink>
        <NavLink to="/schedules" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
          <span className="nav-tab-icon">📑</span>
          <span>{t('Schedules')}</span>
        </NavLink>
        <NavLink to="/ask" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
          <span className="nav-tab-icon">✨</span>
          <span>{t('Ask AI')}</span>
        </NavLink>
        <NavLink to="/translate" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
          <span className="nav-tab-icon">🌐</span>
          <span>{t('Translate')}</span>
        </NavLink>
        <NavLink to="/situations" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
          <span className="nav-tab-icon">🏛️</span>
          <span>{t('Situations')}</span>
        </NavLink>
        <NavLink to="/learn" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
          <span className="nav-tab-icon">🎓</span>
          <span>{t('Learn')}</span>
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => (isActive ? 'nav-tab active' : 'nav-tab')}>
          <span className="nav-tab-icon">ℹ️</span>
          <span>{t('About')}</span>
        </NavLink>
      </nav>
      <div className="header-controls">
        <select
          aria-label={t('Select language')}
          title={t('Select language')}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="header-lang-select"
        >
          {supportedLanguages.map((x) => (
            <option key={x.code} value={x.code}>
              {x.nativeName}
            </option>
          ))}
        </select>
        <button
          className="theme-toggle-btn"
          onClick={() => setDark(!dark)}
          aria-label={themeTooltip}
          title={themeTooltip}
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}

// Landing / Home Page
function Landing({ languages }) {
  const t = useT();
  return (
    <main>
      <section className="hero">
        <span className="eyebrow">{t('heroEyebrow')}</span>
        <h1>
          {t('heroTitle1')}
          <br />
          {t('heroTitle2')}
        </h1>
        <p>{t('heroSubtitle')}</p>
        <div className="actions">
          <Link className="button" to="/explore">
            {t('exploreButton')}
          </Link>
          <Link className="button secondary" to="/ask">
            {t('askButton')}
          </Link>
        </div>
      </section>

      <section>
        <h2>{t('featuresHeading')}</h2>
        <div className="grid">
          {[
            [t('cardAskTitle'), t('cardAskDesc')],
            [t('cardExploreTitle'), t('cardExploreDesc')],
            [t('cardSchedulesTitle'), t('cardSchedulesDesc')],
            [t('cardSituationsTitle'), t('cardSituationsDesc')],
            [t('cardLanguagesTitle'), t('cardLanguagesDesc')],
          ].map(([title, desc]) => (
            <article className="card" key={title}>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>{t('howItWorksHeading')}</h2>
        <p className="card" style={{ fontSize: '1.05rem', fontWeight: 500 }}>
          {t('howItWorksSteps')}
        </p>
      </section>

      <section>
        <h2>{t('coverageHeading')}</h2>
        <div className="chips">
          {languages?.map((l) => (
            <span key={l.code}>{l.nativeName}</span>
          ))}
        </div>
      </section>

      <section className="notice">
        <strong>{t('transparencyHeading')}</strong> {t('transparencyText')}
      </section>
    </main>
  );
}

// Article Explorer
function Explorer() {
  const t = useT();
  const data = useApi('/provisions');
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () =>
      data?.items?.filter((p) =>
        (p.identifier + ' ' + p.title + ' ' + (p.text || '')).toLowerCase().includes(q.toLowerCase())
      ),
    [data, q]
  );

  return (
    <main>
      <h1>{t('explorerTitle')}</h1>
      <p>{t('explorerSubtitle')}</p>
      {data?.stats && (
        <p className="chips-label">
          {data.stats.articleRecords} {t('cardExploreTitle')} · {data.stats.chunks} {t('cardAskDesc')} · {data.stats.pdfPages} PDF pages
        </p>
      )}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('searchProvisionsPlaceholder')}
        aria-label={t('explorerTitle')}
      />
      {!data ? (
        <p>{t('loadingProvisions')}</p>
      ) : (
        <div className="grid" style={{ marginTop: '20px' }}>
          {filtered?.slice(0, 36).map((p) => (
            <article className="card" key={p.id}>
              <h3>{p.identifier}: {p.title}</h3>
              <p style={{ fontSize: '0.9rem' }}>
                PDF pages {p.pdfPageStart}{p.pdfPageEnd && p.pdfPageEnd !== p.pdfPageStart ? `–${p.pdfPageEnd}` : ''}
              </p>
              <Link className="button secondary" style={{ padding: '6px 14px', fontSize: '0.88rem' }} to={'/articles/' + p.id}>
                {t('openSourceView')}
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

// Article Single View
function Article() {
  const t = useT();
  const id = useLocation().pathname.split('/').pop();
  const p = useApi('/provisions/' + id);

  if (!p) return <main><p>{t('loadingProvisions')}</p></main>;
  if (p.code || p.error) {
    return (
      <main>
        <h1>Not found</h1>
        <p>{p.message || 'This provision could not be found.'}</p>
        <Link to="/explore">{t('backToArticles')}</Link>
      </main>
    );
  }

  return (
    <main>
      <Link to="/explore" style={{ display: 'inline-block', marginBottom: '14px' }}>
        {t('backToArticles')}
      </Link>
      <span className="eyebrow">{p.contentStatus} · {p.source?.version}</span>
      <h1>{p.identifier}: {p.title}</h1>
      <section className="card">
        <h2>{t('extractedSourceText')}</h2>
        <blockquote style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '1.05rem' }}>
          {p.text}
        </blockquote>
        <p style={{ marginTop: '16px' }}>
          PDF pages {p.pdfPageStart}{p.pdfPageEnd && p.pdfPageEnd !== p.pdfPageStart ? `–${p.pdfPageEnd}` : ''}
        </p>
        <a href={`${p.source.url}#page=${p.pdfPageStart}`} target="_blank" rel="noreferrer" className="button secondary">
          📄 {t('officialSourcePdf')} {p.pdfPageStart}
        </a>
      </section>
      <section className="notice">
        {t('transparencyText')}
      </section>
    </main>
  );
}

// Schedules & Appendices
function Schedules() {
  const t = useT();
  const state = useApi('/schedules');
  const [q, setQ] = useState('');

  if (!state) return <main><p>{t('loadingSchedules')}</p></main>;
  const items = state.items?.filter((item) =>
    `${item.identifier} ${item.title}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <main>
      <h1>{t('schedulesTitle')}</h1>
      <p>{t('schedulesSubtitle')}</p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('searchSchedulesPlaceholder')}
      />
      <div className="grid" style={{ marginTop: '20px' }}>
        {items?.map((item) => (
          <section className="card" key={item.id}>
            <h3>{item.identifier}</h3>
            <p>{item.title}</p>
            <p style={{ fontSize: '0.88rem' }}>PDF pages {item.pdfPageStart}–{item.pdfPageEnd}</p>
            <Link className="button secondary" style={{ padding: '6px 14px', fontSize: '0.88rem' }} to={`/schedules/${item.id}`}>
              {t('openSourceView')}
            </Link>
          </section>
        ))}
      </div>
    </main>
  );
}

// Schedule Single View
function Schedule() {
  const t = useT();
  const id = useLocation().pathname.split('/').filter(Boolean).at(-1);
  const state = useApi(`/schedules/${id}`);

  if (!state) return <main><p>{t('loadingSchedules')}</p></main>;
  if (state.error) return <main><section className="notice">This Schedule could not be found.</section></main>;

  return (
    <main>
      <Link to="/schedules" style={{ display: 'inline-block', marginBottom: '14px' }}>
        {t('backToSchedules')}
      </Link>
      <span className="eyebrow">{state.kind}</span>
      <h1>{state.identifier}</h1>
      <p>{state.title}</p>
      <section className="card">
        <h2>{t('extractedSourceText')}</h2>
        <pre className="source-text" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {state.text}
        </pre>
        <a href={`${state.source.url}#page=${state.pdfPageStart}`} target="_blank" rel="noreferrer" className="button secondary">
          📄 {t('officialSourcePdf')} {state.pdfPageStart}
        </a>
      </section>
    </main>
  );
}

// Ask AI Result Component
function Result({ result, language }) {
  const t = useT();
  const [viewMode, setViewMode] = useState('selected'); // 'selected' or 'source'
  const [copied, setCopied] = useState(false);

  if (!result) return null;
  if (result.status === 'insufficient_sources') {
    const rawMsg = result.message || t('noResultsNotice');
    const localizedMsg = isEnglish ? rawMsg : translateAnswerText(language, rawMsg);
    return <section className="notice">{localizedMsg}</section>;
  }

  const isEnglish = language === 'eng_Latn';

  const renderText = (content) => {
    if (!content) return '';
    if (viewMode === 'source' || isEnglish) return content;
    return translateAnswerText(language, content);
  };

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const lead = renderText(result.directAnswer);
    const simple = renderText(result.simpleExplanation);
    const textToSpeak = `${lead}. ${simple || ''}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = speechLocale[language] || 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = () => {
    const lead = renderText(result.directAnswer);
    const simple = renderText(result.simpleExplanation);
    const limits = renderText(result.limits);
    const example = renderText(result.everydayExample);
    const fullText = [
      lead,
      simple ? `\n\n${t('inSimpleWords')}:\n${simple}` : '',
      limits ? `\n\n${t('limitsAndContext')}:\n${limits}` : '',
      example ? `\n\n${t('everydayExample')}:\n${example}` : '',
      result.citations?.length ? `\n\n${t('sourcesHeading')}:\n${result.citations.map((c) => c.identifier).join(', ')}` : ''
    ].join('');

    navigator.clipboard?.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="result-card">
      <div className="result-header">
        <h2>{t('answerHeading')}</h2>
        {!isEnglish && (
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'selected' ? 'active' : ''}`}
              onClick={() => setViewMode('selected')}
            >
              🌐 {t('selectedLanguage')}
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'source' ? 'active' : ''}`}
              onClick={() => setViewMode('source')}
            >
              📜 {t('officialEnglishSource')}
            </button>
          </div>
        )}
      </div>

      <div className="answer-lead">
        {renderText(result.directAnswer)}
      </div>

      {result.simpleExplanation && (
        <div className="answer-section">
          <h3>💡 {t('inSimpleWords')}</h3>
          <p>{renderText(result.simpleExplanation)}</p>
        </div>
      )}

      {result.limits && (
        <div className="answer-section">
          <h3>⚖️ {t('limitsAndContext')}</h3>
          <p>{renderText(result.limits)}</p>
        </div>
      )}

      {result.everydayExample && (
        <div className="answer-section">
          <h3>🏛️ {t('everydayExample')}</h3>
          <p>{renderText(result.everydayExample)}</p>
        </div>
      )}

      {result.whatConstitutionSays?.length > 0 && (
        <div className="answer-section">
          <h3>📖 {t('extractedSourceText')}</h3>
          {result.whatConstitutionSays.map((item, idx) => (
            <div className="source-item" key={idx}>
              <strong>
                {renderText(item.identifier)} {item.title ? `— ${renderText(item.title)}` : ''}
              </strong>
              <blockquote>{renderText(item.text)}</blockquote>
            </div>
          ))}
        </div>
      )}

      {result.citations?.length > 0 && (
        <div className="answer-section">
          <h3>🔗 {t('sourcesHeading')}</h3>
          <div className="citations-list">
            {result.citations.map((c, i) => (
              <a
                key={i}
                href={c.source?.pageUrl || c.source?.url}
                target="_blank"
                rel="noreferrer"
                className="citation-pill"
              >
                📄 {renderText(c.identifier)} {c.pdfPageStart ? `(p. ${c.pdfPageStart})` : ''}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="result-toolbar">
        <button className="voice-button" onClick={speak} type="button">
          🔊 {t('listenToAnswer')}
        </button>
        <button className="voice-button" onClick={handleCopy} type="button">
          {copied ? t('copied') : `📋 ${t('copyAnswer')}`}
        </button>
      </div>

      <p className="disclaimer">{t('disclaimerText')}</p>
    </section>
  );
}

// Ask AI Main Component
function Ask({ language }) {
  const t = useT();
  const [question, setQuestion] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');

  // Auto re-query in the new language if user switches languages while viewing a result
  useEffect(() => {
    if (lastQuery && !busy) {
      submit(null, lastQuery, language);
    }
  }, [language]);

  const suggestedQuestions = useMemo(() => {
    if (language === 'guj_Gujr') {
      return [
        { label: '⚖️ કલમ 14: સમાનતા', q: 'કલમ 14 હેઠળ કાયદા સમક્ષ સમાનતાનો શું અર્થ છે?' },
        { label: '🗣️ કલમ 19: વાણી સ્વતંત્રતા', q: 'કલમ 19 હેઠળ વાણી અને અભિવ્યક્તિની સ્વતંત્રતા અને તેની મર્યાદાઓ શું છે?' },
        { label: '🛡️ કલમ 21: જીવનનો અધિકાર', q: 'કલમ 21 હેઠળ જીવન અને વ્યક્તિગત સ્વતંત્રતાનું રક્ષણ શું છે?' },
        { label: '🎓 કલમ 21A: શિક્ષણનો અધિકાર', q: 'કલમ 21A હેઠળ શિક્ષણનો મૂળભૂત અધિકાર શું છે?' },
        { label: '📜 આમુખ (Preamble)', q: 'ભારતના બંધારણનું આમુખ શું જાહેર કરે છે?' },
        { label: '🏛️ કલમ 32: બંધારણીય ઉપચાર', q: 'કલમ 32 શું છે અને સુપ્રીમ કોર્ટ કઈ રિટ બહાર પાડી શકે છે?' },
        { label: '🇮🇳 કલમ 51A: મૂળભૂત ફરજો', q: 'કલમ 51A હેઠળ ભારતીય નાગરિકોની મૂળભૂત ફરજો કઈ છે?' },
      ];
    }
    if (language === 'hin_Deva') {
      return [
        { label: '⚖️ अनुच्छेद 14: समानता', q: 'अनुच्छेद 14 के तहत विधि के समक्ष समता का क्या अर्थ है?' },
        { label: '🗣️ अनुच्छेद 19: वाक्-स्वतंत्रता', q: 'अनुच्छेद 19 के तहत वाक्-स्वतंत्रता के अधिकार और उनकी सीमाएं क्या हैं?' },
        { label: '🛡️ अनुच्छेद 21: जीवन का अधिकार', q: 'अनुच्छेद 21 के तहत प्राण और दैहिक स्वतंत्रता का संरक्षण क्या है?' },
        { label: '🎓 अनुच्छेद 21A: शिक्षा का अधिकार', q: 'अनुच्छेद 21A के तहत शिक्षा का मौलिक अधिकार क्या है?' },
        { label: '📜 प्रस्तावना (Preamble)', q: 'भारत के संविधान की प्रस्तावना क्या घोषणा करती है?' },
        { label: '🏛️ अनुच्छेद 32: संवैधानिक उपचार', q: 'अनुच्छेद 32 क्या है और सुप्रीम कोर्ट कौन सी रिट जारी कर सकता है?' },
        { label: '🇮🇳 अनुच्छेद 51A: मौलिक कर्तव्य', q: 'अनुच्छेद 51A के तहत भारतीय नागरिकों के मौलिक कर्तव्य क्या हैं?' },
      ];
    }
    return [
      { label: '⚖️ Equality (Art. 14)', q: 'What does equality before law mean under Article 14?' },
      { label: '🗣️ Speech (Art. 19)', q: 'What are the freedom of speech rights and their limits under Article 19?' },
      { label: '🛡️ Life & Liberty (Art. 21)', q: 'What is the protection of life and personal liberty under Article 21?' },
      { label: '🎓 Education (Art. 21A)', q: 'What is the Right to Education under Article 21A?' },
      { label: '📜 Preamble', q: 'What does the Preamble of the Constitution of India declare?' },
      { label: '🏛️ Remedies (Art. 32)', q: 'What is Article 32 and what writs can the Supreme Court issue?' },
      { label: '🇮🇳 Duties (Art. 51A)', q: 'What are the Fundamental Duties of Indian citizens under Article 51A?' },
    ];
  }, [language]);

  function startVoice() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceMessage(t('voiceUnavailable'));
      return;
    }
    try {
      const recognition = new SpeechRec();
      recognition.lang = speechLocale[language] || 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setVoiceMessage(t('listeningStatus'));
      };
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setQuestion(transcript);
        setVoiceMessage('');
      };
      recognition.onerror = () => {
        setVoiceMessage(t('voiceUnavailable'));
      };
      recognition.onend = () => {
        setListening(false);
      };
      recognition.start();
      window.__samvidhan_rec = recognition;
    } catch {
      setListening(false);
      setVoiceMessage(t('voiceUnavailable'));
    }
  }

  function stopVoice() {
    window.__samvidhan_rec?.stop();
    setListening(false);
  }

  async function submit(e, overrideQ, overrideLang) {
    if (e) e.preventDefault();
    const query = overrideQ || question;
    const targetLang = overrideLang || language;
    if (!query.trim()) return;

    setLastQuery(query);
    setBusy(true);

    try {
      const res = await fetch(API + '/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, language: targetLang, level: 'beginner' }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        status: 'insufficient_sources',
        message: t('noResultsNotice'),
      });
    } finally {
      setBusy(false);
    }
  }

  const handleChipClick = (qText) => {
    setQuestion(qText);
    submit(null, qText);
  };

  return (
    <main>
      <h1>{t('askTitle')}</h1>
      <p>{t('askSubtitle')}</p>

      <div className="ask-container">
        <form onSubmit={submit} className="ask-form">
          <div className="chips-label">{t('suggestedQuestionsHeading')}</div>
          <div className="chips">
            {suggestedQuestions.map((item, idx) => (
              <button
                type="button"
                className="chip-btn"
                key={idx}
                onClick={() => handleChipClick(item.q)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            minLength="3"
            maxLength="4000"
            placeholder={t('askPlaceholder')}
          />

          <div className="form-toolbar">
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                className={`voice-button ${listening ? 'recording' : ''}`}
                onClick={listening ? stopVoice : startVoice}
              >
                <span>{listening ? '⏹' : '🎙'}</span>
                <span>{listening ? t('stopMicrophone') : t('speakQuestion')}</span>
              </button>
              {voiceMessage && <span className="voice-status">{voiceMessage}</span>}
            </div>

            <button className="button" disabled={busy || !question.trim()} type="submit">
              {busy ? t('findingSources') : t('askSubmitButton')}
            </button>
          </div>
        </form>

        <Result result={result} language={language} />
      </div>
    </main>
  );
}

// Translate Studio Component
function Translation({ languages }) {
  const t = useT();
  const [sourceLanguage, setSourceLanguage] = useState('eng_Latn');
  const [targetLanguage, setTargetLanguage] = useState('hin_Deva');
  const [text, setText] = useState('');
  const [translated, setTranslated] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const samples = [
    { label: t('samplePreamble'), text: 'We, the people of India, having solemnly resolved to constitute India into a Sovereign Socialist Secular Democratic Republic and to secure to all its citizens Justice, Liberty, Equality and Fraternity.' },
    { label: t('sampleArt14'), text: 'The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India.' },
    { label: t('sampleArt19'), text: 'All citizens shall have the right to freedom of speech and expression and to assemble peaceably and without arms.' },
    { label: t('sampleArt21'), text: 'No person shall be deprived of his life or personal liberty except according to procedure established by law.' },
    { label: t('sampleArt51A'), text: 'It shall be the duty of every citizen of India to abide by the Constitution and respect its ideals and institutions, the National Flag and the National Anthem.' },
  ];

  const handleSwap = () => {
    const prevSrc = sourceLanguage;
    const prevTgt = targetLanguage;
    setSourceLanguage(prevTgt);
    setTargetLanguage(prevSrc);
    setText(translated);
    setTranslated(text);
  };

  async function submit(e) {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    setBusy(true);
    setError('');
    setTranslated('');

    try {
      const response = await fetch(API + '/translation/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
      });
      const body = await response.json();
      if (!response.ok || !body.translatedText || body.translatedText.startsWith('ભારતનું બંધારણ:') || body.translatedText.startsWith('अनुवाद:')) {
        throw new Error(body?.message || 'Fallback needed');
      }
      setTranslated(body.translatedText);
    } catch {
      const fallbackResult = translateTextRobust(text, sourceLanguage, targetLanguage);
      setTranslated(fallbackResult);
    } finally {
      setBusy(false);
    }
  }

  const speak = () => {
    if (!translated || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(translated);
    utterance.lang = speechLocale[targetLanguage] || 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(translated).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <main>
      <h1>{t('translateTitle')}</h1>
      <p>{t('translateSubtitle')}</p>

      <div className="chips-label">{t('samplePhrasesHeading')}</div>
      <div className="chips">
        {samples.map((s, idx) => (
          <button
            key={idx}
            type="button"
            className="chip-btn"
            onClick={() => {
              setText(s.text);
              setSourceLanguage('eng_Latn');
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit}>
        <div className="translate-studio">
          {/* Source Card */}
          <div className="translate-card">
            <div className="translate-card-header">
              <label>{t('translateFrom')}</label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
              >
                {supportedLanguages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('textToTranslatePlaceholder')}
              maxLength="4000"
              required
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                {text.length} / 4000
              </span>
              {text && (
                <button
                  type="button"
                  className="quiet"
                  onClick={() => setText('')}
                >
                  {t('clearText')}
                </button>
              )}
            </div>
          </div>

          {/* Swap Button */}
          <button
            type="button"
            className="translate-swap-btn"
            onClick={handleSwap}
            title={t('swapLanguages')}
            aria-label={t('swapLanguages')}
          >
            ⇄
          </button>

          {/* Target Card */}
          <div className="translate-card">
            <div className="translate-card-header">
              <label>{t('translateTo')}</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
              >
                {supportedLanguages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </div>
            <div
              className={`translate-output-box ${!translated ? 'placeholder' : ''}`}
            >
              {busy ? t('translating') : (translated || t('textToTranslatePlaceholder'))}
            </div>

            {translated && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button type="button" className="voice-button" onClick={speak}>
                  🔊 {t('listenTranslation')}
                </button>
                <button type="button" className="voice-button" onClick={handleCopy}>
                  {copied ? t('copied') : `📋 ${t('copyTranslation')}`}
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          className="button"
          type="submit"
          disabled={busy || !text.trim() || sourceLanguage === targetLanguage}
          style={{ width: '100%', maxWidth: '300px', margin: '14px auto', display: 'block' }}
        >
          {busy ? t('translating') : t('translateButton')}
        </button>
      </form>

      {error && <p className="notice">{error}</p>}
    </main>
  );
}

// Situations Component
function Situations({ language }) {
  const t = useT();
  const [description, setDescription] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch(API + '/situations/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, language }),
      });
      setResult(await r.json());
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>{t('situationsTitle')}</h1>
      <p>{t('situationsSubtitle')}</p>
      <form onSubmit={submit} className="card">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          minLength="3"
          placeholder={t('situationPlaceholder')}
        />
        <button className="button" disabled={busy} style={{ marginTop: '14px' }}>
          {t('exploreProvisionsButton')}
        </button>
      </form>

      {result && (
        <section className="result-card">
          <Result result={result} language={language} />
          {result.why && (
            <div className="answer-section">
              <h3>⚖️ {language === 'guj_Gujr' ? 'બંધારણીય સંદર્ભ' : language === 'hin_Deva' ? 'संवैधानिक संदर्भ' : 'Constitutional Context'}</h3>
              <p>{language === 'eng_Latn' ? result.why : translateAnswerText(language, result.why)}</p>
            </div>
          )}
          {result.missingFacts?.length > 0 && (
            <div className="answer-section">
              <h3>🔍 {t('factsThatMatter')}</h3>
              <ul>
                {result.missingFacts.map((x, i) => (
                  <li key={i}>{language === 'eng_Latn' ? x : translateAnswerText(language, x)}</li>
                ))}
              </ul>
            </div>
          )}
          {result.nextStep && (
            <div className="answer-section">
              <h3>🏛️ {language === 'guj_Gujr' ? 'વાસ્તવિક પગલાં અને કાનૂની માર્ગદર્શન' : language === 'hin_Deva' ? 'वास्तविक कदम और विधिक मार्गदर्शन' : 'Next Steps & Guidance'}</h3>
              <p>{language === 'eng_Latn' ? result.nextStep : translateAnswerText(language, result.nextStep)}</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

// Guided Learning
function Learning({ language: propLanguage }) {
  const t = useT();
  const contextLanguage = useLanguage();
  const language = propLanguage || contextLanguage || 'eng_Latn';
  const data = useApi('/learning/paths?lang=' + language);
  const quizzes = useApi('/quizzes?lang=' + language);
  const [completed, setCompleted] = useState(() =>
    JSON.parse(localStorage.getItem('samvidhan-completed') || '[]')
  );
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => {
    localStorage.setItem('samvidhan-completed', JSON.stringify(completed));
  }, [completed]);

  if (!data || !quizzes) return <main><p>{t('loadingLearning')}</p></main>;

  const toggle = (id) =>
    setCompleted(completed.includes(id) ? completed.filter((x) => x !== id) : [...completed, id]);
  const quiz = quizzes.items?.[0];

  async function submit(e) {
    e.preventDefault();
    try {
      const response = await fetch(API + '/quizzes/' + quiz.id + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, language }),
      });
      setResult(await response.json());
    } catch {
      setResult({ message: t('quizUnavailable') });
    }
  }

  const durationLabel = t('min');

  return (
    <main>
      <h1>{t('learningTitle')}</h1>
      <p>{t('learningSubtitle')}</p>
      {data.items?.map((path) => (
        <section className="card" key={path.id} style={{ marginBottom: '20px' }}>
          <h2>{translateAnswerText(language, path.title)}</h2>
          <p>{translateAnswerText(language, path.description)} · {path.durationMinutes} {durationLabel}</p>
          {path.lessons.map((lesson) => (
            <article className="source-item" key={lesson.id}>
              <h3>
                {completed.includes(lesson.id) ? '✓ ' : ''}
                {translateAnswerText(language, lesson.title)}
              </h3>
              <p>{translateAnswerText(language, lesson.body)}</p>
              <button className="quiet" onClick={() => toggle(lesson.id)}>
                {completed.includes(lesson.id) ? t('markIncomplete') : t('markComplete')}
              </button>
            </article>
          ))}
        </section>
      ))}

      {quiz && (
        <section className="card">
          <h2>{translateAnswerText(language, quiz.title)}</h2>
          <form onSubmit={submit}>
            {quiz.questions.map((question) => (
              <fieldset key={question.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', margin: '14px 0' }}>
                <legend style={{ fontWeight: 600 }}>{translateAnswerText(language, question.prompt)}</legend>
                {question.options.map((option, index) => (
                  <label key={option} style={{ display: 'block', margin: '8px 0', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      required
                      name={question.id}
                      onChange={() => setAnswers({ ...answers, [question.id]: index })}
                      style={{ width: 'auto', marginRight: '10px' }}
                    />
                    {translateAnswerText(language, option)}
                  </label>
                ))}
              </fieldset>
            ))}
            <button className="button">{t('checkAnswers')}</button>
          </form>
          {result && (
            <section className="notice" style={{ marginTop: '16px' }}>
              <strong>
                {result.score !== undefined ? `${t('score')}: ${result.score}/${result.total}` : translateAnswerText(language, result.message)}
              </strong>
            </section>
          )}
        </section>
      )}
    </main>
  );
}

// Myths Component
function Myths({ language: propLanguage }) {
  const t = useT();
  const contextLanguage = useLanguage();
  const language = propLanguage || contextLanguage || 'eng_Latn';
  const state = useApi('/myths?lang=' + language);
  if (!state) return <main><p>{t('loadingMyths')}</p></main>;

  return (
    <main>
      <h1>{t('mythsTitle')}</h1>
      <div className="grid">
        {state.items?.map((item) => (
          <section className="card" key={item.id}>
            <span className="eyebrow" style={{ color: '#dc2626' }}>❌ {t('myth')}</span>
            <p style={{ fontWeight: 600, fontSize: '1.05rem' }}>{translateAnswerText(language, item.myth)}</p>
            <span className="eyebrow" style={{ color: '#16a34a', marginTop: '12px' }}>✓ {t('fact')}</span>
            <p>{translateAnswerText(language, item.fact)}</p>
          </section>
        ))}
      </div>
    </main>
  );
}

// Amendments Component
function Amendments({ language: propLanguage }) {
  const t = useT();
  const contextLanguage = useLanguage();
  const language = propLanguage || contextLanguage || 'eng_Latn';
  const state = useApi('/amendments?lang=' + language);
  if (!state) return <main><p>{t('loadingAmendments')}</p></main>;

  return (
    <main>
      <h1>{t('amendmentsTitle')}</h1>
      <p>{t('amendmentsSubtitle')}</p>
      <div className="grid">
        {state.items?.map((item) => (
          <section className="card" key={item.id}>
            <h3>{translateAnswerText(language, item.number)} ({item.year})</h3>
            <p>{translateAnswerText(language, item.summary)}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{translateAnswerText(language, item.sourceNote)}</p>
          </section>
        ))}
      </div>
    </main>
  );
}

// Static Info Page
function Static({ title, children }) {
  return (
    <main>
      <h1>{title}</h1>
      <section className="card" style={{ lineHeight: 1.8 }}>
        {children}
      </section>
    </main>
  );
}

// Main App Container
function App() {
  const languageState = useApi('/languages');
  const languages = languageState?.languages || defaultLanguages;

  // Persistent Language State
  const [language, setLanguage] = useState(() => localStorage.language || 'eng_Latn');

  // Persistent Dark / Light Mode State
  const [dark, setDark] = useState(() => {
    if (typeof localStorage !== 'undefined' && localStorage.theme) {
      return localStorage.theme === 'dark';
    }
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply Theme to Document Element
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.theme = dark ? 'dark' : 'light';
  }, [dark]);

  // Apply Language and Direction (LTR/RTL) to Document Element
  const activeLanguage = useMemo(
    () => languages.find((item) => item.code === language || item.alternateCode === language),
    [languages, language]
  );

  useEffect(() => {
    localStorage.language = language;
    document.documentElement.lang = language === 'eng_Latn' ? 'en' : language.split('_')[0];
    document.documentElement.dir = activeLanguage?.direction || 'ltr';
  }, [language, activeLanguage]);

  const route = useLocation().pathname;
  const t = (key) => translateKey(language, key);

  let body = null;
  if (route === '/') body = <Landing languages={languages} />;
  else if (route === '/explore' || route === '/articles') body = <Explorer />;
  else if (route.startsWith('/articles/')) body = <Article />;
  else if (route === '/schedules') body = <Schedules />;
  else if (route.startsWith('/schedules/')) body = <Schedule />;
  else if (route === '/ask') body = <Ask language={language} />;
  else if (route === '/translate') body = <Translation languages={languages} />;
  else if (route === '/situations') body = <Situations language={language} />;
  else if (route === '/learn') body = <Learning language={language} />;
  else if (route === '/myths') body = <Myths language={language} />;
  else if (route === '/amendments') body = <Amendments language={language} />;
  else if (route === '/about') {
    body = (
      <Static title={t('aboutTitle')}>
        <p>{t('aboutText')}</p>
        <p>{t('disclaimerText')}</p>
      </Static>
    );
  } else if (['/privacy', '/terms', '/disclaimer'].includes(route)) {
    body = (
      <Static title={t(route.slice(1).charAt(0).toUpperCase() + route.slice(2))}>
        <p>{t('disclaimerText')}</p>
      </Static>
    );
  } else {
    body = (
      <Static title="Page Not Found">
        <p>This page does not exist. <Link to="/">Return home →</Link></p>
      </Static>
    );
  }

  return (
    <LanguageContext.Provider value={language}>
      <Header
        languages={languages}
        language={language}
        setLanguage={setLanguage}
        dark={dark}
        setDark={setDark}
      />
      {body}
      <footer>
        <div>
          © {new Date().getFullYear()} {t('brandName')} · {t('heroEyebrow')}
        </div>
        <div>
          <Link to="/myths">{t('Myths')}</Link>
          <Link to="/amendments">{t('Amendments')}</Link>
          <Link to="/privacy">{t('Privacy')}</Link>
          <Link to="/terms">{t('Terms')}</Link>
          <Link to="/disclaimer">{t('Disclaimer')}</Link>
        </div>
      </footer>
    </LanguageContext.Provider>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
