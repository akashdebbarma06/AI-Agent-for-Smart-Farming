"""
KrishiMitra AI — Knowledge Retriever.

Combines the WatsonxEmbedder and ChromaVectorStore into a single
retrieve() method that is the public interface used by ChatService.

The retriever:
  1. Embeds the user's query using the IBM watsonx.ai embedding model
  2. Queries ChromaDB for the most similar knowledge-base chunks
  3. Returns typed RetrievedDocument objects for use in prompt construction
"""

from __future__ import annotations

from typing import List

from backend.app.models.chat import RetrievedDocument
from backend.app.rag.embeddings import WatsonxEmbedder
from backend.app.rag.vector_store import ChromaVectorStore
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)

from backend.app.config.settings import settings

# We will use settings.RAG_MIN_RELEVANCE_SCORE instead of a hardcoded value


class KnowledgeRetriever:
    """Retrieves relevant knowledge-base chunks for a given query.

    Instantiated once in RAGPipeline and reused for every chat request.
    """

    def __init__(
        self,
        embedder: WatsonxEmbedder,
        vector_store: ChromaVectorStore,
    ) -> None:
        self._embedder = embedder
        self._vector_store = vector_store

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
    ) -> List[RetrievedDocument]:
        """Find the most relevant knowledge-base chunks for *query*.

        Args:
            query: The farmer's question (natural language).
            top_k: Maximum number of chunks to return.

        Returns:
            List of :class:`RetrievedDocument` sorted by relevance (best first).
            Returns an empty list if the vector store is empty.
        """
        if self._vector_store.count == 0:
            logger.warning(
                "Vector store is empty — no documents have been ingested. "
                "Run scripts/ingest_knowledge_base.py first."
            )
            return []

        # Step 1: Embed the query using the same model as the indexed chunks
        query_embedding = self._embedder.embed_query(query)

        # Step 2: Find similar chunks in ChromaDB
        raw_results = self._vector_store.query(query_embedding, top_k=top_k)

        # Step 3: Filter low-relevance results and convert to typed model
        documents: List[RetrievedDocument] = []
        for result in raw_results:
            if result["score"] < settings.RAG_MIN_RELEVANCE_SCORE:
                logger.debug(
                    "Filtered low-relevance chunk (score=%.3f < %.3f): %s",
                    result["score"],
                    settings.RAG_MIN_RELEVANCE_SCORE,
                    result["source"],
                )
                continue

            documents.append(
                RetrievedDocument(
                    content=result["content"],
                    source=result["source"],
                    score=result["score"],
                )
            )

        logger.info(
            "Retrieved %d relevant chunks for query (top_k=%d)",
            len(documents),
            top_k,
        )
        return documents
