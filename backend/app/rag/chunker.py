"""
KrishiMitra AI — Text Chunker.

Splits long documents into smaller overlapping chunks that fit within the
embedding model's context window and give the retriever enough granularity
to find the most relevant passage.

Why overlap?
  Without overlap, a relevant sentence that happens to land at the boundary
  of two chunks might be cut in half, losing context. Overlap ensures key
  information is fully contained in at least one chunk.
"""

from __future__ import annotations

from typing import List, TypedDict

from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.app.rag.document_loader import RawDocument
from backend.app.utils.logger import get_logger

logger = get_logger(__name__)

# Chunk size chosen to stay comfortably within the 512-token context window
# of ibm/slate-125m-english-rtrvr (roughly 400 chars ≈ 100 tokens of safety margin).
_CHUNK_SIZE = 500
_CHUNK_OVERLAP = 100


class DocumentChunk(TypedDict):
    """A single text chunk ready for embedding."""

    content: str
    source: str   # Inherited from parent document — used for citation
    chunk_id: str  # Unique identifier: "{source}::chunk_{index}"


def chunk_documents(documents: List[RawDocument]) -> List[DocumentChunk]:
    """Split a list of raw documents into overlapping text chunks.

    Args:
        documents: Output of :func:`~backend.app.rag.document_loader.load_documents_from_directory`.

    Returns:
        Flat list of :class:`DocumentChunk` dicts ready for embedding.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=_CHUNK_SIZE,
        chunk_overlap=_CHUNK_OVERLAP,
        # Prefer splitting at paragraphs, then sentences, then words
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks: List[DocumentChunk] = []

    for doc in documents:
        split_texts = splitter.split_text(doc["content"])

        for idx, text in enumerate(split_texts):
            if not text.strip():
                continue
            chunks.append(
                {
                    "content": text,
                    "source": doc["source"],
                    "chunk_id": f"{doc['source']}::chunk_{idx}",
                }
            )

    logger.info(
        "Chunked %d documents into %d chunks (size=%d, overlap=%d)",
        len(documents),
        len(chunks),
        _CHUNK_SIZE,
        _CHUNK_OVERLAP,
    )
    return chunks
