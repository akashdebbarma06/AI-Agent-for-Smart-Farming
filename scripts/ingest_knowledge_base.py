#!/usr/bin/env python3
"""
KrishiMitra AI — Knowledge Base Ingestion Script.

Run this script once (and whenever you add new documents) to:
  1. Load all documents from data/knowledge_base/
  2. Split them into chunks
  3. Generate embeddings via IBM watsonx.ai
  4. Store everything in ChromaDB (./data/chroma_db/)

Usage:
    # From the project root directory:
    python scripts/ingest_knowledge_base.py

    # Or explicitly specify the knowledge base path:
    python scripts/ingest_knowledge_base.py --kb-dir ./data/knowledge_base

Prerequisites:
    - .env file with valid IBM_WATSONX_API_KEY and IBM_WATSONX_PROJECT_ID
    - pip install -r backend/requirements.txt

This script is idempotent — running it multiple times on the same documents
will upsert (not duplicate) the chunks in ChromaDB.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

# Add the project root to sys.path so backend package imports work
# when the script is run from any directory.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest knowledge-base documents into ChromaDB.")
    parser.add_argument(
        "--kb-dir",
        type=Path,
        default=_PROJECT_ROOT / "data" / "knowledge_base",
        help="Path to the knowledge-base root directory (default: data/knowledge_base).",
    )
    args = parser.parse_args()

    kb_dir: Path = args.kb_dir.resolve()

    if not kb_dir.is_dir():
        print(f"[ERROR] Knowledge-base directory not found: {kb_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Starting ingestion from: {kb_dir}")
    print("[INFO] Loading IBM watsonx.ai credentials from environment...")

    # Import here (after sys.path setup) so the backend package is available
    from backend.app.rag.pipeline import RAGPipeline  # noqa: PLC0415

    pipeline = RAGPipeline()

    start = time.monotonic()
    chunk_count = pipeline.ingest_directory(kb_dir)
    elapsed = time.monotonic() - start

    if chunk_count == 0:
        print("[WARNING] No chunks were ingested. Check that the knowledge-base directory contains .md/.txt/.pdf files.")
        sys.exit(1)

    print(f"[SUCCESS] Ingested {chunk_count} chunks in {elapsed:.1f}s.")
    print("[INFO] ChromaDB is ready. You can now start the backend server.")


if __name__ == "__main__":
    main()
