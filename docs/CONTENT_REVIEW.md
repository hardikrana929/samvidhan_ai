# Content review and source policy

## Current source corpus

- Publisher: Legislative Department, Ministry of Law and Justice, Government of India.
- Document: Sixth pocket-size edition (diglot), Constitution of India, as on 10 September 2026.
- The source preface states that the edition incorporates amendments through the Constitution (One Hundred and Sixth Amendment) Act, 2023.
- Source PDF: https://www.legislative.gov.in/static/uploads/2025/08/b9a933fb88c0a5afba254256bc55a3f0.pdf
- PDF SHA-256 is recorded in `apps/api/src/generated-corpus.json`.
- Extracted corpus: 481 Article records, all 12 Schedules, all 3 Appendices and 2,165 retrieval passages across the 402-page PDF.
- Current status: `machine_extracted_pending_human_review`.

The publisher/source is official; the JSON extraction is not thereby automatically error-free. Page layout, inserted text, omitted provisions, footnotes, clause boundaries and extracted punctuation must be checked. The app must not call this corpus human-verified or legally reviewed.

## Review workflow

1. Confirm the PDF URL, publisher, edition date and amendment coverage.
2. Compare extracted Article headings and text with the PDF, including inserted and omitted Articles.
3. Check each chunk boundary and page range; ensure footnotes are not presented as operative clauses without context.
4. Have a qualified constitutional-law reviewer examine high-impact topics and all explanatory summaries.
5. Record reviewer identity, review date, source version, changed fields and decision in an audit log before marking any item human-reviewed/published.
6. Preserve old source versions. Never overwrite a source edition silently.
7. Rebuild embeddings after the text or source version changes.

## Content states

- `machine_extracted_pending_human_review`: PDF text extracted by software; not editorially approved.
- `human_reviewed`: a named reviewer has checked source fidelity and metadata.
- `published`: approved for display under the application's publication policy.
- `rejected` / `archived`: excluded from active retrieval.

The current implementation stores the machine-extraction state and displays it. Full reviewer accounts, approvals and audit logs are not yet implemented.

## Fundamental Rights overview

The broad question “What are my Fundamental Rights?” is answered as a six-category educational overview of Part III (Articles 12–35). The answer includes source citations to the actual Articles in the imported corpus. It is a plain-language summary, not a verbatim translation or complete legal interpretation. It explains that the former Article 31 was omitted and that Article 300A is outside Part III. The source text remains controlling.

## Translation and explanation policy

Gemini-generated explanations and translations are not official constitutional translations. The language registry includes all 22 Scheduled Languages and configured script variants, but a registered code is not proof of translation quality. Human linguistic/legal review is required before publishing translations as reviewed educational content.
