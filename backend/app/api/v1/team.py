import asyncio
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
from app.services.email_service import EmailService
from app.config import get_settings

logger = structlog.get_logger()
router = APIRouter(prefix="/team", tags=["Team Management"])


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class TeamMemberInviteRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    role: str = "member"  # admin, member, viewer
    allowed_tabs: Optional[List[str]] = None
    allowed_ad_accounts: Optional[List[str]] = None


class TeamMemberResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: Optional[str] = None
    role: str
    status: str
    allowed_tabs: Optional[List[str]] = None
    allowed_ad_accounts: Optional[List[str]] = None
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
    
    # Resolve workspace owner ID
    stmt_owner = select(TeamMember.user_id).where(TeamMember.email == user.email.lower())
    res_owner = await db.execute(stmt_owner)
    owner_id = res_owner.scalar_one_or_none()
    workspace_owner_id = owner_id if owner_id else user.id

    stmt = select(TeamMember).where(TeamMember.user_id == workspace_owner_id).order_by(TeamMember.created_at.desc())
    res = await db.execute(stmt)
    members = res.scalars().all()
    
    resp = []
    for m in members:
        tabs_val = getattr(m, 'allowed_tabs', None)
        tabs_list = tabs_val.split(",") if tabs_val else ["/dashboard", "/briefs/daily", "/briefs/weekly", "/campaigns", "/ad-sets", "/ads"]
        
        accounts_val = getattr(m, 'allowed_ad_accounts', None)
        accounts_list = accounts_val.split(",") if accounts_val else []
        
        resp.append(TeamMemberResponse(
            id=m.id,
            email=m.email,
            name=m.name,
            role=m.role,
            status=m.status,
            allowed_tabs=tabs_list,
            allowed_ad_accounts=accounts_list,
            created_at=m.created_at
        ))
    return resp


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

    # Resolve workspace owner
    stmt_owner = select(TeamMember.user_id).where(TeamMember.email == user.email.lower())
    res_owner = await db.execute(stmt_owner)
    owner_id = res_owner.scalar_one_or_none()
    workspace_owner_id = owner_id if owner_id else user.id
    
    stmt_owner_user = select(User).where(User.id == workspace_owner_id)
    res_owner_user = await db.execute(stmt_owner_user)
    workspace_owner = res_owner_user.scalar_one()

    # 1. Resolve plan entitlements for team members limit
    entitlements = await EntitlementEngine.resolve_entitlements(workspace_owner, db)
    max_seats = entitlements.get("max_team_members", 1)

    # 2. Count existing team members
    stmt_count = select(func.count(TeamMember.id)).where(TeamMember.user_id == workspace_owner_id)
    res_count = await db.execute(stmt_count)
    current_count = res_count.scalar_one()

    # Total seats used = current team members + 1 (the owner user)
    if current_count + 1 >= max_seats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Team seat limit reached ({current_count + 1}/{max_seats} used). Please upgrade your subscription plan to add more team members."
        )

    # 3. Prevent duplicate invitations for same email
    stmt_dup = select(TeamMember).where(TeamMember.user_id == workspace_owner_id).where(TeamMember.email == req.email.lower())
    res_dup = await db.execute(stmt_dup)
    if res_dup.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A team member with this email has already been invited."
        )

    # 4. Create team member
    allowed_str = ",".join(req.allowed_tabs) if req.allowed_tabs is not None else "/dashboard,/briefs/daily,/briefs/weekly,/campaigns,/ad-sets,/ads"
    allowed_accounts_str = ",".join(req.allowed_ad_accounts) if req.allowed_ad_accounts is not None else ""
    token = str(uuid.uuid4())
    member = TeamMember(
        user_id=workspace_owner_id,
        email=req.email.lower(),
        name=req.name,
        role=req.role,
        status="pending",
        allowed_tabs=allowed_str,
        allowed_ad_accounts=allowed_accounts_str,
        invite_token=token,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    # 5. Send Email Invitation with unique link in non-blocking background task
    settings = get_settings()
    invite_link = f"{settings.FRONTEND_URL}/accept-invite?token={token}"
    asyncio.create_task(
        EmailService.send_invitation_email(
            to_email=req.email.lower(),
            invitee_name=req.name or "Colleague",
            inviter_name=user.name or user.email,
            invite_link=invite_link,
            db=None
        )
    )



    logger.info("team_member_invited", owner_id=workspace_owner_id, member_id=member.id, email=member.email)
    
    tabs_val = getattr(member, 'allowed_tabs', None)
    tabs_list = tabs_val.split(",") if tabs_val else ["/dashboard", "/briefs/daily", "/briefs/weekly", "/campaigns", "/ad-sets", "/ads"]
    
    accounts_val = getattr(member, 'allowed_ad_accounts', None)
    accounts_list = accounts_val.split(",") if accounts_val else []
    
    return TeamMemberResponse(
        id=member.id,
        email=member.email,
        name=member.name,
        role=member.role,
        status=member.status,
        allowed_tabs=tabs_list,
        allowed_ad_accounts=accounts_list,
        created_at=member.created_at
    )


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
    
    # Resolve workspace owner ID
    stmt_owner = select(TeamMember.user_id).where(TeamMember.email == user.email.lower())
    res_owner = await db.execute(stmt_owner)
    owner_id = res_owner.scalar_one_or_none()
    workspace_owner_id = owner_id if owner_id else user.id

    stmt = select(TeamMember).where(TeamMember.id == member_id).where(TeamMember.user_id == workspace_owner_id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found or access denied."
        )

    await db.delete(member)
    await db.commit()

    logger.info("team_member_removed", owner_id=workspace_owner_id, member_id=member_id)
    return {"status": "success", "message": "Team member successfully removed."}


class AcceptInviteRequest(BaseModel):
    token: str


@router.get("/invite-info", summary="Get invitation details by token")
async def get_invite_info(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public route to fetch details about an invitation link before accepting.
    """
    stmt = select(TeamMember).where(TeamMember.invite_token == token)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation token."
        )

    stmt_owner = select(User).where(User.id == member.user_id)
    res_owner = await db.execute(stmt_owner)
    owner = res_owner.scalar_one_or_none()

    return {
        "token": member.invite_token,
        "email": member.email,
        "name": member.name,
        "role": member.role,
        "status": member.status,
        "inviter_name": owner.name if owner and owner.name else (owner.email if owner else "Workspace Owner"),
        "inviter_email": owner.email if owner else "",
        "workspace_name": f"{owner.name or owner.email}'s Workspace" if owner else "Digital Growth Studio Workspace"
    }


@router.post("/accept-invite", summary="Accept a team invitation")
async def accept_team_invitation(
    req: AcceptInviteRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Accepts an invitation, updates member status to active, and emails the inviter.
    """
    stmt = select(TeamMember).where(TeamMember.invite_token == req.token)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation token."
        )

    # Resolve workspace owner
    stmt_owner = select(User).where(User.id == member.user_id)
    res_owner = await db.execute(stmt_owner)
    owner = res_owner.scalar_one_or_none()
    owner_email = owner.email if owner else ""

    # Update status to active
    member.status = "active"
    member.accepted_at = datetime.utcnow()
    db.add(member)
    await db.commit()

    # Trigger background email notification to workspace owner
    if owner_email:
        asyncio.create_task(
            EmailService.send_invitation_accepted_email(
                to_email=owner_email,
                invitee_name=member.name or member.email,
                invitee_email=member.email
            )
        )

    logger.info("team_invitation_accepted", member_id=member.id, email=member.email, owner_email=owner_email)
    return {
        "status": "success",
        "message": "Successfully accepted invitation! Welcome to the team.",
        "workspace_owner": owner.name or owner.email if owner else "Owner",
        "role": member.role
    }

