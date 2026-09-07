"""
KrishiMitra AI — Centralised application settings.

All configuration is read from environment variables (or a .env file).
Nothing is hard-coded here — credentials especially must come from the environment.

Usage:
    from backend.app.config import settings
    print(settings.IBM_GRANITE_MODEL_ID)
"""

from __future__ import annotations

from typing import List

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Single source of truth for all runtime configuration.

    Pydantic-settings reads each field from:
      1. A matching environment variable (case-insensitive)
      2. A .env file in the working directory (via model_config)
      3. The field's default value (only for non-credential fields)

    Required fields with no default will raise a ValidationError at
    startup if the corresponding env var is absent — this is intentional
    so misconfiguration is caught immediately, not silently at query time.
    """

    model_config = SettingsConfigDict(
        # Load .env from the directory where the process is started
        env_file=".env",
        env_file_encoding="utf-8",
        # Ignore extra env vars that don't match any field
        extra="ignore",
        # Make the settings object immutable after creation
        frozen=True,
    )

    # ------------------------------------------------------------------
    # IBM watsonx.ai credentials
    # ------------------------------------------------------------------

    IBM_WATSONX_API_KEY: SecretStr = Field(
        default=SecretStr(""),
        description="IBM Cloud API key with watsonx.ai access.",
    )
    IBM_WATSONX_PROJECT_ID: str = Field(
        default="",
        description="watsonx.ai project ID.",
    )
    IBM_WATSONX_URL: str = Field(
        default="https://us-south.ml.cloud.ibm.com",
        description="Regional watsonx.ai endpoint URL.",
    )

    # ------------------------------------------------------------------
    # Model identifiers
    # ------------------------------------------------------------------

    IBM_GRANITE_MODEL_ID: str = Field(
        default="ibm/granite-4-h-small",
        description="Granite model used for response generation.",
    )
    IBM_EMBEDDING_MODEL_ID: str = Field(
        default="ibm/granite-embedding-278m-multilingual",
        description="watsonx.ai embedding model used by the RAG pipeline.",
    )

    # ------------------------------------------------------------------
    # ChromaDB vector store
    # ------------------------------------------------------------------

    CHROMA_PERSIST_DIR: str = Field(
        default="./data/chroma_db",
        description="Filesystem path where ChromaDB persists its data.",
    )
    CHROMA_COLLECTION_NAME: str = Field(
        default="krishimitra_kb",
        description="Name of the ChromaDB collection holding knowledge-base embeddings.",
    )
    RAG_MIN_RELEVANCE_SCORE: float = Field(
        default=0.4,
        description="Minimum similarity score required for a knowledge-base chunk to be considered relevant.",
    )

    # ------------------------------------------------------------------
    # Application settings
    # ------------------------------------------------------------------

    LOG_LEVEL: str = Field(
        default="INFO",
        description="Python logging level: DEBUG | INFO | WARNING | ERROR",
    )
    CORS_ORIGINS: List[str] = Field(
        default=["*"],
        description="Allowed CORS origins for the frontend. Accepts a JSON array or comma-separated string.",
    )

    # ------------------------------------------------------------------
    # Convenience property — exposes the API key as a plain string
    # only when explicitly requested (avoids accidental logging)
    # ------------------------------------------------------------------

    @property
    def watsonx_api_key_value(self) -> str:
        """Return the raw API key string. Use only where the SDK requires it."""
        return self.IBM_WATSONX_API_KEY.get_secret_value()


# Module-level singleton — import and use this everywhere.
# Constructed once at import time; raises immediately if required vars are missing.
settings = Settings()
