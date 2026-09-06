"""
KrishiMitra AI — Document Loader.

Walks a directory tree and loads text content from .md, .txt, and .pdf files.
Returns plain-text content alongside the source filename so the RAG pipeline
can attach provenance to every retrieved chunk.

Why a dedicated loader module?
  The RAG pipeline needs to be able to re-ingest documents on demand
  (e.g. after adding new knowledge-base files) without touching any other layer.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import List, TypedDict

from backend.app.utils.logger import get_logger

logger = get_logger(__name__)


class RawDocument(TypedDict):
    """A single loaded document before chunking."""

    content: str
    source: str  # Human-readable filename/path used as citation


def _load_text_file(path: Path) -> str:
    """Read a plain-text or markdown file and return its contents."""
    return path.read_text(encoding="utf-8", errors="replace")


def _load_pdf_file(path: Path) -> str:
    """Extract all text from a PDF file page by page.

    Uses pypdf — no OCR; only works on text-based PDFs.
    """
    try:
        from pypdf import PdfReader  # Lazy import — only needed for PDFs
    except ImportError:
        logger.warning("pypdf is not installed; skipping PDF: %s", path)
        return ""

    reader = PdfReader(str(path))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages)


_LOADERS = {
    ".md": _load_text_file,
    ".txt": _load_text_file,
    ".pdf": _load_pdf_file,
}


def load_documents_from_directory(directory: str | Path) -> List[RawDocument]:
    """Recursively load all supported documents from *directory*.

    Supported formats: .md, .txt, .pdf

    Args:
        directory: Path to the root directory containing knowledge-base files.

    Returns:
        List of :class:`RawDocument` dicts, one per file.
        Files that fail to load are skipped with a warning.
    """
    root = Path(directory).resolve()
    if not root.is_dir():
        raise ValueError(f"Document directory does not exist: {root}")

    documents: List[RawDocument] = []

    for file_path in sorted(root.rglob("*")):
        if not file_path.is_file():
            continue

        suffix = file_path.suffix.lower()
        loader = _LOADERS.get(suffix)
        if loader is None:
            continue  # Skip unsupported file types silently

        try:
            content = loader(file_path)
            if not content.strip():
                logger.debug("Skipping empty file: %s", file_path)
                continue

            # Use relative path as the human-readable source name
            source = str(file_path.relative_to(root))
            documents.append({"content": content, "source": source})
            logger.debug("Loaded document: %s (%d chars)", source, len(content))

        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to load %s: %s", file_path, exc)

    logger.info("Loaded %d documents from %s", len(documents), root)
    return documents
