"""
KrishiMitra AI — Health Check Route.

GET /api/v1/health
  Returns the operational status of the application and its components.
  Used by load balancers, monitoring tools, and the frontend to detect
  whether the backend is ready.
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from backend.app.models.health import HealthStatus
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])


@router.get(
    "",
    response_model=HealthStatus,
    summary="Health check",
    description="Returns operational status of the application and its components.",
)
async def health(request: Request) -> HealthStatus:
    """Check that the application and its dependencies are operational."""
    components: dict = {}

    # Check that ChromaDB is reachable and the collection has been populated
    try:
        rag_pipeline = request.app.state.rag_pipeline
        chunk_count = rag_pipeline._retriever._vector_store.count
        components["chroma"] = {
            "status": "ok",
            "collection": request.app.state.chroma_collection_name,
            "chunks_indexed": chunk_count,
            "rag_min_relevance_score": getattr(request.app.state, "rag_min_relevance_score", 0.4),
            "note": "Run scripts/ingest_knowledge_base.py if chunks_indexed is 0."
            if chunk_count == 0
            else None,
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("Health check — ChromaDB error: %s", exc)
        components["chroma"] = {"status": "error", "detail": str(exc)}

    # Check that GraniteService is configured (credentials present)
    try:
        granite_service = request.app.state.granite_service
        components["granite"] = {
            "status": "configured",
            "model": request.app.state.granite_model_id,
            "note": "Granite is configured but not called during health check to avoid API usage.",
        }
        _ = granite_service  # Confirm attribute exists on app.state
    except Exception as exc:  # noqa: BLE001
        logger.warning("Health check — Granite config error: %s", exc)
        components["granite"] = {"status": "error", "detail": str(exc)}

    # Overall status is "ok" only if all components report ok/configured
    overall_status = (
        "ok"
        if all(c.get("status") in ("ok", "configured") for c in components.values())
        else "degraded"
    )

    return HealthStatus(
        status=overall_status,
        version="1.0.0",
        components=components,
    )
