# KrishiMitra AI — Full-Stack Smart Farming Advisor

## Top-Level Overview

**Goal:** Build a production-quality full-stack AI advisor called **KRISHIMITRA AI** that helps small-scale Indian farmers get reliable agricultural guidance through a conversational chatbot. Answers are grounded in a local knowledge base via a RAG pipeline, with IBM Granite (served through IBM watsonx.ai) as the generation model.

**Scope (Phase 1 — this plan):**
- Project scaffold with all directories and configuration stubs
- FastAPI backend skeleton with clean module boundaries
- RAG pipeline: document ingestion → chunking → IBM watsonx.ai embeddings → ChromaDB vector store → retrieval → context assembly
- IBM Granite response generation via `ibm-watsonx-ai` Python SDK
- Sample knowledge-base documents across all required domains
- Responsive farmer-friendly frontend chatbot UI (HTML/CSS/JS) with English/Hindi language selector
- Professional README

**Out of scope for Phase 1:** Real-time weather API integration, live mandi price feeds, production deployment, authentication/auth.

**Key decisions:**
- Backend: FastAPI + Pydantic (async, typed, auto-docs at `/docs`)
- Vector store: ChromaDB (persistent, local file-based)
- Embeddings: IBM watsonx.ai `ibm/slate-125m-english-rtrvr`
- LLM: IBM Granite via watsonx.ai REST API (ibm-watsonx-ai SDK)
- Multilingual: prompt-instruction strategy (no translation library)
- Credentials: environment variables only, never hard-coded

---

## Sub-Task 1 — Project Scaffold

**Status:** `[x] done`

**Intent:** Create the complete directory tree and all placeholder/skeleton files so every subsequent sub-task has a stable home to write into. No logic yet — just structure.

**Expected Outcomes:**
- All directories exist as listed in the project structure spec
- `.env.example`, `.gitignore`, and `requirements.txt` stubs are present
- Top-level `README.md` placeholder exists

**Todo List:**
1. Create root-level directories: `backend/`, `frontend/`, `data/`, `scripts/`, `docs/`
2. Create backend sub-directories: `backend/app/api/`, `backend/app/services/`, `backend/app/rag/`, `backend/app/ai/`, `backend/app/models/`, `backend/app/utils/`, `backend/app/config/`, `backend/tests/`
3. Create frontend sub-directories: `frontend/css/`, `frontend/js/`
4. Create knowledge-base sub-directories: `data/knowledge_base/crops/`, `data/knowledge_base/soil/`, `data/knowledge_base/pest_disease/`, `data/knowledge_base/fertilizers/`, `data/knowledge_base/weather/`, `data/knowledge_base/market/`
5. Create `data/chroma_db/` directory for ChromaDB persistence
6. Write `.gitignore` including `.env`, `__pycache__`, `*.pyc`, `chroma_db/`, `venv/`, `.venv/`, `*.egg-info`
7. Write `.env.example` with all required env var keys (no values)
8. Write top-level `requirements.txt` pointing to `backend/requirements.txt`
9. Write `backend/requirements.txt` with all production dependencies
10. Write empty `__init__.py` files in every Python package directory

**Relevant Context:**
- Project root: `c:\Users\Akash debbarma\Programming\krishimitra-ai`
- Python package directories: `backend/app`, all sub-dirs inside it, `backend/tests`

**Environment variables required (document in `.env.example`):**
```
IBM_WATSONX_API_KEY=
IBM_WATSONX_PROJECT_ID=
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
IBM_GRANITE_MODEL_ID=ibm/granite-3-3-8b-instruct
IBM_EMBEDDING_MODEL_ID=ibm/slate-125m-english-rtrvr
CHROMA_PERSIST_DIR=./data/chroma_db
CHROMA_COLLECTION_NAME=krishimitra_kb
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:5500
```

**Backend `requirements.txt` contents:**
```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
pydantic-settings>=2.2.0
python-dotenv>=1.0.0
ibm-watsonx-ai>=1.0.0
chromadb>=0.5.0
langchain-text-splitters>=0.2.0
pypdf>=4.2.0
python-multipart>=0.0.9
httpx>=0.27.0
pytest>=8.2.0
pytest-asyncio>=0.23.0
```

---

## Sub-Task 2 — Configuration Management

**Status:** `[x] done`

**Intent:** Centralise all environment-variable-based settings into a single Pydantic `Settings` model so every module imports config from one place and credentials are never scattered.

**Expected Outcomes:**
- `backend/app/config/settings.py` exports a singleton `settings` object
- All IBM credentials, ChromaDB paths, model IDs, and CORS origins are read from env vars
- A missing required variable raises a clear error at startup, not silently at runtime

**Todo List:**
1. Write `backend/app/config/settings.py` using `pydantic-settings` `BaseSettings`
2. Fields: `IBM_WATSONX_API_KEY` (secret), `IBM_WATSONX_PROJECT_ID`, `IBM_WATSONX_URL`, `IBM_GRANITE_MODEL_ID`, `IBM_EMBEDDING_MODEL_ID`, `CHROMA_PERSIST_DIR`, `CHROMA_COLLECTION_NAME`, `LOG_LEVEL`, `CORS_ORIGINS` (list)
3. Instantiate `settings = Settings()` at module bottom (singleton pattern)
4. Write `backend/app/config/__init__.py` re-exporting `settings`
5. Write `backend/app/utils/logger.py` — configures stdlib `logging` using `settings.LOG_LEVEL`

**Relevant Context:**
- `backend/app/config/settings.py` — primary file
- `pydantic-settings` `BaseSettings` reads from `.env` automatically when `model_config = SettingsConfigDict(env_file=".env")`

---

## Sub-Task 3 — Pydantic Data Models

**Status:** `[x] done`

**Intent:** Define all shared request/response schemas in one place so the API layer, service layer, and RAG layer share a single source of truth for data shapes.

**Expected Outcomes:**
- `backend/app/models/` contains typed Pydantic models for chat requests, chat responses, retrieved documents, and health checks
- No `dict` passing between layers — everything typed

**Todo List:**
1. Write `backend/app/models/chat.py`:
   - `ChatRequest`: `question: str`, `language: Literal["en", "hi"] = "en"`, `session_id: Optional[str]`
   - `RetrievedDocument`: `content: str`, `source: str`, `score: float`
   - `ChatResponse`: `answer: str`, `sources: list[RetrievedDocument]`, `language: str`, `session_id: str`
2. Write `backend/app/models/health.py`:
   - `HealthStatus`: `status: str`, `version: str`, `components: dict`
3. Write `backend/app/models/__init__.py` re-exporting all models

**Relevant Context:**
- Used by `backend/app/api/routes/chat.py` and all service layers

---

## Sub-Task 4 — Knowledge Base Documents

**Status:** `[x] done`

**Intent:** Populate `data/knowledge_base/` with realistic, domain-accurate sample agricultural documents that the RAG pipeline will ingest. These must be clearly labelled as demo/sample data where real-time data would normally come from external APIs.

**Expected Outcomes:**
- At least 2 markdown/text documents per domain folder
- Each document clearly states it is sample data where applicable
- Content covers all example question types stated in the spec

**Todo List:**
1. `data/knowledge_base/crops/kharif_crops.md` — Kharif season crop guide (rice, maize, cotton, soybean, groundnut) with soil, rainfall, and sowing-time requirements
2. `data/knowledge_base/crops/rabi_crops.md` — Rabi season crop guide (wheat, mustard, chickpea, lentil, potato)
3. `data/knowledge_base/soil/soil_types_india.md` — Black soil, red soil, alluvial soil, laterite soil with suitable crops
4. `data/knowledge_base/soil/soil_testing_guide.md` — How to test soil pH and NPK, what the readings mean
5. `data/knowledge_base/pest_disease/tomato_pests.md` — Common tomato pests and diseases with IPM recommendations and cautions on chemical use
6. `data/knowledge_base/pest_disease/general_ipm.md` — Integrated Pest Management principles
7. `data/knowledge_base/fertilizers/npk_guide.md` — NPK fertilizer types, when and how to apply; safety cautions
8. `data/knowledge_base/fertilizers/organic_fertilizers.md` — Compost, vermicompost, green manure
9. `data/knowledge_base/weather/weather_farming_guide.md` — How temperature, rainfall, and humidity affect major crops; general guidance
10. `data/knowledge_base/market/mandi_prices_sample.md` — Clearly labelled SAMPLE mandi prices for common vegetables and grains with a disclaimer that real-time data requires API integration

**Relevant Context:**
- Documents will be loaded by `backend/app/rag/document_loader.py` in Sub-Task 5
- Keep each document focused (300–600 words) so chunking produces meaningful segments

---

## Sub-Task 5 — RAG Pipeline

**Status:** `[x] done`

**Intent:** Build the complete RAG pipeline: load documents → split into chunks → generate embeddings via IBM watsonx.ai → store in ChromaDB → retrieve top-K relevant chunks for a given query → assemble a context string for the LLM.

**Expected Outcomes:**
- `backend/app/rag/document_loader.py` — loads `.md` / `.txt` / `.pdf` files from a directory
- `backend/app/rag/chunker.py` — splits text into overlapping chunks using `langchain-text-splitters`
- `backend/app/rag/embeddings.py` — generates embeddings via IBM watsonx.ai embedding model
- `backend/app/rag/vector_store.py` — wraps ChromaDB: persist, upsert, query
- `backend/app/rag/retriever.py` — orchestrates embed-query → ChromaDB search → return `RetrievedDocument` list
- `backend/app/rag/pipeline.py` — top-level `RAGPipeline` class combining all steps; exposes `ingest_directory()` and `retrieve(query, top_k)` methods
- `scripts/ingest_knowledge_base.py` — runnable script to trigger ingestion

**Todo List:**
1. Write `document_loader.py`: walk a directory, read `.md` and `.txt` files (and `.pdf` via `pypdf`), return list of `{content, source}` dicts
2. Write `chunker.py`: use `RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)` from `langchain-text-splitters`; return list of `{content, source}` chunks
3. Write `embeddings.py`: class `WatsonxEmbedder` with method `embed(texts: list[str]) -> list[list[float]]` using `ibm-watsonx-ai` `Embeddings` client; clearly mark the IBM SDK call location with a comment
4. Write `vector_store.py`: class `ChromaVectorStore` wrapping `chromadb.PersistentClient`; methods: `upsert_chunks(chunks, embeddings)`, `query(embedding, top_k) -> list[dict]`
5. Write `retriever.py`: class `KnowledgeRetriever` combining embedder + vector store; `retrieve(query, top_k=5) -> list[RetrievedDocument]`
6. Write `pipeline.py`: class `RAGPipeline` with `ingest_directory(path)` and `retrieve(query)` as the public API; handles loader → chunker → embedder → store in `ingest_directory`
7. Write `scripts/ingest_knowledge_base.py`: CLI script that instantiates `RAGPipeline` and calls `ingest_directory("data/knowledge_base")`
8. Write `backend/app/rag/__init__.py` exporting `RAGPipeline` and `KnowledgeRetriever`

**Relevant Context:**
- IBM watsonx.ai SDK: `from ibm_watsonx_ai import Credentials`, `from ibm_watsonx_ai.foundation_models import Embeddings`
- ChromaDB persistent client: `chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)`
- Embedding dimension for `ibm/slate-125m-english-rtrvr`: 768

---

## Sub-Task 6 — IBM Granite AI Service

**Status:** `[x] done`

**Intent:** Isolate all IBM Granite interaction in a single service module. The rest of the application never imports from `ibm_watsonx_ai` directly — only this module does. This keeps the IBM integration swappable and testable.

**Expected Outcomes:**
- `backend/app/ai/granite_service.py` with class `GraniteService`
- `GraniteService.generate(prompt: str) -> str` calls IBM watsonx.ai chat/text API and returns the model's text response
- Clear comments marking exactly where the IBM API call happens and what SDK objects are used
- Proper error handling: if the API call fails, raise a typed `GraniteServiceError` (never swallow errors silently)
- The service is instantiated once and reused (singleton via module-level instance)

**Todo List:**
1. Write `backend/app/ai/granite_service.py`:
   - Import `Credentials`, `ModelInference` from `ibm_watsonx_ai`
   - Class `GraniteService` with `__init__` reading credentials from `settings`
   - Method `generate(prompt: str, max_tokens: int = 800) -> str`
   - IBM API call wrapped in try/except; raise `GraniteServiceError` on failure
   - `GraniteServiceError(Exception)` defined in same file
2. Write `backend/app/ai/prompt_builder.py`:
   - Function `build_farming_prompt(question: str, context: str, language: str) -> str`
   - System instruction sets the assistant persona as a knowledgeable, conservative agricultural advisor
   - Instructs model to respond in Hindi if `language == "hi"`
   - Instructs model to structure output as: Direct Answer → Recommended Action → Important Caution (if any) → Sources Used
   - Instructs model to state clearly when retrieved context is insufficient rather than hallucinating
3. Write `backend/app/ai/__init__.py` exporting `GraniteService`, `build_farming_prompt`

**Relevant Context:**
- IBM watsonx.ai SDK usage: `ModelInference(model_id=..., credentials=..., project_id=...)` then `.generate_text(prompt=...)`
- Model ID from `settings.IBM_GRANITE_MODEL_ID` (e.g. `ibm/granite-3-3-8b-instruct`)

---

## Sub-Task 7 — FastAPI Application & Routes

**Status:** `[x] done`

**Intent:** Wire the RAG pipeline and Granite service together into a FastAPI application that exposes a clean REST API the frontend can call.

**Expected Outcomes:**
- `backend/app/main.py` — FastAPI app factory with CORS, lifespan (startup/shutdown), and router registration
- `backend/app/api/routes/chat.py` — `POST /api/v1/chat` endpoint
- `backend/app/api/routes/health.py` — `GET /api/v1/health` endpoint
- `backend/app/services/chat_service.py` — orchestrates retriever + prompt builder + Granite; returns `ChatResponse`
- Uvicorn entry point via `backend/run.py`

**Todo List:**
1. Write `backend/app/services/chat_service.py`:
   - Class `ChatService` with `__init__` accepting `RAGPipeline` and `GraniteService`
   - Method `answer(request: ChatRequest) -> ChatResponse`
   - Calls `pipeline.retrieve(question)`, calls `prompt_builder.build_farming_prompt(...)`, calls `granite.generate(prompt)`, assembles and returns `ChatResponse`
2. Write `backend/app/api/routes/chat.py`:
   - `POST /api/v1/chat` — accepts `ChatRequest`, calls `ChatService.answer()`, returns `ChatResponse`
   - Input validation: question must be 3–500 characters
   - Logs incoming question (without PII concerns — question only)
3. Write `backend/app/api/routes/health.py`:
   - `GET /api/v1/health` — returns `HealthStatus` with `status: ok`, version, and component states (chroma, granite config)
4. Write `backend/app/api/__init__.py` and `backend/app/api/routes/__init__.py`
5. Write `backend/app/main.py`:
   - FastAPI app with title "KrishiMitra AI API", version, description
   - CORS middleware using `settings.CORS_ORIGINS`
   - Lifespan context manager: initialise `RAGPipeline` and `GraniteService` on startup, store on `app.state`
   - Register routers under `/api/v1`
6. Write `backend/run.py` — `uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)`

**Relevant Context:**
- FastAPI dependency injection: use `app.state` to hold shared service instances; use `Request` in route handlers to access them
- CORS: `fastapi.middleware.cors.CORSMiddleware`

---

## Sub-Task 8 — Frontend Chatbot UI

**Status:** `[x] done`

**Intent:** Build a clean, responsive, farmer-friendly chatbot interface in plain HTML/CSS/JS that connects to the FastAPI backend. No build toolchain — just static files.

**Expected Outcomes:**
- `frontend/index.html` — single-page chatbot UI with language selector, chat window, input field, send button
- `frontend/css/style.css` — clean green/earth-tone colour scheme, responsive, accessible
- `frontend/js/app.js` — handles user input, calls `POST /api/v1/chat`, renders structured responses
- Responses rendered with the 4-part structure: Direct Answer, Recommended Action, Caution, Sources
- Loading spinner while waiting for API response
- Error state shown gracefully if API is unavailable
- Language selector (English / हिंदी) sets the `language` field in the API request

**Todo List:**
1. Write `frontend/index.html`:
   - Header with KrishiMitra AI logo/name and language selector
   - Chat message container
   - Input area with textarea and send button
   - Link to `css/style.css` and `js/app.js`
   - Suggested question chips for common farming questions
2. Write `frontend/css/style.css`:
   - CSS variables for colour palette (greens, earth tones)
   - Mobile-first responsive layout
   - Distinct styling for user messages vs AI messages
   - Loading animation (dots)
   - Source citation styling (small, muted)
   - Language selector as a clean toggle
3. Write `frontend/js/app.js`:
   - `API_BASE_URL` constant (configurable, defaults to `http://localhost:8000`)
   - `sendMessage()` function: reads input, appends user bubble, calls API, renders response
   - `renderResponse(data)`: renders structured 4-part response into DOM
   - `setLanguage(lang)`: stores selected language, updates UI label
   - Keyboard shortcut: Enter to send (Shift+Enter for newline)
   - Graceful error display if fetch fails

**Relevant Context:**
- API contract: `POST /api/v1/chat` with body `{question, language}`, response `{answer, sources, language, session_id}`
- `sources` is an array of `{content, source, score}` — show source filename and score

---

## Sub-Task 9 — Unit Tests

**Status:** `[x] done`

**Intent:** Add unit tests for the most critical modules: config loading, prompt builder, chunker, and the chat service orchestration logic. Tests must not make real IBM API calls.

**Expected Outcomes:**
- `backend/tests/test_config.py` — tests that settings load from env vars correctly
- `backend/tests/test_prompt_builder.py` — tests English and Hindi prompt generation
- `backend/tests/test_chunker.py` — tests that text is split into expected chunk sizes/overlaps
- `backend/tests/test_chat_service.py` — tests orchestration with mocked RAG and Granite

**Todo List:**
1. Write `backend/tests/conftest.py` with shared fixtures (mock settings, sample documents)
2. Write `backend/tests/test_config.py`: assert each settings field reads from env
3. Write `backend/tests/test_prompt_builder.py`: assert Hindi instruction present when `language="hi"`, assert structure sections present
4. Write `backend/tests/test_chunker.py`: feed a 2000-char text, assert output has multiple chunks, chunk size ≤ 500
5. Write `backend/tests/test_chat_service.py`: mock `RAGPipeline.retrieve` and `GraniteService.generate`, assert `ChatResponse` is assembled correctly

**Relevant Context:**
- Use `pytest` and `unittest.mock.patch` / `MagicMock`
- No real API calls in tests; mock at the service boundary

---

## Sub-Task 10 — README & Documentation

**Status:** `[x] done`

**Intent:** Write a professional README that explains the project purpose, architecture, setup steps, and the clear boundary between what is implemented vs what requires live IBM Cloud credentials to activate.

**Expected Outcomes:**
- `README.md` at project root — complete, professional, accurate
- `docs/architecture.md` — deeper architecture notes for contributors
- Clear "Demo Mode vs Production Mode" section

**Todo List:**
1. Write `README.md`:
   - Project banner/title
   - Problem statement summary
   - Feature list
   - Architecture overview (text description — no Mermaid in plan file)
   - Prerequisites (Python 3.11+, IBM Cloud account, IBM watsonx.ai access)
   - Quick start (clone → copy `.env.example` → fill credentials → install deps → ingest KB → run backend → open frontend)
   - API reference summary
   - Demo vs Production section (what works without credentials, what requires IBM Cloud)
   - Knowledge base domains
   - Contributing / safety note on agricultural advice
   - License placeholder
2. Write `docs/architecture.md`:
   - Component diagram description
   - Data flow: user question → frontend → FastAPI → ChatService → RAGPipeline → GraniteService → response
   - RAG pipeline stages explained
   - IBM integration points (embedding model, generation model, SDK objects used)
   - Extension points (adding new languages, new document formats, real-time APIs)

---

## Implementation Notes for Agent Mode

When switching to agent mode, process sub-tasks **in order** (1 → 10). Each sub-task must be fully implemented and validated before moving to the next.

After each sub-task:
- Update the sub-task status in this plan file to `[x] done`
- Confirm no import errors by checking `__init__.py` exports match what is imported
- Do not move on until the current sub-task is solid

**Critical constraints to enforce at all times:**
- Never hard-code `IBM_WATSONX_API_KEY` or `IBM_WATSONX_PROJECT_ID` anywhere
- Never replace IBM Granite with OpenAI or any other LLM — all generation goes through `GraniteService`
- Mark all sample/demo data files with a `> **DEMO DATA**` notice at the top
- Agricultural advice in prompts must include a caution to verify chemical dosages with local agricultural officers
- ChromaDB collection must use the `settings.CHROMA_COLLECTION_NAME` value, not a hardcoded string
