import uuid
import structlog
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.api.v1.meta import get_db_user_from_claims
from app.models.user import User
from app.models.notification import Notification

logger = structlog.get_logger()
router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class NotificationResponse(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    read: bool
    created_at: datetime


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("", response_model=List[NotificationResponse], summary="Get all user notifications")
async def list_notifications(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns list of the 20 most recent notifications for the currently logged in user.
    """
    user = await get_db_user_from_claims(claims, db)
    stmt = select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(20)
    res = await db.execute(stmt)
    notifications = res.scalars().all()
    
    # If no notifications exist, generate a "Welcome to DGS" notification automatically!
    if not notifications:
        welcome = Notification(
            user_id=user.id,
            title="Welcome to DGS!",
            message="Your Meta Ads optimizer profile is active. Connect your Facebook Ad Account to begin optimizing.",
            read=False
        )
        db.add(welcome)
        await db.commit()
        await db.refresh(welcome)
        notifications = [welcome]

    return notifications


@router.post("/{notification_id}/read", summary="Mark a single notification as read")
async def mark_as_read(
    notification_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Marks a specific notification as read.
    """
    user = await get_db_user_from_claims(claims, db)
    stmt = select(Notification).where(Notification.id == notification_id).where(Notification.user_id == user.id)
    res = await db.execute(stmt)
    notification = res.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied."
        )

    notification.read = True
    await db.commit()
    return {"status": "success", "message": "Notification marked as read."}


@router.post("/read-all", summary="Mark all user notifications as read")
async def mark_all_read(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Marks all unread notifications of the user as read.
    """
    user = await get_db_user_from_claims(claims, db)
    stmt = update(Notification).where(Notification.user_id == user.id).where(Notification.read == False).values(read=True)
    await db.execute(stmt)
    await db.commit()
    return {"status": "success", "message": "All notifications marked as read."}
