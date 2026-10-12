"""Vercel entrypoint for the Garmin sync service.

Vercel's Python runtime looks for functions under a top-level ``api/``
directory; the real app lives in ``garmin_service/`` so it can be tested and
run with uvicorn locally.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from garmin_service.app import app  # noqa: E402

__all__ = ["app"]
