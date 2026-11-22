# Security

The API uses Helmet, CORS allow-listing, bounded JSON bodies, Zod validation, rate limiting, and generic client errors. It does not log prompts or secrets. Deploy with HTTPS, strict production CORS, secure/httpOnly cookies, strong separate JWT secrets, database network restrictions, dependency scanning, monitoring, and audit logging for all editorial/destructive actions.

Treat source text as untrusted input during ingestion; sanitize rendered rich text and never pass user instructions as authority over system/retrieval rules. Validate every generated citation against retrieved chunk IDs. In production, restrict RAG to human-reviewed/published chunks; the current machine-extracted corpus is explicitly labelled pending human review and must not be treated as legally approved.
