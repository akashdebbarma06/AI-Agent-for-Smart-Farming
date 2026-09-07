# KrishiMitra AI — Smart Farming Advisory System

> **AI-powered agricultural advisor for small-scale Indian farmers, built with IBM Granite, IBM watsonx.ai, and Retrieval-Augmented Generation.**

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111%2B-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![IBM watsonx.ai](https://img.shields.io/badge/IBM-watsonx.ai-0062ff?logo=ibm)](https://www.ibm.com/watsonx)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20Store-orange)](https://www.trychroma.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Project Overview

KrishiMitra AI is a full-stack conversational AI application that answers agricultural questions from Indian farmers in English and Hindi. It combines **Retrieval-Augmented Generation (RAG)** with **IBM Granite** to produce grounded, verifiable, and structured farming advice.

The system is intentionally conservative: it answers only from a curated agricultural knowledge base, explicitly tells users when information is unavailable, and always recommends verification with local Krishi Vigyan Kendras (KVKs) before taking action on critical decisions such as pesticide dosages.

**Live Backend:** https://krishimitra-api-g5d8.onrender.com  
**Interactive API Docs:** https://krishimitra-api-g5d8.onrender.com/docs

---

## Problem Statement

Small-scale Indian farmers — particularly in rural areas — lack timely access to reliable agricultural information. Extension services are understaffed, internet searches return generic or unverified content, and language barriers limit usability. KrishiMitra AI addresses this by providing:

- **Verified, domain-specific answers** grounded in a curated knowledge base (not the open internet)
- **Hindi language support** so farmers can ask questions in their own language
- **Structured responses** that clearly separate actionable advice from cautions
- **Conservative AI behaviour** that refuses to fabricate and always cites sources

---

## Key Features

| Feature | Description |
|---------|-------------|
| **RAG-grounded answers** | Every response is based on retrieved knowledge-base chunks; no hallucination by design |
| **IBM Granite generation** | Uses `ibm/granite-4-h-small` via IBM watsonx.ai for structured, conservative responses |
| **Multilingual** | Supports English (`en`) and Hindi (`hi`); language is controlled via prompt instruction to Granite |
| **Agentic intent routing** | Granite classifies each question as WEATHER, MANDI, or RAG before retrieval |
| **Structured response format** | Every answer follows a 4-part format: Direct Answer → Recommended Action → Important Caution → Sources Used |
| **Firebase Authentication** | Google and Email/Password sign-in; Firebase ID tokens verified server-side |
| **Knowledge base auto-ingest** | ChromaDB is automatically populated on startup if empty (handles Render ephemeral deployments) |
| **Safety-first design** | System prompt explicitly forbids fabrication and requires disclaimer for demo/sample data |

---

## Architecture

The diagram below shows two flows: the per-request runtime path and the one-time knowledge base ingestion pipeline.

```
╔══════════════════════════════════════════════════════════════════════╗
║                    RUNTIME REQUEST FLOW                              ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Farmer ──► Frontend ──► FastAPI REST API ──► ChatService            ║
║    ▲        (HTML/JS)    POST /api/v1/chat     │                     ║
║    │        Firebase                           │  Intent Router      ║
║    │        Auth Client                        ├──► WEATHER/MANDI    ║
║    │                                           │    (stub tools)     ║
║    │                              RAG Pipeline │                     ║
║    │                              ┌────────────▼──────────────────┐  ║
║    │                              │  IBM watsonx.ai Embeddings    │  ║
║    │                              │  granite-embedding-278m-multi │  ║
║    │                              │         │  768-dim vector      │  ║
║    │                              │         ▼                     │  ║
║    │                              │  ChromaDB (cosine similarity) │  ║
║    │                              │         │  top-5 chunks        │  ║
║    │                              │         ▼                     │  ║
║    │                              │  Prompt Builder               │  ║
║    │                              │  (persona + context + lang)   │  ║
║    │                              └───────────────────────────────┘  ║
║    │                                           │                     ║
║    │                              IBM Granite (via watsonx.ai)       ║
║    │                              granite-4-h-small                  ║
║    │                                           │                     ║
║    └──────────────────── Structured Farming Response ◄───────────── ║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║              KNOWLEDGE BASE INGESTION (one-time)                     ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Agricultural Docs (.md/.txt/.pdf)                                   ║
║    ──► Document Loader  (recursive directory walk)                   ║
║    ──► Text Chunker     (size=500, overlap=100)                      ║
║    ──► IBM Embeddings   (batches of 32 chunks)                       ║
║    ──► ChromaDB         (upsert, chunk_id as primary key)            ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Technology Stack

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Web framework | FastAPI + Uvicorn | `>=0.111.0` |
| Data validation | Pydantic v2 + pydantic-settings | `>=2.7.0` |
| LLM service | IBM watsonx.ai SDK (`ibm-watsonx-ai`) | `>=1.0.0` |
| Vector database | ChromaDB (persistent local) | `>=0.5.0` |
| Text splitting | LangChain text splitters | `>=0.2.0` |
| PDF parsing | pypdf | `>=4.2.0` |
| Authentication | Firebase Admin SDK | `>=6.5.0` |

### Frontend
| Component | Technology |
|-----------|-----------|
| UI | Plain HTML5 / CSS3 / Vanilla JavaScript — no build toolchain |
| Auth client | Firebase JavaScript SDK (Google + Email/Password) |
| Hosting | Vercel (static) |

### IBM AI Models
| Role | Model ID |
|------|----------|
| Response generation | `ibm/granite-4-h-small` |
| Text embedding (RAG) | `ibm/granite-embedding-278m-multilingual` |

### Infrastructure
| Service | Provider |
|---------|---------|
| Backend hosting | Render (Free tier, Singapore region) |
| Frontend hosting | Vercel |
| Authentication | Firebase Auth |

---

## RAG Workflow

Retrieval-Augmented Generation is the core mechanism that keeps responses factual and grounded.

### Per-Request Flow

1. **Embed the query** — The farmer's question is embedded using `ibm/granite-embedding-278m-multilingual` via `WatsonxEmbedder.embed_query()`, producing a 768-dimensional vector.

2. **Retrieve similar chunks** — ChromaDB performs a cosine similarity search against all indexed knowledge-base chunks. Up to 5 candidates are retrieved.

3. **Filter by relevance** — Chunks with a similarity score below `0.4` (configurable via `RAG_MIN_RELEVANCE_SCORE`) are discarded.

4. **Build the prompt** — `build_farming_prompt()` assembles:
   - System persona (conservative agricultural advisor)
   - Output structure instruction (4-part format)
   - Language instruction (`en` or `hi`)
   - Retrieved context blocks with source labels
   - The farmer's original question

5. **Generate with Granite** — The full prompt is sent to IBM Granite via `GraniteService.generate()` using the `chat()` endpoint (`temperature=0.3`, `repetition_penalty=1.1`, `max_tokens=800`).

6. **Return structured response** — `ChatResponse` contains the answer text, the source chunks used, language code, and session ID.

### No-Context Fallback

If no chunks pass the relevance threshold, the system returns a safe fallback message directing the farmer to their local Krishi Vigyan Kendra — it **never** lets Granite answer from general knowledge when the knowledge base has no relevant information.

---

## IBM Granite + watsonx.ai Integration

All IBM watsonx.ai calls are isolated in exactly two files:

| File | IBM Operation | SDK Class |
|------|--------------|-----------|
| `backend/app/ai/granite_service.py` | Text generation | `ModelInference` from `ibm_watsonx_ai.foundation_models` |
| `backend/app/rag/embeddings.py` | Text embedding | `Embeddings` from `ibm_watsonx_ai.foundation_models` |

Both use `Credentials(url=..., api_key=...)` constructed from environment variables. The API key is stored as Pydantic `SecretStr` and never logged.

**Switching models** requires only `.env` changes:
- Change `IBM_GRANITE_MODEL_ID` to use a different Granite variant
- Change `IBM_EMBEDDING_MODEL_ID` to use a different embedding model (requires re-ingestion)

---

## ChromaDB Knowledge Base

The knowledge base covers 6 agricultural domains:

```
data/knowledge_base/
  crops/          Kharif and Rabi crop guides
  soil/           Soil types, pH, preparation
  pest_disease/   Common pests, diseases, IPM strategies
  fertilizers/    NPK, micronutrients, organic options
  weather/        Season-crop suitability
  market/         APMC pricing context (demo data)
```

**Ingestion** reads all `.md`, `.txt`, and `.pdf` files, splits them into 500-character overlapping chunks (100-char overlap), embeds each chunk via IBM watsonx.ai in batches of 32, and upserts into ChromaDB using `chunk_id` (`{source}::chunk_{index}`) as the idempotent primary key.

**Persistence** is at `./data/chroma_db/` (local filesystem). On Render (ephemeral disk), the startup lifespan automatically re-ingests if the collection is empty.

---

## Firebase Authentication

Authentication is handled client-side by the Firebase JavaScript SDK and verified server-side by `firebase-admin`.

| Flow | Description |
|------|-------------|
| Sign-in methods | Google OAuth, Email/Password |
| Token flow | Frontend sends `Authorization: Bearer <ID_TOKEN>` header |
| Server verification | `firebase_admin.auth.verify_id_token()` in `firebase_auth.py` |
| Config endpoint | `GET /api/v1/auth/config` serves Firebase client config from env vars (no hardcoding in git) |
| Fallback | If Firebase is not configured, requests pass through as `anonymous` — enables local dev without credentials |

---

## Project Structure

```
krishimitra-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                 FastAPI factory; lifespan manages singletons
│   │   ├── config/
│   │   │   └── settings.py         Pydantic-settings; all env vars centralised here
│   │   ├── api/routes/
│   │   │   ├── chat.py             POST /api/v1/chat
│   │   │   ├── health.py           GET  /api/v1/health
│   │   │   └── auth.py             GET  /api/v1/auth/config
│   │   ├── services/
│   │   │   ├── chat_service.py     Orchestrates intent routing → RAG → Granite
│   │   │   └── tools.py            Weather / Mandi stub tools (demo)
│   │   ├── rag/
│   │   │   ├── pipeline.py         RAGPipeline: ingest_directory + retrieve
│   │   │   ├── document_loader.py  Loads .md / .txt / .pdf from disk
│   │   │   ├── chunker.py          RecursiveCharacterTextSplitter (500/100)
│   │   │   ├── embeddings.py       WatsonxEmbedder — IBM watsonx.ai Embeddings
│   │   │   ├── vector_store.py     ChromaVectorStore — PersistentClient wrapper
│   │   │   └── retriever.py        KnowledgeRetriever — embed + query + filter
│   │   ├── ai/
│   │   │   ├── granite_service.py  GraniteService — IBM Granite ModelInference
│   │   │   └── prompt_builder.py   build_farming_prompt — persona + context
│   │   ├── auth/
│   │   │   └── firebase_auth.py    Firebase Admin token verification dependency
│   │   ├── models/
│   │   │   ├── chat.py             ChatRequest, ChatResponse, RetrievedDocument
│   │   │   └── health.py           HealthStatus
│   │   └── utils/
│   │       └── logger.py           Shared logger factory
│   ├── tests/                      Pytest unit tests (no real IBM API calls)
│   └── run.py                      Local dev entrypoint
├── frontend/
│   ├── index.html                  Single-page chatbot UI
│   ├── css/style.css               Responsive stylesheet
│   └── js/
│       ├── app.js                  Chat UI, fetch calls, response rendering
│       ├── auth.js                 Firebase auth flow, onboarding
│       └── firebase-config.js      Firebase client config loader
├── data/
│   ├── knowledge_base/             Source documents (6 domain folders)
│   └── chroma_db/                  ChromaDB persistent storage (gitignored)
├── scripts/
│   └── ingest_knowledge_base.py    CLI for manual knowledge base ingestion
├── .env.example                    Environment variable template
├── requirements.txt                Python dependencies
├── render.yaml                     Render deployment configuration
└── vercel.json                     Vercel frontend routing config
```

---

## Environment Setup

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `IBM_WATSONX_API_KEY` | IBM Cloud API key with watsonx.ai access | [IBM Cloud IAM](https://cloud.ibm.com/iam/apikeys) |
| `IBM_WATSONX_PROJECT_ID` | watsonx.ai project ID | watsonx.ai → Manage → General |

### Optional Variables (defaults shown)

```env
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
IBM_GRANITE_MODEL_ID=ibm/granite-4-h-small
IBM_EMBEDDING_MODEL_ID=ibm/granite-embedding-278m-multilingual
CHROMA_PERSIST_DIR=./data/chroma_db
CHROMA_COLLECTION_NAME=krishimitra_kb
RAG_MIN_RELEVANCE_SCORE=0.4
LOG_LEVEL=INFO
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:5500"]

# Firebase (optional — auth works in dev without these)
FIREBASE_SERVICE_ACCOUNT_JSON=
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_MEASUREMENT_ID=
```

---

## Installation and Run

### Prerequisites
- Python 3.11+
- IBM Cloud account with watsonx.ai access
- (Optional) Firebase project for authentication

### 1 — Clone and install dependencies

```bash
git clone https://github.com/akashdebbarma06/AI-Agent-for-Smart-Farming.git
cd AI-Agent-for-Smart-Farming
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 2 — Configure environment

```bash
cp .env.example .env
# Edit .env and add IBM_WATSONX_API_KEY and IBM_WATSONX_PROJECT_ID
```

### 3 — Ingest the knowledge base

```bash
python scripts/ingest_knowledge_base.py
```

This loads all documents from `data/knowledge_base/`, chunks them, embeds via IBM watsonx.ai, and stores in ChromaDB. Run once; idempotent on repeated runs.

### 4 — Start the backend

```bash
uvicorn backend.app.main:app --reload --port 8000
```

API available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 5 — Open the frontend

Open `frontend/index.html` directly in a browser, or serve it with any static file server:

```bash
# With Python
python -m http.server 5500 --directory frontend
```

---

## API Endpoints

### `POST /api/v1/chat`

Submit an agricultural question. Returns a structured answer generated by IBM Granite.

**Request body:**
```json
{
  "question": "What crop is best for black soil in the Kharif season?",
  "language": "en",
  "session_id": "optional-client-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | 3–500 characters, non-blank |
| `language` | `"en"` \| `"hi"` | No | Response language (default: `"en"`) |
| `session_id` | string | No | Client-provided session identifier |

**Response:**
```json
{
  "answer": "**Direct Answer:**\n...\n\n**Recommended Action:**\n...",
  "sources": [
    {
      "content": "Cotton is a Kharif crop suitable for black (Vertisol) soils...",
      "source": "crops/kharif_crops.md",
      "score": 0.87
    }
  ],
  "language": "en",
  "session_id": "generated-or-echoed-uuid"
}
```

### `GET /api/v1/health`

Returns operational status of all components.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "components": {
    "chroma": {
      "status": "ok",
      "collection": "krishimitra_kb",
      "chunks_indexed": 342
    },
    "granite": {
      "status": "configured",
      "model": "ibm/granite-4-h-small"
    }
  }
}
```

### `GET /api/v1/auth/config`

Returns Firebase web client configuration (populated from server-side environment variables — no credentials hardcoded in frontend source).

---

## Testing

All tests are in `backend/tests/`. No real IBM API calls are made — `GraniteService`, `WatsonxEmbedder`, and `ChromaVectorStore` are mocked at service boundaries.

```bash
# Run all tests
pytest backend/tests/ -v

# Run with coverage
pytest backend/tests/ -v --tb=short
```

### Test coverage includes:
- `test_config.py` — Settings validation, default values, env var override
- `test_chunker.py` — Chunking logic, overlap, empty input handling
- `test_prompt_builder.py` — Prompt assembly, language instruction injection, context formatting
- `test_chat_service.py` — Full ChatService mock integration (RAG → prompt → Granite → response)

---

## Safety and Limitations

### Safety Measures (Implemented)

- **Strict RAG grounding** — Granite is instructed to answer only from retrieved context; the system prompt explicitly prohibits fabrication
- **No-context fallback** — When no relevant chunks are found, the system returns a safe static message directing users to local agricultural officers instead of asking Granite to guess
- **Demo data labelling** — The system prompt requires Granite to clearly label when retrieved context contains SAMPLE or DEMO data (e.g. mandi prices, weather stubs)
- **Conservative language** — The system persona instructs Granite to recommend expert verification before acting on pesticide or fertiliser advice
- **Source attribution** — Every response includes a Sources Used section citing the knowledge-base documents used

### Current Limitations

- Weather and Mandi price tools return **demo/stubbed data** — live API integration (IMD, e-NAM) is not yet implemented
- **Conversation history is not maintained** — each chat turn is stateless; context from prior messages is not carried forward
- ChromaDB runs as a **local persistent store** — not a distributed or production-grade vector database
- Knowledge base covers a curated but limited set of crops and regions — responses outside these domains will fall back to the no-context message
- PDF ingestion requires text-based PDFs; scanned image PDFs are not supported (no OCR)

---

## Future Enhancements

| Enhancement | Notes |
|-------------|-------|
| Live weather integration | Connect to IMD or OpenWeatherMap API in `services/weather_service.py` |
| Live mandi price integration | Connect to e-NAM / Agmarknet API in `services/market_service.py` |
| Conversation history | Add `history: List[ChatTurn]` to `ChatRequest`; update `build_farming_prompt` |
| Additional languages | Add entry to `_LANGUAGE_INSTRUCTIONS` in `prompt_builder.py` + `ChatRequest` Literal |
| Document upload endpoint | `POST /api/v1/documents` → call `pipeline.ingest_directory()` on uploaded file |
| Expanded knowledge base | Add new `.md` files to `data/knowledge_base/` subdirectories + re-run ingestion |
| Voice input | Web Speech API integration already scaffolded in `frontend/js/app.js` |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and run tests: `pytest backend/tests/ -v`
4. Submit a pull request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*KrishiMitra AI — IBM SkillBuild Project | Built with IBM Granite · IBM watsonx.ai · ChromaDB · FastAPI · Firebase*
