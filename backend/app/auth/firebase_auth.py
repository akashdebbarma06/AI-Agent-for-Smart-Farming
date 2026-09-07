"""
KrishiMitra AI — Firebase Authentication Middleware.

Provides:
  - Firebase Admin SDK initialization
  - FastAPI dependency for verifying Firebase ID tokens
  - Decoded token model

The Firebase service account credentials can be provided via:
  1. FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string)
  2. GOOGLE_APPLICATION_CREDENTIALS env var (file path)
  3. Default credentials (when running on GCP)

If no Firebase credentials are configured, the auth dependency
will allow requests through but without verified user info.
This enables gradual rollout and local development.
"""

from __future__ import annotations

import json
import os
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.app.utils.logger import get_logger

logger = get_logger(__name__)

# --------------------------------------------------------------------------
# Firebase Admin initialization (lazy, singleton)
# --------------------------------------------------------------------------

_firebase_app = None
_firebase_initialized = False
_firebase_available = False

security = HTTPBearer(auto_error=False)


def _init_firebase() -> bool:
    """Initialize Firebase Admin SDK once. Returns True if successful."""
    global _firebase_app, _firebase_initialized, _firebase_available

    if _firebase_initialized:
        return _firebase_available

    _firebase_initialized = True

    try:
        import firebase_admin
        from firebase_admin import credentials as fb_credentials

        # Check if already initialized
        try:
            _firebase_app = firebase_admin.get_app()
            _firebase_available = True
            logger.info("Firebase Admin SDK already initialized.")
            return True
        except ValueError:
            pass

        # Try FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string)
        sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "")
        if sa_json:
            try:
                sa_dict = json.loads(sa_json)
                cred = fb_credentials.Certificate(sa_dict)
                _firebase_app = firebase_admin.initialize_app(cred)
                _firebase_available = True
                logger.info("Firebase Admin SDK initialized from FIREBASE_SERVICE_ACCOUNT_JSON.")
                return True
            except (json.JSONDecodeError, ValueError) as e:
                logger.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: %s", e)

        # Try GOOGLE_APPLICATION_CREDENTIALS env var (file path)
        ga_creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
        if ga_creds and os.path.isfile(ga_creds):
            cred = fb_credentials.Certificate(ga_creds)
            _firebase_app = firebase_admin.initialize_app(cred)
            _firebase_available = True
            logger.info("Firebase Admin SDK initialized from GOOGLE_APPLICATION_CREDENTIALS.")
            return True

        # Try default credentials (GCP environment)
        try:
            _firebase_app = firebase_admin.initialize_app()
            _firebase_available = True
            logger.info("Firebase Admin SDK initialized with default credentials.")
            return True
        except Exception:
            pass

        logger.warning(
            "Firebase Admin SDK NOT configured. Auth verification is DISABLED. "
            "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS "
            "to enable server-side token verification."
        )
        return False

    except ImportError:
        logger.warning(
            "firebase-admin package not installed. Auth verification is DISABLED. "
            "Run: pip install firebase-admin"
        )
        return False


def verify_firebase_token(id_token: str) -> Optional[dict]:
    """Verify a Firebase ID token and return the decoded claims.

    Returns None if verification fails or Firebase is not configured.
    """
    if not _init_firebase() or not _firebase_available:
        return None

    try:
        from firebase_admin import auth as fb_auth
        decoded = fb_auth.verify_id_token(id_token)
        return decoded
    except Exception as e:
        logger.warning("Firebase token verification failed: %s", e)
        return None


# --------------------------------------------------------------------------
# FastAPI Dependency
# --------------------------------------------------------------------------

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """FastAPI dependency that extracts and verifies the Firebase ID token.

    If the token is present and valid, returns the decoded token dict with keys like:
        - uid: Firebase user ID
        - phone_number: Verified phone number
        - etc.

    If no token is provided or Firebase is not configured, returns None.
    This allows the app to work without auth during development.
    """
    if credentials is None:
        return None

    token = credentials.credentials
    if not token:
        return None

    decoded = verify_firebase_token(token)
    if decoded is None:
        # Token was provided but invalid
        logger.warning("Invalid or expired Firebase token received.")
        # Don't block the request — just return None for now
        # To enforce auth, uncomment the HTTPException below:
        # raise HTTPException(
        #     status_code=status.HTTP_401_UNAUTHORIZED,
        #     detail="Invalid or expired authentication token.",
        # )
        return None

    return decoded
