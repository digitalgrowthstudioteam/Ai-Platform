"""
Digital Growth Studio — Firebase Admin SDK Integration
Handles Firebase token verification on the backend.
"""
import structlog
from typing import Optional

logger = structlog.get_logger()

# Firebase Admin SDK will be initialized in Phase 1
# This module provides the scaffolding

_firebase_app = None


def initialize_firebase(service_account_path: Optional[str] = None):
    """
    Initialize Firebase Admin SDK.
    Called during application startup.
    """
    global _firebase_app
    from app.config import get_settings
    settings = get_settings()

    try:
        import firebase_admin
        from firebase_admin import credentials
        import os
        import json

        if _firebase_app is not None:
            logger.info("firebase_already_initialized")
            return

        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("firebase_initialized_with_certificate_file")
        elif os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"):
            service_account_info = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"])
            cred = credentials.Certificate(service_account_info)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("firebase_initialized_with_env_json")
        else:
            project_id = getattr(settings, "FIREBASE_PROJECT_ID", "digital-growth-studio")
            _firebase_app = firebase_admin.initialize_app(
                options={"projectId": project_id}
            )
            logger.info("firebase_initialized_with_project_id", project_id=project_id)

    except Exception as e:
        logger.error("firebase_initialization_failed", error=str(e))
        raise


async def verify_firebase_token(id_token: str) -> Optional[dict]:
    """
    Verify a Firebase ID token and return decoded claims.

    Args:
        id_token: The Firebase ID token from the frontend.

    Returns:
        Decoded token claims dict, or None if verification fails.

    Note:
        Never trust user_id from the frontend.
        Always derive it from the verified Firebase token.
    """
    try:
        from firebase_admin import auth

        decoded_token = auth.verify_id_token(id_token)
        logger.info(
            "firebase_token_verified",
            uid=decoded_token.get("uid"),
            # Never log the actual token
        )
        return decoded_token

    except Exception as e:
        logger.warning("firebase_token_verification_failed", error=str(e))
        return None
