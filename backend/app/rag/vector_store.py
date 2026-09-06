"""
KrishiMitra AI — ChromaDB Vector Store.

Wraps the ChromaDB PersistentClient to provide:
  - Upsert (add or update) document chunks with their embeddings
  - Query by embedding vector to retrieve the most similar chunks

Why persistent storage?
  Embeddings are expensive to recompute (requires IBM API calls).
  ChromaDB persists to disk so the knowledge base is loaded once during
  the ingest script and retrieved quickly on every query thereafter.
"""

from __future__ import annotations

from typing import Any, Dict, List

from backend.app.config.settings import settings
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)


class VectorStoreError(Exception):
    """Raised when a ChromaDB operation fails."""


class ChromaVectorStore:
    """Persistent ChromaDB-backed vector store for knowledge-base chunks.

    The collection is created automatically if it does not exist.
    Existing chunks are upserted (not duplicated) using their chunk_id.
    """

    def __init__(self) -> None:
        try:
            import chromadb  # type: ignore[import-untyped]
        except ImportError as exc:
            raise ImportError(
                "chromadb is not installed. Run: pip install chromadb"
            ) from exc

        # Persistent client stores data on disk — survives server restarts
        self._client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR
        )

        # Get or create the collection; cosine distance suits text embeddings
        self._collection = self._client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

        logger.info(
            "ChromaVectorStore connected to collection '%s' at %s",
            settings.CHROMA_COLLECTION_NAME,
            settings.CHROMA_PERSIST_DIR,
        )

    @property
    def count(self) -> int:
        """Return the number of chunks currently stored in the collection."""
        return self._collection.count()

    def upsert_chunks(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
    ) -> None:
        """Add or update chunks in the collection.

        Args:
            chunks: List of :class:`~backend.app.rag.chunker.DocumentChunk` dicts.
            embeddings: Parallel list of embedding vectors for each chunk.

        Raises:
            VectorStoreError: If ChromaDB rejects the upsert.
        """
        if len(chunks) != len(embeddings):
            raise VectorStoreError(
                f"Chunk count ({len(chunks)}) does not match embedding count ({len(embeddings)})."
            )

        if not chunks:
            return

        try:
            self._collection.upsert(
                ids=[chunk["chunk_id"] for chunk in chunks],
                embeddings=embeddings,
                documents=[chunk["content"] for chunk in chunks],
                metadatas=[{"source": chunk["source"]} for chunk in chunks],
            )
            logger.info("Upserted %d chunks into ChromaDB", len(chunks))

        except Exception as exc:  # noqa: BLE001
            logger.error("ChromaDB upsert failed: %s", exc)
            raise VectorStoreError(f"Failed to upsert chunks: {exc}") from exc

    def query(
        self,
        query_embedding: List[float],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Retrieve the *top_k* most similar chunks for a query embedding.

        Args:
            query_embedding: Dense vector representation of the user's query.
            top_k: Number of results to return.

        Returns:
            List of dicts with keys: ``content``, ``source``, ``score``, ``chunk_id``.
            Sorted by relevance (highest similarity first).

        Raises:
            VectorStoreError: If the ChromaDB query fails.
        """
        try:
            results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=min(top_k, self._collection.count() or 1),
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("ChromaDB query failed: %s", exc)
            raise VectorStoreError(f"Failed to query vector store: {exc}") from exc

        # ChromaDB returns batched results (outer list = one per query)
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        ids = results.get("ids", [[]])[0]

        retrieved = []
        for doc, meta, dist, chunk_id in zip(docs, metas, distances, ids):
            # Convert cosine distance (0=identical, 2=opposite) to similarity (0–1)
            similarity = 1.0 - (dist / 2.0)
            retrieved.append(
                {
                    "content": doc,
                    "source": meta.get("source", "unknown"),
                    "score": round(max(0.0, min(1.0, similarity)), 4),
                    "chunk_id": chunk_id,
                }
            )

        return retrieved
