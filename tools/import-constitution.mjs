import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const textPath = path.resolve(process.argv[2] || path.join(ROOT, 'data', 'constitution.txt'));
const pdfPath = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, 'data', 'constitution-official.pdf');
const outputPath = path.join(ROOT, 'apps', 'api', 'src', 'generated-corpus.json');
const DOCUMENT_DATE = process.env.CONSTITUTION_DOCUMENT_DATE || '2026-09-10';
const SOURCE_URL = 'https://www.legislative.gov.in/static/uploads/2025/08/b9a933fb88c0a5afba254256bc55a3f0.pdf';

function normaliseLines(value, { preserveHeadings = false } = {}) {
  const lines = value.replaceAll('\r', '').replaceAll('\f', '\n\f\n').split('\n');
  const output = [];
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed || trimmed === '\f') {
      if (output.length && output.at(-1) !== '') output.push('');
      continue;
    }
    if (trimmed === 'THE CONSTITUTION OF INDIA' || /^\(Part [^)]+\)$/.test(trimmed)) continue;
    if (/^\d+\s+THE CONSTITUTION OF INDIA$/.test(trimmed)) continue;
    if (/^\d{1,3}$/.test(trimmed) && (lines[index + 1]?.trim() === '\f' || lines[index - 1]?.trim() === '\f')) continue;
    if (/^PART\s+[IVXLC]+$/i.test(trimmed)) continue;
    if (!preserveHeadings && new Set(['General', 'Right to Equality', 'Right to Freedom', 'Right against Exploitation', 'Right to Freedom of Religion', 'Cultural and Educational Rights', 'Right to Constitutional Remedies', 'Directive Principles of State Policy', 'Fundamental Duties', 'The Union', 'The President', 'The Council of Ministers', 'The Parliament', 'The Supreme Court', 'The Governor', 'The State Legislature', 'High Courts', 'Subordinate Courts', 'Panchayats', 'Municipalities', 'Relations between the Union and the States', 'Finance, Property, Contracts and Suits', 'Trade, Commerce and Intercourse within the Territory of India', 'Services under the Union and the States', 'Tribunals', 'Elections', 'Special Provisions Relating to Certain Classes', 'Official Language', 'Emergency Provisions', 'Miscellaneous', 'Amendment of the Constitution', 'Temporary, Transitional and Special Provisions', 'Short Title, Commencement, Authoritative Text in Hindi and Repeals']).has(trimmed)) continue;
    if (!preserveHeadings && trimmed.length < 100 && /^[A-Z][A-Z\s,;()'’.-]+$/.test(trimmed) && trimmed === trimmed.toUpperCase()) continue;
    output.push(trimmed);
  }
  while (output[0] === '') output.shift();
  while (output.at(-1) === '') output.pop();
  return output.join('\n');
}

function pageAt(text, offset) {
  return text.slice(0, offset).split('\f').length;
}

function splitChunks(article, parentId, parentType, identifier, title, pageStart, pageEnd) {
  const clauseGroups = [];
  let currentLines = [];
  let currentRefs = [];
  let parentClause = null;
  const pushGroup = () => {
    if (currentLines.length) clauseGroups.push({ text: currentLines.join('\n').trim(), refs: currentRefs });
    currentLines = [];
    currentRefs = [];
  };

  for (const line of article.split('\n')) {
    const marker = /^\[?\s*\((\d{1,2}[A-Z]?|[a-z])\)/i.exec(line);
    if (marker && currentLines.length) pushGroup();
    if (marker) {
      const reference = marker[1];
      if (/^\d/.test(reference)) {
        parentClause = reference;
        currentRefs = [reference];
      } else {
        currentRefs = [...new Set([...(parentClause ? [parentClause] : []), reference.toLowerCase()])];
      }
    }
    currentLines.push(line);
  }
  pushGroup();
  if (!clauseGroups.length) clauseGroups.push({ text: article, refs: [] });

  const pieces = [];
  for (const group of clauseGroups) {
    const lines = group.text.split('\n');
    let buffer = [];
    let size = 0;
    for (const line of lines) {
      if (size + line.length + 1 > 1800 && buffer.length) {
        pieces.push({ text: buffer.join('\n').trim(), refs: group.refs });
        buffer = [];
        size = 0;
      }
      if (line.length > 1800) {
        if (buffer.length) pieces.push({ text: buffer.join('\n').trim(), refs: group.refs });
        buffer = [];
        for (let index = 0; index < line.length; index += 1800) pieces.push({ text: line.slice(index, index + 1800), refs: group.refs });
        size = 0;
      } else {
        buffer.push(line);
        size += line.length + 1;
      }
    }
    if (buffer.length) pieces.push({ text: buffer.join('\n').trim(), refs: group.refs });
  }

  return pieces.map((piece, index) => {
    const references = new Set(piece.refs);
    for (const match of piece.text.matchAll(/\((\d{1,2}[A-Z]?)\)|\(([a-z])\)/g)) {
      references.add(match[1] || match[2]);
    }
    return {
      id: `${parentId}-chunk-${index + 1}`,
      parentId,
      parentType,
      ...(parentType === 'article' ? { articleId: parentId } : { sectionId: parentId }),
      identifier,
      title,
      chunkIndex: index,
      text: piece.text,
      clauseReferences: [...references],
      pdfPageStart: pageStart,
      pdfPageEnd: pageEnd,
      contentStatus: 'machine_extracted_pending_human_review',
      sourceVersion: DOCUMENT_DATE,
    };
  });
}

async function main() {
  const sourceText = await readFile(textPath, 'utf8');
  const startMatch = /^ {4,15}1\.\s+Name and territory of the Union\./m.exec(sourceText);
  if (!startMatch) throw new Error('Could not locate the start of the Article text. Check the extracted PDF text.');
  const bodyStart = startMatch.index;
  const repeals = /^ {4,15}395\.\s+Repeals\.—/m.exec(sourceText.slice(bodyStart));
  if (!repeals) throw new Error('Could not locate Article 395. The source may be a different edition or extraction format.');
  const after395 = bodyStart + repeals.index;
  const scheduleHeading = sourceText.indexOf('FIRST SCHEDULE', after395);
  if (scheduleHeading < 0) throw new Error('Could not locate the Schedules after Article 395.');
  const schedulePageBreak = sourceText.lastIndexOf('\f', scheduleHeading);
  const scheduleStart = schedulePageBreak > after395 ? schedulePageBreak : scheduleHeading;
  const body = sourceText.slice(bodyStart, scheduleStart);
  const articlePattern = /^ {4,15}\[?(\d{1,3}[A-Z]?)\.\s+([\s\S]{3,}?\.\s*)(?:—|–|-){1,2}/gm;
  const matches = [...body.matchAll(articlePattern)];
  if (matches.length < 300) throw new Error(`Only ${matches.length} Article headings found; refusing to publish a partial corpus.`);

  const articles = [];
  const chunks = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const number = match[1];
    const identifier = `Article ${number}`;
    const title = match[2].replace(/\s+/g, ' ').replace(/[–—]+$/, '').trim();
    const end = matches[index + 1]?.index ?? body.length;
    let text = normaliseLines(body.slice(match.index + match[0].length, end));
    const pageStart = pageAt(sourceText, bodyStart + match.index);
    const pageEnd = Math.max(pageStart, pageAt(sourceText, bodyStart + Math.max(match.index + match[0].length, end - 1)));
    const finalLine = text.split('\n').at(-1)?.trim();
    if (/^\d{1,3}$/.test(finalLine || '') && [pageEnd - 31, pageEnd - 32].includes(Number(finalLine))) {
      text = text.split('\n').slice(0, -1).join('\n').trimEnd();
    }
    const id = `article-${number.toLowerCase()}`;
    const articleChunks = splitChunks(text, id, 'article', identifier, title, pageStart, pageEnd);
    chunks.push(...articleChunks);
    articles.push({
      id,
      identifier,
      number,
      title,
      text,
      pdfPageStart: pageStart,
      pdfPageEnd: pageEnd,
      chunkIds: articleChunks.map((chunk) => chunk.id),
      clauseReferences: [...new Set(articleChunks.flatMap((chunk) => chunk.clauseReferences))],
      contentStatus: 'machine_extracted_pending_human_review',
      sourceVersion: DOCUMENT_DATE,
      ...(/^Omitted(?:\s|$)/.test(text.trim()) ? { provisionStatus: 'omitted_in_source' } : {}),
    });
  }

  // Article 2A is printed as an omitted provision inside the Article 2 text rather than as a standalone heading.
  const omitted2A = /\[2A\.\s+\[Sikkim to be associated with the Union\.\]\.—Omitted by[\s\S]{0,200}?\(w\.e\.f\. 26-4-1975\)\.\]/.exec(body);
  if (omitted2A && !articles.some((article) => article.number === '2A')) {
    const id = 'article-2a';
    const identifier = 'Article 2A';
    const title = 'Sikkim to be associated with the Union (omitted)';
    const text = omitted2A[0].replace(/^\[2A\.\s+/, '').replace(/\]$/, '');
    const page = pageAt(sourceText, bodyStart + omitted2A.index);
    const chunk = {
      id: `${id}-chunk-1`, articleId: id, identifier, title, chunkIndex: 0, text,
      clauseReferences: [], pdfPageStart: page, pdfPageEnd: page,
      contentStatus: 'machine_extracted_pending_human_review', sourceVersion: DOCUMENT_DATE,
    };
    chunks.push(chunk);
    articles.push({
      id, identifier, number: '2A', title, text, pdfPageStart: page, pdfPageEnd: page,
      chunkIds: [chunk.id], clauseReferences: [], contentStatus: 'machine_extracted_pending_human_review',
      sourceVersion: DOCUMENT_DATE, provisionStatus: 'omitted_in_source',
    });
  }

  const supplementaryTail = sourceText.slice(scheduleStart);
  const scheduleNames = 'FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH';
  const schedulePattern = new RegExp(`^[ \\t\\f]*\\[?[ \\t]*(${scheduleNames})[ \\t]+SCHEDULE\\b`, 'gm');
  const appendixPattern = /^[ \t\f]*APPENDIX[ \t]+(I{1,3}|II|III)\b/gm;
  const markers = [
    ...[...supplementaryTail.matchAll(schedulePattern)].map((match) => ({ index: match.index, kind: 'schedule', name: match[1] })),
    ...[...supplementaryTail.matchAll(appendixPattern)].map((match) => ({ index: match.index, kind: 'appendix', name: match[1] })),
  ].sort((a, b) => a.index - b.index);
  const scheduleOrder = ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH'];
  const scheduleTitles = {
    FIRST: 'States and Union Territories',
    SECOND: 'Emoluments, allowances and provisions for constitutional offices',
    THIRD: 'Forms of Oaths or Affirmations',
    FOURTH: 'Allocation of seats in the Council of States',
    FIFTH: 'Administration and Control of Scheduled Areas and Scheduled Tribes',
    SIXTH: 'Administration of Tribal Areas in Assam, Meghalaya, Tripura and Mizoram',
    SEVENTH: 'Union List, State List and Concurrent List',
    EIGHTH: 'Languages',
    NINTH: 'Validation of certain Acts and Regulations',
    TENTH: 'Disqualification on ground of defection',
    ELEVENTH: 'Powers, authority and responsibilities of Panchayats',
    TWELFTH: 'Powers, authority and responsibilities of Municipalities',
  };
  const appendixTitles = {
    I: 'The Constitution (One Hundredth Amendment) Act, 2015',
    II: 'The Constitution (Application to Jammu and Kashmir) Order, 2019',
    III: 'Declaration under Article 370(3) of the Constitution',
  };
  const sections = [];
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const nextIndex = markers[index + 1]?.index ?? supplementaryTail.length;
    const rawSection = supplementaryTail.slice(marker.index, nextIndex);
    let text = normaliseLines(rawSection, { preserveHeadings: true });
    const pageStart = pageAt(sourceText, scheduleStart + marker.index);
    const pageEnd = Math.max(pageStart, pageAt(sourceText, scheduleStart + Math.max(marker.index, nextIndex - 1)));
    const finalLine = text.split('\n').at(-1)?.trim();
    if (/^\\d{1,3}$/.test(finalLine || '') && [pageEnd - 31, pageEnd - 32].includes(Number(finalLine))) {
      text = text.split('\n').slice(0, -1).join('\n').trimEnd();
    }
    const isSchedule = marker.kind === 'schedule';
    const label = isSchedule
      ? `${marker.name[0]}${marker.name.slice(1).toLowerCase()} Schedule`
      : `Appendix ${marker.name}`;
    const id = isSchedule ? `schedule-${marker.name.toLowerCase()}` : `appendix-${marker.name.toLowerCase()}`;
    const identifier = label;
    const title = isSchedule ? scheduleTitles[marker.name] : appendixTitles[marker.name];
    const sectionChunks = splitChunks(text, id, marker.kind, identifier, title, pageStart, pageEnd);
    chunks.push(...sectionChunks);
    sections.push({
      id,
      kind: marker.kind,
      identifier,
      title,
      text,
      pdfPageStart: pageStart,
      pdfPageEnd: pageEnd,
      chunkIds: sectionChunks.map((chunk) => chunk.id),
      contentStatus: 'machine_extracted_pending_human_review',
      sourceVersion: DOCUMENT_DATE,
      ...(marker.kind === 'schedule' ? { scheduleNumber: scheduleOrder.indexOf(marker.name) + 1 } : { appendixNumber: marker.name }),
    });
  }

  articles.sort((a, b) => Number.parseInt(a.number, 10) - Number.parseInt(b.number, 10) || a.number.localeCompare(b.number));
  if (new Set(articles.map((article) => article.id)).size !== articles.length) throw new Error('Duplicate Article IDs found.');

  let sha256 = null;
  try {
    const pdf = await readFile(pdfPath);
    sha256 = createHash('sha256').update(pdf).digest('hex');
  } catch {
    // A PDF hash is optional when only a text extract is available.
  }
  const pageCount = sourceText.split('\f').length - 1;
  const corpus = {
    source: {
      name: 'Constitution of India',
      publisher: 'Legislative Department, Ministry of Law and Justice, Government of India',
      edition: 'Sixth pocket-size edition (diglot)',
      version: `As on ${new Date(`${DOCUMENT_DATE}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`,
      documentDate: DOCUMENT_DATE,
      retrievedAt: new Date().toISOString().slice(0, 10),
      url: SOURCE_URL,
      sha256,
      pdfPages: pageCount,
      amendmentsIncorporated: 'Up to the Constitution (One Hundred and Sixth Amendment) Act, 2023, as stated in the source preface.',
      language: 'English text from the official diglot edition',
      extraction: 'PDF text extracted with Poppler pdftotext -layout; machine extracted and pending human review.',
      status: 'official_source_machine_extracted_pending_human_review',
      demo: false,
    },
    articles,
    chunks,
    sections,
    stats: { articleRecords: articles.length, scheduleRecords: sections.filter((section) => section.kind === 'schedule').length, appendixRecords: sections.filter((section) => section.kind === 'appendix').length, chunks: chunks.length, pdfPages: pageCount },
  };
  await writeFile(outputPath, JSON.stringify(corpus), 'utf8');
  console.log(`Imported ${articles.length} Article records and ${chunks.length} chunks from ${pageCount} PDF pages.`);
  console.log(`Output: ${path.relative(ROOT, outputPath)}`);
  console.log('Status: machine extracted; human review still required.');
}

main().catch((error) => {
  console.error(`Constitution import failed: ${error.message}`);
  process.exitCode = 1;
});
