# Implementation decisions and deviations from SPEC.md

## Windows-only translation runtime

The original specification selects a self-hosted Python/IndicTrans2 service. The user explicitly chose not to install Python packages, WSL/Linux, or large local model weights and approved a Windows-native cloud alternative. Therefore this delivered Windows configuration uses the existing Node.js backend and Gemini cloud translation/query expansion instead of running IndicTrans2 locally.

Consequences:

- No Python runtime, Python package, WSL, or IndicTrans2 model weights are needed.
- Translation requires the user's backend Gemini API key and is AI-generated, not an official Government translation.
- The all-22-language registry accepts the configured codes, but registration is not proof of equal model quality. Human linguistic/legal review is required before publication.
- The provider boundary can be extended later if a hosted or self-hosted IndicTrans2 endpoint becomes available.

This is an intentional product decision, not a claim that IndicTrans2 is operational in this build.

## Constitution retrieval

The current implementation imports the official English source edition into Article, Schedule and Appendix records. The JSON extraction is machine-generated and pending human review. Local keyword retrieval works without MongoDB. Optional MongoDB Atlas Vector Search uses Gemini embeddings and requires the user to configure Atlas and run the corpus indexer.
