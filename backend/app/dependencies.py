"""
Digital Growth Studio — FastAPI Dependencies
Dependency injection for authentication, database sessions, and services.
"""
import structlog
from datetime import datetime, timezone
from fastapi import Depends, Header, HTTPException, status
from typing import Optional

from app.database import get_db, AsyncSession
from app.models.user import User
from app.models.subscription import Subscription

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
async def require_active_subscription(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Verifies that the user has either an active paid subscription or an active free trial.
    Rejects with 402 Payment Required if expired/unsubscribed, or 403 if suspended.
    """
    from app.api.v1.meta import get_db_user_from_claims
    user = await get_db_user_from_claims(claims, db)
    
    # Super admins bypass subscription guards
    if user.email in ["flasshgames2026@gmail.com", "digitalgrowthstudioteam@gmail.com"]:
        return user
        
    if user.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact support."
        )

    # 1. Check for active paid subscription
    from sqlalchemy import select
    stmt = (
        select(Subscription)
        .where(Subscription.user_id == user.id)
        .where(Subscription.status == "active")
        .order_by(Subscription.expires_at.desc())
    )
    res = await db.execute(stmt)
    sub = res.scalar_one_or_none()
    
    if sub:
        return user

    # 2. Check trial status
    if user.trial_status == "active":
        now = datetime.now(timezone.utc)
        ends_at = user.trial_ends_at
        if ends_at:
            if ends_at.tzinfo is None:
                ends_at = ends_at.replace(tzinfo=timezone.utc)
            
            if now > ends_at:
                # Update status to expired
                user.trial_status = "expired"
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="Your 7-day trial has ended. Please subscribe to a paid plan to continue."
                )
            return user

    elif user.trial_status == "expired":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Your 7-day trial has ended. Please subscribe to a paid plan to continue."
        )

    elif user.trial_status == "not_started":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Please connect a Meta Ad Account and start your 7-day trial."
        )

    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail="Active subscription or trial is required to access paid features."
    )


# ──────────────────────────────────────────────
# Admin Dependency (Phase 10)
# ──────────────────────────────────────────────
# async def require_admin(
#     user: User = Depends(get_current_user),
# ) -> User:
#     ...
