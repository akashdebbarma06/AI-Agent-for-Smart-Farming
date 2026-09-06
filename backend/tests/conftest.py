"""
Shared pytest fixtures for KrishiMitra AI tests.

Provides:
  - Controlled environment variable setup so Settings can be
    instantiated without real IBM credentials during tests
  - Sample document and chunk fixtures reused across test files
"""

from __future__ import annotations

import os
import pytest


@pytest.fixture(autouse=True)
def mock_env_credentials(monkeypatch):
    """Inject dummy IBM credentials into the environment for every test.

    This prevents ValidationError from pydantic-settings when settings
    is first imported during tests that don't explicitly provide credentials.
    The values are obviously fake and will fail if any test actually calls
    the IBM API — which tests must not do.
    """
    monkeypatch.setenv("IBM_WATSONX_API_KEY", "test-api-key-not-real")
    monkeypatch.setenv("IBM_WATSONX_PROJECT_ID", "test-project-id-not-real")
    monkeypatch.setenv("IBM_WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
    monkeypatch.setenv("IBM_GRANITE_MODEL_ID", "ibm/granite-3-3-8b-instruct")
    monkeypatch.setenv("IBM_EMBEDDING_MODEL_ID", "ibm/slate-125m-english-rtrvr")
    monkeypatch.setenv("CHROMA_PERSIST_DIR", "/tmp/test_chroma_db")
    monkeypatch.setenv("CHROMA_COLLECTION_NAME", "test_collection")
    monkeypatch.setenv("LOG_LEVEL", "WARNING")


@pytest.fixture
def sample_raw_documents():
    """A minimal set of raw document dicts for chunker tests."""
    return [
        {
            "content": (
                "Wheat is a Rabi season crop grown in India during October to March. "
                "It requires loamy soil with good drainage and 4 to 5 irrigations. "
                "The critical irrigation stages are crown root initiation, tillering, "
                "jointing, flowering, and grain filling. "
                "Wheat is the primary food grain of northern India and major producing states "
                "include Punjab, Haryana, Uttar Pradesh, and Madhya Pradesh."
            ),
            "source": "crops/rabi_crops.md",
        },
        {
            "content": (
                "Tomato fruit borer Helicoverpa armigera causes circular holes in fruits. "
                "Use pheromone traps for early detection. Apply Bacillus thuringiensis spray "
                "at first sign of infestation. For severe infestations consult local agricultural "
                "extension officer for approved chemical options and follow label dosage strictly."
            ),
            "source": "pest_disease/tomato_pests.md",
        },
    ]


@pytest.fixture
def sample_retrieved_documents():
    """Typed RetrievedDocument objects for prompt builder and chat service tests."""
    from backend.app.models.chat import RetrievedDocument

    return [
        RetrievedDocument(
            content="Wheat requires loamy soil and 4-5 irrigations.",
            source="crops/rabi_crops.md",
            score=0.85,
        ),
        RetrievedDocument(
            content="Apply nitrogen fertiliser in two split doses for wheat.",
            source="fertilizers/npk_guide.md",
            score=0.72,
        ),
    ]
