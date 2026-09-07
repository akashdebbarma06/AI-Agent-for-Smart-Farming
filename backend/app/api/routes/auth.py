"""
KrishiMitra AI — Auth Configuration Route.

GET /api/v1/auth/config
  Returns public Firebase client configuration to frontend so that API keys
  do not need to be hardcoded in git.
"""

from __future__ import annotations

from fastapi import APIRouter

from backend.app.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/config")
async def get_firebase_config():
    """Return Firebase web client configuration derived from server environment variables."""
    return {
        "apiKey": settings.FIREBASE_API_KEY,
        "authDomain": settings.FIREBASE_AUTH_DOMAIN,
        "projectId": settings.FIREBASE_PROJECT_ID,
        "storageBucket": settings.FIREBASE_STORAGE_BUCKET,
        "messagingSenderId": settings.FIREBASE_MESSAGING_SENDER_ID,
        "appId": settings.FIREBASE_APP_ID,
        "measurementId": settings.FIREBASE_MEASUREMENT_ID,
    }
