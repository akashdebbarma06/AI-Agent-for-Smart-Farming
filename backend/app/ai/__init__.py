"""KrishiMitra AI AI package — exports Granite service and prompt builder."""

from backend.app.ai.granite_service import GraniteService, GraniteServiceError
from backend.app.ai.prompt_builder import build_farming_prompt

__all__ = ["GraniteService", "GraniteServiceError", "build_farming_prompt"]
