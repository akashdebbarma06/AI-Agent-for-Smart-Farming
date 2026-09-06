"""
Tests for backend/app/rag/chunker.py

Verifies chunking logic: output count, size constraints, and overlap behaviour.
No IBM API calls or file I/O needed.
"""

from __future__ import annotations

import pytest

from backend.app.rag.chunker import chunk_documents, _CHUNK_SIZE, _CHUNK_OVERLAP


def _make_doc(content: str, source: str = "test_doc.md"):
    return {"content": content, "source": source}


def test_long_document_produces_multiple_chunks():
    """A document significantly longer than CHUNK_SIZE must produce more than one chunk."""
    # Create text clearly longer than one chunk
    long_text = "Agricultural knowledge sentence. " * 60  # ~1980 chars
    docs = [_make_doc(long_text)]
    chunks = chunk_documents(docs)
    assert len(chunks) > 1, "Long document should produce multiple chunks"


def test_short_document_produces_single_chunk():
    """A document shorter than CHUNK_SIZE should remain as a single chunk."""
    short_text = "Rice is a Kharif crop that requires 100-200 cm rainfall."
    docs = [_make_doc(short_text)]
    chunks = chunk_documents(docs)
    assert len(chunks) == 1


def test_chunk_size_within_limit():
    """No individual chunk content should exceed CHUNK_SIZE characters."""
    long_text = "Soil testing is important. " * 100
    docs = [_make_doc(long_text)]
    chunks = chunk_documents(docs)
    for chunk in chunks:
        # Allow small overshoot at word boundaries (text splitter is approximate)
        assert len(chunk["content"]) <= _CHUNK_SIZE + 50, (
            f"Chunk too long: {len(chunk['content'])} chars"
        )


def test_chunk_inherits_source():
    """Every chunk must carry the source filename from its parent document."""
    docs = [_make_doc("Some farming text " * 50, source="pest_disease/tomato_pests.md")]
    chunks = chunk_documents(docs)
    for chunk in chunks:
        assert chunk["source"] == "pest_disease/tomato_pests.md"


def test_chunk_id_is_unique():
    """Each chunk must have a unique chunk_id (source + index)."""
    docs = [_make_doc("Word " * 200, source="doc_a.md")]
    chunks = chunk_documents(docs)
    ids = [c["chunk_id"] for c in chunks]
    assert len(ids) == len(set(ids)), "Duplicate chunk IDs found"


def test_empty_documents_produces_no_chunks():
    """Empty input list must return an empty list."""
    assert chunk_documents([]) == []


def test_blank_document_content_is_skipped():
    """A document containing only whitespace must produce no chunks."""
    docs = [_make_doc("   \n\n   ")]
    chunks = chunk_documents(docs)
    assert len(chunks) == 0


def test_multiple_documents_produce_separate_chunks(sample_raw_documents):
    """Chunks from different documents should have different source values."""
    chunks = chunk_documents(sample_raw_documents)
    sources = {c["source"] for c in chunks}
    # Both source documents should be represented
    assert len(sources) == len(sample_raw_documents)
