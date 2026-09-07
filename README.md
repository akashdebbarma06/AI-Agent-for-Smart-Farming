# 🌾 KrishiMitra AI — Smart Farming Advisor

> **AI-powered agricultural advisory chatbot for small-scale Indian farmers.**  
> Built with **IBM Granite**, **Retrieval-Augmented Generation (RAG)**, and **IBM watsonx.ai**.

---

## Problem Statement

Small-scale farmers in India lack timely, reliable access to agricultural expertise. KrishiMitra AI addresses this by letting farmers ask questions in natural language and receive structured, knowledge-grounded answers — covering crop selection, soil management, pest control, fertiliser use, weather guidance, and market prices.

---

## Features

- **Conversational chatbot** — farmers ask questions in plain English or Hindi
- **RAG-powered answers** — every response is grounded in a curated agricultural knowledge base, not hallucinated
- **IBM Granite LLM** — IBM Granite (via IBM watsonx.ai) is the sole generation model
- **Structured responses** — every answer includes: Direct Answer → Recommended Action → Important Caution → Sources Used
- **Multilingual** — English and Hindi supported via prompt-level language instruction; extensible to other languages
- **Conservative agricultural safety** — prompts instruct the model to recommend verification with local agricultural officers for chemical use
- **Demo-safe** — sample data is clearly labelled; no fabricated real-time prices or weather data
- **Health check API** — `GET /api/v1/health` reports component status
- **Interactive API docs** — FastAPI auto-generates Swagger UI at `/docs`

---

## Architecture

```
Browser (HTML/CSS/JS)
      │
      │  POST /api/v1/chat  {question, language}
      ▼
FastAPI Application  (backend/app/main.py)
      │
      ▼
ChatService  (backend/app/services/chat_service.py)
   ├──► RAGPipeline.retrieve(question)
   │        ├──► WatsonxEmbedder.embed_query()  ← IBM watsonx.ai Embeddings API
   │        └──► ChromaVectorStore.query()       ← Local ChromaDB
   │
   ├──► build_farming_prompt(question, context, language)
   │
   └──► GraniteService.generate(prompt)          ← IBM Granite via watsonx.ai
              │
              ▼
        ChatResponse  {answer, sources, language, session_id}
```

**Knowledge Base Ingestion (one-time setup):**

```
data/knowledge_base/  →  DocumentLoader  →  Chunker  →  WatsonxEmbedder  →  ChromaDB
```

---

## Project Structure

```
krishimitra-ai/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI route handlers (chat, health)
│   │   ├── services/         # ChatService orchestration layer
│   │   ├── rag/              # RAG pipeline (loader, chunker, embeddings, vector store, retriever)
│   │   ├── ai/               # IBM Granite service + prompt builder
│   │   ├── models/           # Pydantic request/response models
│   │   ├── utils/            # Logger
│   │   ├── config/           # Pydantic-settings configuration singleton
│   │   └── main.py           # FastAPI app factory + lifespan
│   ├── tests/                # pytest unit tests (no real API calls)
│   ├── requirements.txt      # Python dependencies
│   └── run.py                # Uvicorn entry point
├── frontend/
│   ├── index.html            # Single-page chatbot UI
│   ├── css/style.css         # Green/earth-tone responsive stylesheet
│   └── js/app.js             # Fetch API + structured response renderer
├── data/
│   ├── knowledge_base/       # Markdown source documents (6 domains, 10 files)
│   │   ├── crops/            # Kharif and Rabi crop guides
│   │   ├── soil/             # Soil types and testing guide
│   │   ├── pest_disease/     # IPM and tomato pest management
│   │   ├── fertilizers/      # NPK and organic fertiliser guides
│   │   ├── weather/          # Weather and farming guide
│   │   └── market/           # Sample mandi price reference (DEMO DATA)
│   └── chroma_db/            # ChromaDB persistent storage (generated — not committed)
├── scripts/
│   └── ingest_knowledge_base.py   # One-time ingestion script
├── docs/
│   └── architecture.md       # Deep-dive architecture documentation
├── .env.example              # Environment variable template
├── .gitignore
├── requirements.txt          # Root-level pointer to backend/requirements.txt
└── README.md
```

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.11+ | |
| IBM Cloud account | — | [Create free account](https://cloud.ibm.com/registration) |
| IBM watsonx.ai access | Lite plan sufficient | Enable watsonx.ai service |
| IBM API Key | — | [Create at IAM](https://cloud.ibm.com/iam/apikeys) |
| watsonx.ai Project ID | — | Found in watsonx.ai → Manage → General |

---

## Quick Start

### 1. Clone and set up environment

```bash
git clone <your-repo-url>
cd krishimitra-ai

python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r backend/requirements.txt
```

### 2. Configure credentials

```bash
cp .env.example .env
# Edit .env — fill in your IBM credentials:
# IBM_WATSONX_API_KEY=<your-api-key>
# IBM_WATSONX_PROJECT_ID=<your-project-id>
```

### 3. Ingest the knowledge base

This step loads the agricultural documents, generates embeddings via IBM watsonx.ai, and stores them in ChromaDB. Run it once (and again whenever you add new documents).

```bash
python scripts/ingest_knowledge_base.py
```

Expected output:
```
[INFO] Starting ingestion from: .../data/knowledge_base
[INFO] Loaded 10 documents from ...
[SUCCESS] Ingested 87 chunks in 12.3s.
```

### 4. Start the backend

```bash
python backend/run.py
# Backend available at: http://localhost:8000
# API docs (Swagger): http://localhost:8000/docs
```

### 5. Open the frontend

Open `frontend/index.html` directly in your browser (double-click), or serve it with any static server:

```bash
# Using Python's built-in server:
cd frontend
python -m http.server 5500
# Then open: http://localhost:5500
```

---

## API Reference

### POST `/api/v1/chat`

Ask a farming question.

**Request body:**
```json
{
  "question": "What crop is best for black cotton soil?",
  "language": "en",
  "session_id": "optional-uuid"
}
```

**Response:**
```json
{
  "answer": "**Direct Answer:**\nCotton, soybean, and jowar are best suited...",
  "sources": [
    {
      "content": "Black cotton soil is rich in calcium...",
      "source": "soil/soil_types_india.md",
      "score": 0.89
    }
  ],
  "language": "en",
  "session_id": "a1b2c3d4-..."
}
```

### GET `/api/v1/health`

Returns component status.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "components": {
    "chroma": { "status": "ok", "chunks_indexed": 87 },
    "granite": { "status": "configured", "model": "ibm/granite-4-h-small" }
  }
}
```

---

## Knowledge Base Domains

| Domain | Files | Topics |
|--------|-------|--------|
| `crops/` | 2 | Kharif crops (paddy, maize, cotton, soybean, groundnut, bajra) and Rabi crops (wheat, mustard, chickpea, lentil, potato, barley) |
| `soil/` | 2 | Soil types of India (6 types with crop suitability) and soil testing guide (pH, NPK, micronutrients) |
| `pest_disease/` | 2 | Tomato pest & disease management (IPM approach) and general IPM principles |
| `fertilizers/` | 2 | NPK fertiliser guide (types, doses, application timing) and organic fertilisers (FYM, vermicompost, green manure, biofertilisers) |
| `weather/` | 1 | Weather and farming guide (temperature, rainfall, humidity, seasonal decisions) |
| `market/` | 1 | Sample mandi prices — **DEMO DATA** (clearly labelled; real-time data requires API integration) |

To add new knowledge: place `.md` or `.txt` files in the appropriate subdirectory and re-run `scripts/ingest_knowledge_base.py`.

---

## Demo Mode vs. Production Mode

| Capability | Demo (without valid IBM creds) | Production (with valid IBM creds) |
|------------|-------------------------------|----------------------------------|
| Frontend UI | ✅ Fully usable | ✅ Fully usable |
| Knowledge-base content | ✅ Available | ✅ Available |
| Knowledge-base ingestion | ❌ Requires IBM Embeddings API | ✅ Works |
| Chat responses | ❌ Requires IBM Granite API | ✅ Works |
| Mandi prices | ⚠️ Uses stubbed fallback data | ✅ Uses live e-NAM/stubbed data via tool |
| Weather data | ⚠️ Uses stubbed fallback data | ✅ Uses live Open-Meteo API tool |

**To run without IBM credentials for UI development only:**  
You can stub out `GraniteService.generate()` and `WatsonxEmbedder.embed()` for local frontend testing. See `docs/architecture.md` for guidance.

---

## Running Tests

```bash
# From the project root:
pytest backend/tests/ -v

# With coverage:
pytest backend/tests/ -v --tb=short
```

Tests are designed to run without real IBM credentials. The `conftest.py` fixtures inject dummy values into the environment for every test.

---

## Multilingual Support

| Language | Status | Implementation |
|----------|--------|----------------|
| English | ✅ Supported | Default |
| Hindi | ✅ Supported | Prompt-level instruction to Granite |
| Other Indian languages | 🔜 Planned | Architecture supports extension via prompt instruction |

---

## Agricultural Safety Notice

KrishiMitra AI provides **general guidance** based on its knowledge base. It is **not** a substitute for certified agricultural advice.

- For pesticide and fertiliser applications: always verify dosage with the product label and your local Agriculture Extension Officer or Krishi Vigyan Kendra (KVK)
- For disease and pest identification: consult a plant pathologist or extension officer when uncertain
- The application explicitly instructs IBM Granite to recommend expert consultation for chemical use

---

## IBM Technology Stack

| Component | IBM Service / Product |
|-----------|-----------------------|
| Language Model | IBM Granite (`ibm/granite-4-h-small`) via IBM watsonx.ai |
| Embedding Model | IBM Granite (`ibm/granite-embedding-278m-multilingual`) via IBM watsonx.ai |
| SDK | `ibm-watsonx-ai` Python SDK |
| Cloud Platform | IBM Cloud Lite (free tier sufficient for development) |

---

## Contributing

1. Fork the repository
2. Add documents to `data/knowledge_base/` in the appropriate subdirectory
3. Re-run `scripts/ingest_knowledge_base.py` to update the vector store
4. Write tests for any new service code in `backend/tests/`
5. Ensure all tests pass: `pytest backend/tests/ -v`

---

## License

MIT License — see `LICENSE` file (to be added).

---

*Built with IBM Granite and IBM watsonx.ai. Agricultural advice is for general guidance only — always verify with local agricultural experts.*
