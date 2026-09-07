"""
KrishiMitra AI — FastAPI Application Factory.

This module creates and configures the FastAPI application instance.
It is the entry point for uvicorn:

    uvicorn backend.app.main:app --reload

Key responsibilities:
  - Register CORS middleware (allows the static frontend to call the API)
  - Define the lifespan context (startup/shutdown) to initialise and clean up
    the RAGPipeline, GraniteService, and ChatService singletons
  - Register all API routers under /api/v1
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config.settings import settings
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialise shared services on startup; clean up on shutdown.

    Using FastAPI's lifespan context manager (instead of deprecated
    @app.on_event) ensures services are ready before the first request
    and properly released when the server stops.

    All shared objects are stored on app.state so route handlers can
    access them via `request.app.state` without global variables.
    """
    logger.info("KrishiMitra AI — starting up...")

    # ----------------------------------------------------------------
    # Startup: initialise IBM Granite and RAG pipeline
    # These constructors validate credentials and connect to services.
    # If credentials are missing, the app will fail fast here with a
    # clear error rather than on the first API request.
    # ----------------------------------------------------------------
    from backend.app.ai.granite_service import GraniteService
    from backend.app.rag.pipeline import RAGPipeline
    from backend.app.services.chat_service import ChatService

    rag_pipeline = RAGPipeline()
    granite_service = GraniteService()
    chat_service = ChatService(rag_pipeline, granite_service)

    # Store on app.state for access in route handlers
    app.state.rag_pipeline = rag_pipeline
    app.state.granite_service = granite_service
    app.state.chat_service = chat_service

    # Store metadata for the health check endpoint
    app.state.chroma_collection_name = settings.CHROMA_COLLECTION_NAME
    app.state.granite_model_id = settings.IBM_GRANITE_MODEL_ID
    app.state.rag_min_relevance_score = settings.RAG_MIN_RELEVANCE_SCORE

    # Auto-ingest knowledge base if ChromaDB is empty (useful for ephemeral environments like Render)
    try:
        if rag_pipeline._retriever._vector_store.count == 0:
            logger.info("ChromaDB is empty. Auto-ingesting knowledge base from data/knowledge_base...")
            from pathlib import Path
            kb_dir = Path("data/knowledge_base")
            if kb_dir.exists():
                chunks = rag_pipeline.ingest_directory(str(kb_dir))
                logger.info("Auto-ingested %d chunks successfully.", chunks)
            else:
                logger.warning("Knowledge base directory %s not found. Auto-ingestion skipped.", kb_dir)
    except Exception as e:
        logger.error("Auto-ingestion failed during startup: %s", e)

    logger.info("KrishiMitra AI — all services initialised, ready to serve requests.")

    yield  # Application runs here

    # ----------------------------------------------------------------
    # Shutdown: nothing to explicitly close for this stack, but the
    # hook exists for future use (e.g. closing a database connection).
    # ----------------------------------------------------------------
    logger.info("KrishiMitra AI — shutting down.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(
        title="KrishiMitra AI API",
        version="1.0.0",
        description=(
            "AI-powered smart farming advisor for small-scale Indian farmers. "
            "Powered by IBM Granite and Retrieval-Augmented Generation (RAG). "
            "Interactive API docs available at /docs."
        ),
        lifespan=lifespan,
    )

    # Allow the static frontend (and development servers) to call the API
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Accept", "Authorization"],
    )

    # Register API routers under the versioned prefix
    from backend.app.api.routes.chat import router as chat_router
    from backend.app.api.routes.health import router as health_router

    app.include_router(chat_router, prefix="/api/v1")
    app.include_router(health_router, prefix="/api/v1")

    # Global Exception Handler
    from fastapi import Request
    from fastapi.responses import JSONResponse
    
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"message": "An unexpected error occurred. Please try again later."},
        )

    return app


# Module-level app instance used by uvicorn
app = create_app()
