"""KrishiMitra AI API routes package — aggregates all routers."""

from backend.app.api.routes.chat import router as chat_router
from backend.app.api.routes.health import router as health_router

__all__ = ["chat_router", "health_router"]
