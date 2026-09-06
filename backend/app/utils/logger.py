"""
KrishiMitra AI — Application logger.

Configures a single root logger for the entire backend using the
log level declared in settings. Import `get_logger` in any module
rather than calling `logging.getLogger` directly, so all loggers
share the same format and level configuration.
"""

from __future__ import annotations

import logging
import sys
from functools import lru_cache

# Deferred import to avoid a circular dependency during settings init.
# settings is available by the time any route/service requests a logger.


@lru_cache(maxsize=None)
def _configure_root_logger(level: str) -> None:
    """Set up the root logger exactly once (lru_cache enforces this)."""
    numeric_level = getattr(logging, level.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(numeric_level)

    formatter = logging.Formatter(
        fmt="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(numeric_level)

    # Avoid duplicate handlers if this is called more than once in tests
    if not root.handlers:
        root.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger with the project-wide configuration applied.

    Args:
        name: Typically ``__name__`` of the calling module.

    Returns:
        A configured :class:`logging.Logger` instance.
    """
    # Import here (not at module top) to allow settings to finish loading first
    from backend.app.config.settings import settings

    _configure_root_logger(settings.LOG_LEVEL)
    return logging.getLogger(name)
