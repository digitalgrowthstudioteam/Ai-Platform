import uuid
import structlog
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.api.v1.meta import get_db_user_from_claims
from app.models.user import User
from app.models.team import TeamMember
from app.services.entitlement_engine import EntitlementEngine

logger = structlog.get_logger()
router = APIRouter(prefix="/team", tags=["Team Management"])


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class TeamMemberInviteRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    role: str = "member"  # admin, member, viewer


class TeamMemberResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: Optional[str] = None
    role: str
    status: str
    created_at: datetime


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("", response_model=List[TeamMemberResponse], summary="List all team members")
async def list_team_members(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns list of invited team members for the currently logged in workspace owner.
    """
    user = await get_db_user_from_claims(claims, db)
    stmt = select(TeamMember).where(TeamMember.user_id == user.id).order_by(TeamMember.created_at.desc())
    res = await db.execute(stmt)
    members = res.scalars().all()
    return members


@router.post("/invite", response_model=TeamMemberResponse, summary="Invite a team member")
async def invite_team_member(
    req: TeamMemberInviteRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Invites a team member under plan entitlements seat caps.
    """
    user = await get_db_user_from_claims(claims, db)

    # 1. Resolve plan entitlements for team members limit
    entitlements = await EntitlementEngine.resolve_entitlements(user, db)
    max_seats = entitlements.get("max_team_members", 1)

    # 2. Count existing team members
    stmt_count = select(func.count(TeamMember.id)).where(TeamMember.user_id == user.id)
    res_count = await db.execute(stmt_count)
    current_count = res_count.scalar_one()

    # Total seats used = current team members + 1 (the owner user)
    if current_count + 1 >= max_seats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team seat limit reached ({current_count + 1}/{max_seats} used). Please upgrade your subscription plan to add more team members."
        )

    # 3. Prevent duplicate invitations for same email
    stmt_dup = select(TeamMember).where(TeamMember.user_id == user.id).where(TeamMember.email == req.email.lower())
    res_dup = await db.execute(stmt_dup)
    if res_dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A team member with this email has already been invited."
        )

    # 4. Create team member
    member = TeamMember(
        user_id=user.id,
        email=req.email.lower(),
        name=req.name,
        role=req.role,
        status="pending",
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    logger.info("team_member_invited", owner_id=user.id, member_id=member.id, email=member.email)
    return member


@router.delete("/{member_id}", summary="Remove a team member")
async def remove_team_member(
    member_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Revokes team access and deletes the team member record.
    """
    user = await get_db_user_from_claims(claims, db)
    stmt = select(TeamMember).where(TeamMember.id == member_id).where(TeamMember.user_id == user.id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found or access denied."
        )

    await db.delete(member)
    await db.commit()

    logger.info("team_member_removed", owner_id=user.id, member_id=member_id)
    return {"status": "success", "message": "Team member successfully removed."}
