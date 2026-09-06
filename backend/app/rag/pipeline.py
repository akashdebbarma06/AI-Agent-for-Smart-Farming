"""
KrishiMitra AI — RAG Pipeline.

Top-level orchestrator for the Retrieval-Augmented Generation pipeline.
This is the single object that ChatService interacts with — it hides the
internal document loader, chunker, embedder, and vector store behind two
clean public methods:

  - ingest_directory(path): One-time setup — loads, chunks, embeds, stores
  - retrieve(query, top_k):  Per-request retrieval used during chat

Design rationale:
  Keeping ingest and retrieve in the same class makes the pipeline self-contained
  and easy to test. The pipeline can be re-ingested at any time by calling
  ingest_directory again (upsert semantics prevent duplicates).
"""

from __future__ import annotations

from pathlib import Path
from typing import List

from backend.app.models.chat import RetrievedDocument
from backend.app.rag.chunker import chunk_documents
from backend.app.rag.document_loader import load_documents_from_directory
from backend.app.rag.embeddings import WatsonxEmbedder
from backend.app.rag.retriever import KnowledgeRetriever
from backend.app.rag.vector_store import ChromaVectorStore
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)

# Number of chunks to embed in a single IBM API call.
# Smaller batches reduce memory pressure and avoid API timeouts on large ingests.
_EMBED_BATCH_SIZE = 32


class RAGPipeline:
    """Full RAG pipeline: ingestion + retrieval.

    Instantiate once on application startup (see backend/app/main.py lifespan).
    """

    def __init__(self) -> None:
        self._embedder = WatsonxEmbedder()
        self._vector_store = ChromaVectorStore()
        self._retriever = KnowledgeRetriever(self._embedder, self._vector_store)
        logger.info("RAGPipeline initialised.")

    # ------------------------------------------------------------------
    # Public: ingestion
    # ------------------------------------------------------------------

    def ingest_directory(self, directory: str | Path) -> int:
        """Load, chunk, embed, and store all documents in *directory*.

        This method is idempotent — running it multiple times on the same
        directory will upsert (not duplicate) chunks because ChromaDB uses
        the chunk_id as the primary key.

        Args:
            directory: Path to the knowledge-base root directory.

        Returns:
            Number of chunks successfully ingested.
        """
        logger.info("Starting ingestion from directory: %s", directory)

        # Step 1: Load raw documents from disk
        documents = load_documents_from_directory(directory)
        if not documents:
            logger.warning("No documents found in %s — nothing to ingest.", directory)
            return 0

        # Step 2: Split documents into overlapping chunks
        chunks = chunk_documents(documents)
        if not chunks:
            logger.warning("Chunking produced no chunks — check document content.")
            return 0

        # Step 3: Embed chunks in batches to avoid overwhelming the API
        all_embeddings: List[List[float]] = []
        for i in range(0, len(chunks), _EMBED_BATCH_SIZE):
            batch = chunks[i : i + _EMBED_BATCH_SIZE]
            texts = [c["content"] for c in batch]
            logger.info(
                "Embedding batch %d/%d (%d chunks)...",
                i // _EMBED_BATCH_SIZE + 1,
                (len(chunks) + _EMBED_BATCH_SIZE - 1) // _EMBED_BATCH_SIZE,
                len(batch),
            )
            batch_embeddings = self._embedder.embed(texts)
            all_embeddings.extend(batch_embeddings)

        # Step 4: Store chunks and embeddings in ChromaDB
        self._vector_store.upsert_chunks(chunks, all_embeddings)

        logger.info(
            "Ingestion complete: %d documents -> %d chunks stored.",
            len(documents),
            len(chunks),
        )
        return len(chunks)

    # ------------------------------------------------------------------
    # Public: retrieval (called on every chat request)
    # ------------------------------------------------------------------

    def retrieve(self, query: str, top_k: int = 5) -> List[RetrievedDocument]:
        """Retrieve the most relevant knowledge-base chunks for *query*.

        Args:
            query: The farmer's question.
            top_k: Maximum number of chunks to return.

        Returns:
            List of :class:`RetrievedDocument` sorted by relevance.
        """
        return self._retriever.retrieve(query, top_k=top_k)
