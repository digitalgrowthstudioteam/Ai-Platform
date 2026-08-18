"""
Digital Growth Studio — Authentication Router
Endpoints for verifying user identity.
"""
from datetime import datetime
import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.api.v1.meta import get_db_user_from_claims
from app.schemas.auth import UserMeResponse

logger = structlog.get_logger()
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=UserMeResponse)
async def get_my_profile(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current logged-in user profile from Firebase token claims and database status.
    Secured route.
    """
    logger.info("get_profile_called", uid=claims.get("uid"))
    user = await get_db_user_from_claims(claims, db)
    
    return {
        "uid": claims.get("uid"),
        "email": claims.get("email"),
        "name": claims.get("name"),
        "picture": claims.get("picture"),
        "status": user.status,
        "deletion_scheduled_at": user.deletion_scheduled_at.isoformat() if user.deletion_scheduled_at else None,
    }


@router.post("/delete-account", summary="Schedule account for permanent deletion")
async def schedule_account_deletion(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Flags the user status as deletion_scheduled and stores timestamp.
    Starts the 7-day grace period.
    """
    user = await get_db_user_from_claims(claims, db)
    user.status = "deletion_scheduled"
    user.deletion_scheduled_at = datetime.utcnow()
    await db.commit()
    
    logger.info("account_deletion_scheduled", user_id=user.id)
    return {"status": "success", "message": "Account scheduled for deletion successfully."}


@router.post("/cancel-delete", summary="Restore deletion_scheduled account")
async def cancel_account_deletion(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Restores the account back to active status and clears the deletion timestamp.
    """
    user = await get_db_user_from_claims(claims, db)
    user.status = "active"
    user.deletion_scheduled_at = None
    await db.commit()
    
    logger.info("account_deletion_cancelled", user_id=user.id)
    return {"status": "success", "message": "Account deletion successfully cancelled."}
