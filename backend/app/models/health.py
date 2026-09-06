"""
KrishiMitra AI — Health check response model.
"""

from __future__ import annotations

from typing import Any, Dict

from pydantic import BaseModel, Field


class HealthStatus(BaseModel):
    """Response shape for the /api/v1/health endpoint."""

    status: str = Field(
        description="Overall service status. 'ok' means all components are reachable.",
    )
    version: str = Field(
        default="1.0.0",
        description="Application version string.",
    )
    components: Dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Per-component status map. Keys are component names "
            "(e.g. 'chroma', 'granite_config'); values are status details."
        ),
    )
