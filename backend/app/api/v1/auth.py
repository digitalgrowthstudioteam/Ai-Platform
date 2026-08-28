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
    
    # Resolve team membership status (exclude workspace owners accessing their own workspace)
    from app.models.team import TeamMember
    from sqlalchemy import select
    stmt_member = select(TeamMember).where(TeamMember.email == user.email.lower()).where(TeamMember.user_id != user.id)
    res_member = await db.execute(stmt_member)
    member_record = res_member.scalar_one_or_none()
    
    is_team_member = member_record is not None
    
    tabs_val = getattr(member_record, 'allowed_tabs', None)
    allowed_tabs_list = tabs_val.split(",") if tabs_val else None
    
    accounts_val = getattr(member_record, 'allowed_ad_accounts', None)
    allowed_accounts_list = accounts_val.split(",") if accounts_val else None
    
    return {
        "uid": claims.get("uid"),
        "email": claims.get("email"),
        "name": claims.get("name"),
        "picture": claims.get("picture"),
        "status": user.status,
        "deletion_scheduled_at": user.deletion_scheduled_at.isoformat() if user.deletion_scheduled_at else None,
        "is_team_member": is_team_member,
        "allowed_tabs": allowed_tabs_list,
        "allowed_ad_accounts": allowed_accounts_list,
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

    # Send account deletion scheduled email
    try:
        from app.services.email_service import EmailService
        from app.config import get_settings
        settings = get_settings()
        await EmailService.send_template_email(
            to_email=user.email,
            trigger_key="account_deleted",
            variables={
                "cancel_link": f"{settings.FRONTEND_URL}/settings/account"
            },
            db=db
        )
    except Exception as mail_err:
        logger.error("account_deletion_email_dispatch_failed", error=str(mail_err), user_id=user.id)
    
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
