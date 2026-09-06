# KrishiMitra AI — Architecture Documentation

## Overview

KrishiMitra AI is a full-stack AI advisory application. It combines:

1. **Retrieval-Augmented Generation (RAG)** to ground answers in trusted agricultural documents
2. **IBM Granite** (via IBM watsonx.ai) as the sole language model for response generation
3. **IBM watsonx.ai Embedding model** (`ibm/slate-125m-english-rtrvr`) for vector generation
4. **ChromaDB** (local persistent) for vector storage and retrieval
5. **FastAPI** as the async REST backend
6. A plain HTML/CSS/JS frontend — no JavaScript build toolchain

---

## Component Map

```
frontend/
  index.html         → Single-page chatbot UI
  css/style.css      → Green/earth-tone responsive stylesheet
  js/app.js          → Fetch calls + structured response rendering

backend/app/
  main.py            → FastAPI app factory; lifespan manages service singletons
  config/settings.py → Pydantic-settings singleton; all env vars centralised here
  utils/logger.py    → Shared logger factory
  models/
    chat.py          → ChatRequest, ChatResponse, RetrievedDocument
    health.py        → HealthStatus
  api/routes/
    chat.py          → POST /api/v1/chat
    health.py        → GET /api/v1/health
  services/
    chat_service.py  → Orchestrates RAG → prompt → Granite → response
  rag/
    document_loader.py → Reads .md/.txt/.pdf files from disk
    chunker.py         → RecursiveCharacterTextSplitter (500 chars, 100 overlap)
    embeddings.py      → WatsonxEmbedder (IBM watsonx.ai embedding API)
    vector_store.py    → ChromaVectorStore (PersistentClient wrapper)
    retriever.py       → KnowledgeRetriever (embed query → ChromaDB search)
    pipeline.py        → RAGPipeline (ingest_directory + retrieve public API)
  ai/
    granite_service.py → GraniteService (IBM Granite generation — sole IBM LLM module)
    prompt_builder.py  → build_farming_prompt (system persona + context + structure)

scripts/
  ingest_knowledge_base.py → CLI: load → chunk → embed → store

data/
  knowledge_base/    → Markdown source documents (6 domains)
  chroma_db/         → ChromaDB on-disk persistence (gitignored)
```

---

## Request Data Flow

```
1. Farmer types question in browser
2. app.js:sendMessage() → POST /api/v1/chat  {question, language}
3. FastAPI: chat route validates ChatRequest (Pydantic)
4. ChatService.answer(request):
   a. RAGPipeline.retrieve(question, top_k=5)
      i.  WatsonxEmbedder.embed_query(question)
          → IBM watsonx.ai Embeddings API call (ibm/slate-125m-english-rtrvr)
          → Returns: List[float] (768-dimensional vector)
      ii. ChromaVectorStore.query(query_embedding, top_k=5)
          → ChromaDB cosine similarity search
          → Returns: List[{content, source, score, chunk_id}]
      iii. KnowledgeRetriever filters below threshold (0.3) and returns List[RetrievedDocument]
   b. build_farming_prompt(question, retrieved_docs, language)
      → Assembles: system persona + structure instruction + language instruction
        + context block (all retrieved chunks with source labels) + question
   c. GraniteService.generate(prompt)
      → IBM watsonx.ai ModelInference API call (ibm/granite-3-3-8b-instruct)
      → Returns: structured text string (Direct Answer + Recommended Action + Caution + Sources)
5. ChatService returns ChatResponse {answer, sources, language, session_id}
6. FastAPI serialises to JSON → 200 OK
7. app.js:renderStructuredAnswer() parses the 4-part text and renders HTML bubbles
```

---

## Knowledge Base Ingestion Flow

Run once (and after adding new documents):

```
scripts/ingest_knowledge_base.py
  │
  ├── DocumentLoader.load_documents_from_directory("data/knowledge_base")
  │     → Walks directory tree; reads .md/.txt files; pypdf for .pdf
  │     → Returns List[{content, source}]
  │
  ├── chunk_documents(documents)
  │     → RecursiveCharacterTextSplitter (chunk_size=500, overlap=100)
  │     → Returns List[{content, source, chunk_id}]
  │
  ├── WatsonxEmbedder.embed(texts)  [in batches of 32]
  │     → IBM watsonx.ai Embeddings API (ibm/slate-125m-english-rtrvr)
  │     → Returns List[List[float]] — one 768-dim vector per chunk
  │
  └── ChromaVectorStore.upsert_chunks(chunks, embeddings)
        → ChromaDB PersistentClient.upsert()
        → Uses chunk_id as primary key (idempotent)
        → Persisted to data/chroma_db/
```

---

## IBM Integration Points

All IBM watsonx.ai calls are isolated in exactly two files:

| File | IBM Operation | SDK Object |
|------|--------------|------------|
| `backend/app/rag/embeddings.py` | Generate text embeddings | `Embeddings` from `ibm_watsonx_ai.foundation_models` |
| `backend/app/ai/granite_service.py` | Generate text responses | `ModelInference` from `ibm_watsonx_ai.foundation_models` |

Both files read credentials from `settings.watsonx_api_key_value` and `settings.IBM_WATSONX_PROJECT_ID`. The `SecretStr` type ensures the API key is never accidentally logged.

### Adding a Different IBM Model

To switch Granite model versions: change `IBM_GRANITE_MODEL_ID` in `.env`. No code changes required.  
To switch embedding models: change `IBM_EMBEDDING_MODEL_ID` in `.env`. Note: you must re-run ingestion if you change the embedding model, as the new model produces a different vector space.

---

## Configuration System

`backend/app/config/settings.py` defines a Pydantic `BaseSettings` class. All fields read from environment variables (or `.env` file). The module-level `settings = Settings()` singleton is imported everywhere else.

Required fields (no default — app will fail to start if missing):
- `IBM_WATSONX_API_KEY`
- `IBM_WATSONX_PROJECT_ID`

Optional fields with defaults:
- `IBM_WATSONX_URL` (default: `https://us-south.ml.cloud.ibm.com`)
- `IBM_GRANITE_MODEL_ID` (default: `ibm/granite-3-3-8b-instruct`)
- `IBM_EMBEDDING_MODEL_ID` (default: `ibm/slate-125m-english-rtrvr`)
- `CHROMA_PERSIST_DIR` (default: `./data/chroma_db`)
- `CHROMA_COLLECTION_NAME` (default: `krishimitra_kb`)
- `LOG_LEVEL` (default: `INFO`)
- `CORS_ORIGINS` (default: localhost origins)

---

## Multilingual Architecture

Language support uses a **prompt-instruction strategy**:

1. The frontend sends `language: "en"` or `language: "hi"` in the request body
2. `build_farming_prompt()` in `prompt_builder.py` selects the appropriate language instruction string
3. The instruction is embedded in the system prompt: `"Respond entirely in Hindi. Use simple Hindi that a farmer can understand."`
4. IBM Granite follows the instruction

**To add a new language:** Add a new entry to `_LANGUAGE_INSTRUCTIONS` dict in `prompt_builder.py` and add the language code to the `Literal` type in `ChatRequest`. Add a new button to the frontend language selector.

---

## Agricultural Safety Design

The system prompt in `prompt_builder.py` explicitly instructs IBM Granite to:

1. Answer primarily from retrieved context (not general knowledge)
2. State clearly when context is insufficient — never fabricate
3. Label DEMO/SAMPLE data when retrieved context contains that label
4. Recommend farmers verify chemical dosages with local Agriculture Extension Officers or KVK
5. Use conservative language for pesticide/fertiliser recommendations

This is enforced at the prompt level, not the application level. The prompt text can be reviewed and updated in `backend/app/ai/prompt_builder.py::_SYSTEM_PERSONA`.

---

## Testing Strategy

Tests in `backend/tests/` follow these principles:

- **No real IBM API calls** — `GraniteService` and `WatsonxEmbedder` are mocked at the service boundary
- **No real ChromaDB** — vector store is mocked in chat service tests
- **Environment fixtures** — `conftest.py` injects dummy credentials for every test via `monkeypatch`
- **Module-level unit tests** — chunker, prompt builder, and config are tested without any mocking (pure Python logic)

Run all tests: `pytest backend/tests/ -v`

---

## Extension Points

| Extension | Where to Change |
|-----------|----------------|
| Add new knowledge domain | Add `.md` file to `data/knowledge_base/`, re-run ingest |
| Add new language | `prompt_builder.py` (`_LANGUAGE_INSTRUCTIONS`), `ChatRequest` (`Literal` type), `frontend/js/app.js` + `index.html` |
| Connect live weather API | New service module under `backend/app/services/weather_service.py`; inject into ChatService |
| Connect live mandi price API | New service under `backend/app/services/market_service.py`; inject into ChatService |
| Use a different LLM | Replace `GraniteService` — only this file needs to change |
| Add conversation history | Add `history: List[ChatTurn]` to `ChatRequest`; update `build_farming_prompt` to include prior turns |
| Add document upload | New `POST /api/v1/documents` endpoint; call `pipeline.ingest_directory()` on the uploaded file |
