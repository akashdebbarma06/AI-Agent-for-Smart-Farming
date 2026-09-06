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
        allow_headers=["Content-Type", "Accept"],
    )

    # Register API routers under the versioned prefix
    from backend.app.api.routes.chat import router as chat_router
    from backend.app.api.routes.health import router as health_router

    app.include_router(chat_router, prefix="/api/v1")
    app.include_router(health_router, prefix="/api/v1")

    return app


# Module-level app instance used by uvicorn
app = create_app()
