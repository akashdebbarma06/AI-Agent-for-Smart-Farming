"""
KrishiMitra AI — IBM watsonx.ai Embedding Client.

This module is the ONLY place in the codebase that calls the IBM watsonx.ai
embedding API. All other modules that need embeddings import from here.

Model used: ibm/slate-125m-english-rtrvr
  - Output dimension: 768
  - Context window: ~512 tokens
  - Designed for retrieval tasks (asymmetric query/document embedding)

IBM SDK reference:
  from ibm_watsonx_ai.foundation_models import Embeddings
  from ibm_watsonx_ai import Credentials
"""

from __future__ import annotations

from typing import List

from backend.app.config.settings import settings
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)


class EmbeddingError(Exception):
    """Raised when the IBM watsonx.ai embedding call fails."""


class WatsonxEmbedder:
    """Generates dense vector embeddings using IBM watsonx.ai.

    Wraps the ibm-watsonx-ai SDK's Embeddings client. Instantiate once
    (singleton in RAGPipeline) and reuse for all embed calls.
    """

    def __init__(self) -> None:
        # ----------------------------------------------------------------
        # IBM INTEGRATION POINT — watsonx.ai Embeddings client
        # Credentials are read exclusively from environment variables via
        # settings; they are never hard-coded.
        # ----------------------------------------------------------------
        try:
            from ibm_watsonx_ai import Credentials  # type: ignore[import-untyped]
            from ibm_watsonx_ai.foundation_models import Embeddings  # type: ignore[import-untyped]
        except ImportError as exc:
            raise ImportError(
                "ibm-watsonx-ai is not installed. "
                "Run: pip install ibm-watsonx-ai"
            ) from exc

        credentials = Credentials(
            url=settings.IBM_WATSONX_URL,
            api_key=settings.watsonx_api_key_value,  # Property returns raw string
        )

        # ----------------------------------------------------------------
        # IBM INTEGRATION POINT — model_id and project_id come from env vars
        # ----------------------------------------------------------------
        self._client: "Embeddings" = Embeddings(
            model_id=settings.IBM_EMBEDDING_MODEL_ID,
            credentials=credentials,
            project_id=settings.IBM_WATSONX_PROJECT_ID,
        )

        logger.info(
            "WatsonxEmbedder initialised with model: %s",
            settings.IBM_EMBEDDING_MODEL_ID,
        )

    def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of text strings.

        Args:
            texts: List of text strings to embed. Each string is one chunk.

        Returns:
            List of embedding vectors, one per input text.
            Each vector is a list of floats (dimension 768 for slate-125m).

        Raises:
            EmbeddingError: If the IBM API call fails.
        """
        if not texts:
            return []

        try:
            # ----------------------------------------------------------------
            # IBM INTEGRATION POINT — actual API call to watsonx.ai
            # The SDK batches the request internally.
            # ----------------------------------------------------------------
            response = self._client.embed_documents(texts=texts)

            # The SDK returns a list of embedding vectors (list of list of float)
            logger.debug("Generated %d embeddings", len(response))
            return response

        except Exception as exc:  # noqa: BLE001
            logger.error("IBM watsonx.ai embedding call failed: %s", exc)
            raise EmbeddingError(
                f"Failed to generate embeddings via IBM watsonx.ai: {exc}"
            ) from exc

    def embed_query(self, text: str) -> List[float]:
        """Generate a single embedding for a query string.

        Convenience wrapper around :meth:`embed` for single-query retrieval.
        """
        results = self.embed([text])
        if not results:
            raise EmbeddingError("No embedding returned for query.")
        return results[0]
