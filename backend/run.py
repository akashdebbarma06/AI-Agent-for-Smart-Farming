#!/usr/bin/env python3
"""
KrishiMitra AI — Uvicorn server entry point.

Run from the project root:
    python backend/run.py

Or directly with uvicorn:
    uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the project root is on sys.path so 'backend' is importable
# regardless of which directory the script is launched from.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))

import uvicorn  # noqa: E402 (import after sys.path modification)

if __name__ == "__main__":
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(_PROJECT_ROOT / "backend")],
        log_level="info",
    )
