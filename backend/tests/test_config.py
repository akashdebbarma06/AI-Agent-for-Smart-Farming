"""
Tests for backend/app/config/settings.py

Verifies that the Settings model correctly reads from environment variables
and that the convenience property returns the raw API key.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError


def test_settings_reads_required_fields_from_env(monkeypatch):
    """Settings must load IBM_WATSONX_API_KEY and IBM_WATSONX_PROJECT_ID from env."""
    monkeypatch.setenv("IBM_WATSONX_API_KEY", "my-test-api-key")
    monkeypatch.setenv("IBM_WATSONX_PROJECT_ID", "my-test-project-id")

    # Import fresh Settings class (not the singleton) to avoid caching
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import Field, SecretStr

    # Re-instantiate to read from the patched env
    from backend.app.config.settings import Settings

    s = Settings()
    assert s.watsonx_api_key_value == "my-test-api-key"
    assert s.IBM_WATSONX_PROJECT_ID == "my-test-project-id"


def test_settings_default_values():
    """Optional settings must have sensible defaults."""
    from backend.app.config.settings import Settings

    s = Settings()
    assert s.IBM_WATSONX_URL == "https://us-south.ml.cloud.ibm.com"
    assert "granite" in s.IBM_GRANITE_MODEL_ID.lower()
    assert "slate" in s.IBM_EMBEDDING_MODEL_ID.lower()
    assert s.CHROMA_COLLECTION_NAME  # Must not be empty
    assert s.LOG_LEVEL in ("DEBUG", "INFO", "WARNING", "ERROR")


def test_settings_cors_origins_is_list():
    """CORS_ORIGINS must be parsed as a list, not a bare string."""
    from backend.app.config.settings import Settings

    s = Settings()
    assert isinstance(s.CORS_ORIGINS, list)
    assert len(s.CORS_ORIGINS) >= 1


def test_watsonx_api_key_value_returns_plain_string():
    """watsonx_api_key_value property must expose the raw string, not SecretStr repr."""
    from backend.app.config.settings import Settings

    s = Settings()
    raw = s.watsonx_api_key_value
    # SecretStr repr is "**********"; we must get the actual value
    assert raw == "test-api-key-not-real"
    assert "**" not in raw
