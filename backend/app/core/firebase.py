"""
Digital Growth Studio — Firebase Admin SDK Integration
Handles Firebase token verification on the backend.
"""
import structlog
import requests
from typing import Optional

logger = structlog.get_logger()

_firebase_app = None
GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"


def initialize_firebase(service_account_path: Optional[str] = None):
    """
    Initialize Firebase Admin SDK cleanly on application startup.
    """
    global _firebase_app
    from app.config import get_settings
    settings = get_settings()

    try:
        import firebase_admin
        from firebase_admin import credentials
        import os

        if _firebase_app is not None:
            logger.info("firebase_already_initialized")
            return

        if service_account_path and os.path.exists(service_account_path):
            try:
                cred = credentials.Certificate(service_account_path)
                _firebase_app = firebase_admin.initialize_app(cred)
                logger.info("firebase_initialized_with_certificate_file")
                return
            except Exception as cert_err:
                logger.warning("firebase_certificate_file_failed", error=str(cert_err))

        project_id = getattr(settings, "FIREBASE_PROJECT_ID", "digital-growth-studio")
        try:
            _firebase_app = firebase_admin.initialize_app(
                options={"projectId": project_id}
            )
            logger.info("firebase_initialized_with_project_id", project_id=project_id)
        except Exception:
            pass

    except Exception as e:
        logger.error("firebase_initialization_failed", error=str(e))


def _verify_id_token_public(id_token: str, project_id: str = "digital-growth-studio") -> Optional[dict]:
    """
    Fallback: Verifies Firebase ID Token using Google's public x509 certificates.
    Does NOT require a private key or service account JSON.
    """
    try:
        from jose import jwt
        res = requests.get(GOOGLE_CERTS_URL, timeout=10)
        if not res.ok:
            return None
        certs = res.json()

        header = jwt.get_unverified_header(id_token)
        kid = header.get("kid")
        if not kid or kid not in certs:
            return None

        cert_pem = certs[kid]
        decoded = jwt.decode(
            id_token,
            cert_pem,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}"
        )
        return decoded
    except Exception as e:
        logger.warning("public_firebase_token_verification_failed", error=str(e))
        return None


async def verify_firebase_token(id_token: str) -> Optional[dict]:
    """
    Verify a Firebase ID token and return decoded claims.
    """
    from app.config import get_settings
    settings = get_settings()
    project_id = getattr(settings, "FIREBASE_PROJECT_ID", "digital-growth-studio")

    try:
        from firebase_admin import auth
        decoded_token = auth.verify_id_token(id_token)
        logger.info("firebase_token_verified_sdk", uid=decoded_token.get("uid"))
        return decoded_token
    except Exception as sdk_err:
        logger.debug("firebase_sdk_verify_failed_trying_public", error=str(sdk_err))

    decoded_public = _verify_id_token_public(id_token, project_id)
    if decoded_public:
        logger.info("firebase_token_verified_public", uid=decoded_public.get("uid") or decoded_public.get("sub"))
        return decoded_public

    return None
