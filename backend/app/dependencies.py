"""
Digital Growth Studio — FastAPI Dependencies
Dependency injection for authentication, database sessions, and services.
"""
import structlog
from fastapi import Depends, Header
from typing import Optional

from app.database import get_db, AsyncSession

logger = structlog.get_logger()


# ──────────────────────────────────────────────
# Database Session Dependency
# ──────────────────────────────────────────────
async def get_database_session() -> AsyncSession:
    """Provide an async database session."""
    async for session in get_db():
        yield session


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.firebase import verify_firebase_token
from app.core.exceptions import NotAuthenticatedException

security = HTTPBearer(auto_error=False)


# ──────────────────────────────────────────────
# Authentication Dependency (Phase 1)
# ──────────────────────────────────────────────
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Extracts the Firebase ID token from the Authorization header,
    verifies it with Firebase Admin SDK, and returns user claims.
    NEVER trust user_id from the frontend — always derive it from this dependency.
    """
    if not credentials:
        raise NotAuthenticatedException("Not authenticated")
        
    token = credentials.credentials
    claims = await verify_firebase_token(token)
    if not claims:
        raise NotAuthenticatedException("Invalid or expired authentication token")
    return claims


# ──────────────────────────────────────────────
# Subscription Dependency (Phase 9)
# ──────────────────────────────────────────────
# This will verify that the authenticated user has an active subscription.
#
# async def require_active_subscription(
#     user: User = Depends(get_current_user),
#     db: AsyncSession = Depends(get_database_session),
# ) -> User:
#     ...


# ──────────────────────────────────────────────
# Admin Dependency (Phase 10)
# ──────────────────────────────────────────────
# async def require_admin(
#     user: User = Depends(get_current_user),
# ) -> User:
#     ...
