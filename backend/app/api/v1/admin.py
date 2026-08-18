"""
Digital Growth Studio — Admin Control Panel Router
"""
import uuid
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.api.v1.meta import get_db_user_from_claims
from app.models.user import User
from app.models.meta import MetaAdAccount, MetaConnection
from app.models.subscription import Subscription
from app.models.ticket import SupportTicket
from app.models.notification import Notification

logger = structlog.get_logger()
router = APIRouter(prefix="/admin", tags=["Admin Control Panel"])


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class PlanCount(BaseModel):
    plan: str
    count: int


class PlatformStatsResponse(BaseModel):
    total_users: int
    connected_ad_accounts: int
    active_connections: int
    plan_distribution: List[PlanCount]


class AdminUserItem(BaseModel):
    id: uuid.UUID
    email: str
    name: Optional[str] = None
    plan_id: str
    status: str
    connected_accounts_count: int
    last_sync_status: Optional[str] = None


class PlanOverrideRequest(BaseModel):
    plan_id: str


class StatusOverrideRequest(BaseModel):
    status: str


# ──────────────────────────────────────────────
# Helper: Verify Admin Role
# ──────────────────────────────────────────────
def verify_admin(claims: dict):
    email = claims.get("email", "")
    # Admin checks: whitelisted emails
    whitelisted_admins = {
        "flasshgames2026@gmail.com",
        "digitalgrowthstudioteam@gmail.com",
    }
    if email not in whitelisted_admins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin authorization required to access this control node."
        )


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("/stats", response_model=PlatformStatsResponse, summary="Query platform-wide metrics overview")
async def get_platform_stats(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns platform-wide user, database pipeline connections, and plan distribution aggregates.
    """
    verify_admin(claims)

    # 1. Total Users
    stmt_users = select(func.count(User.id))
    res_users = await db.execute(stmt_users)
    total_users = res_users.scalar_one()

    # 2. Total Connected Ad Accounts
    stmt_accs = select(func.count(MetaAdAccount.id))
    res_accs = await db.execute(stmt_accs)
    total_accs = res_accs.scalar_one()

    # 3. Active Connections (connected status)
    stmt_conns = select(func.count(MetaConnection.id)).where(MetaConnection.status == "connected")
    res_conns = await db.execute(stmt_conns)
    active_conns = res_conns.scalar_one()

    # 4. Plan Distribution
    stmt_plans = select(User.plan_id, func.count(User.id)).group_by(User.plan_id)
    res_plans = await db.execute(stmt_plans)
    plans_rows = res_plans.all()

    plan_counts = []
    for r in plans_rows:
        plan_counts.append(PlanCount(plan=r.plan_id or "starter", count=r[1]))

    return PlatformStatsResponse(
        total_users=total_users,
        connected_ad_accounts=total_accs,
        active_connections=active_conns,
        plan_distribution=plan_counts,
    )


@router.get("/users", response_model=List[AdminUserItem], summary="List all active platform users")
async def list_platform_users(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns lists of all platform users alongside connection metrics and active plan settings.
    """
    verify_admin(claims)

    # Query all users, fetch connection count and last sync status
    stmt = (
        select(
            User,
            func.count(MetaAdAccount.id).label("acc_count"),
            func.max(MetaConnection.last_sync_status).label("last_sync"),
        )
        .outerjoin(MetaAdAccount, User.id == MetaAdAccount.user_id)
        .outerjoin(MetaConnection, User.id == MetaConnection.user_id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    user_items = []
    for r in rows:
        user = r.User
        user_items.append(
            AdminUserItem(
                id=user.id,
                email=user.email,
                name=user.name,
                plan_id=user.plan_id or "starter",
                status=user.status,
                connected_accounts_count=r.acc_count,
                last_sync_status=r.last_sync,
            )
        )
    return user_items


@router.post("/users/{user_id}/plan", summary="Override a user's subscription plan")
async def override_user_plan(
    user_id: uuid.UUID,
    req: PlanOverrideRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Overrides the subscription plan level of a user directly in the database.
    """
    verify_admin(claims)

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # Upgrade/overwrite plan
    user.plan_id = req.plan_id
    await db.commit()

    logger.info("admin_plan_override_success", user_id=user_id, plan=req.plan_id)
    return {"status": "success", "message": f"Successfully updated user plan to {req.plan_id}."}


@router.post("/users/{user_id}/status", summary="Suspend or reactivate a user")
async def override_user_status(
    user_id: uuid.UUID,
    req: StatusOverrideRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Suspends or reactivates a user's access status directly in the database.
    """
    verify_admin(claims)

    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # Overwrite status
    user.status = req.status
    await db.commit()

    logger.info("admin_status_override_success", user_id=user_id, status=req.status)
    return {"status": "success", "message": f"Successfully set user status to {req.status}."}


# ──────────────────────────────────────────────
# Pricing Configurations Admin APIs
# ──────────────────────────────────────────────
from app.services.entitlement_engine import PLANS_CONFIG, ADDONS_CONFIG

class PricingConfigResponse(BaseModel):
    plans: dict
    addons: dict

class UpdatePlanConfigRequest(BaseModel):
    plan_id: str
    price_monthly: Optional[int] = None
    max_meta_accounts: Optional[int] = None
    historical_days: Optional[int] = None
    sync_interval_hours: Optional[int] = None
    max_team_members: Optional[int] = None

class UpdateAddonConfigRequest(BaseModel):
    addon_id: str
    price_monthly: Optional[int] = None
    price_annual: Optional[int] = None
    description: Optional[str] = None


@router.get("/pricing/config", response_model=PricingConfigResponse, summary="Query SaaS pricing configurations")
async def get_pricing_config(
    claims: dict = Depends(get_current_user),
):
    """
    Returns the live PLANS_CONFIG and ADDONS_CONFIG.
    """
    verify_admin(claims)
    return PricingConfigResponse(plans=PLANS_CONFIG, addons=ADDONS_CONFIG)


@router.post("/pricing/plan", summary="Modify plan parameters config variables")
async def update_plan_config(
    req: UpdatePlanConfigRequest,
    claims: dict = Depends(get_current_user),
):
    """
    Modifies plan limit parameters. Changes apply to subsequent entitlement checks.
    """
    verify_admin(claims)
    plan_normalized = req.plan_id.lower()
    
    if plan_normalized not in PLANS_CONFIG:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plan '{req.plan_id}' does not exist."
        )
        
    cfg = PLANS_CONFIG[plan_normalized]
    
    if req.price_monthly is not None:
        cfg["price_monthly"] = req.price_monthly
    if req.max_meta_accounts is not None:
        cfg["max_meta_accounts"] = req.max_meta_accounts
    if req.historical_days is not None:
        cfg["historical_days"] = req.historical_days
    if req.sync_interval_hours is not None:
        cfg["sync_interval_hours"] = req.sync_interval_hours
    if req.max_team_members is not None:
        cfg["max_team_members"] = req.max_team_members
        
    logger.info("admin_plan_config_updated", plan_id=req.plan_id)
    return {"status": "success", "message": f"Successfully updated plan config for: {req.plan_id}."}


@router.post("/pricing/addon", summary="Modify add-on parameters config variables")
async def update_addon_config(
    req: UpdateAddonConfigRequest,
    claims: dict = Depends(get_current_user),
):
    """
    Modifies paid add-on configurations dynamically.
    """
    verify_admin(claims)
    
    if req.addon_id not in ADDONS_CONFIG:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Add-on '{req.addon_id}' does not exist."
        )
        
    cfg = ADDONS_CONFIG[req.addon_id]
    
    if req.price_monthly is not None:
        cfg["price_monthly"] = req.price_monthly
    if req.price_annual is not None:
        cfg["price_annual"] = req.price_annual
    if req.description is not None:
        cfg["description"] = req.description
        
    logger.info("admin_addon_config_updated", addon_id=req.addon_id)
    return {"status": "success", "message": f"Successfully updated addon config for: {req.addon_id}."}


class TicketReplyRequest(BaseModel):
    reply: str
    status: str = "resolved"  # in_progress, resolved


@router.get("/tickets", summary="Query all platform support tickets")
async def list_all_tickets(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns platform-wide listing of support tickets raised by users.
    """
    verify_admin(claims)
    stmt = select(SupportTicket, User.email.label("user_email")).join(User, SupportTicket.user_id == User.id).order_by(SupportTicket.created_at.desc())
    res = await db.execute(stmt)
    rows = res.all()
    
    tickets_list = []
    for r in rows:
        t = r.SupportTicket
        tickets_list.append({
            "id": t.id,
            "user_id": t.user_id,
            "user_email": r.user_email,
            "subject": t.subject,
            "description": t.description,
            "category": t.category,
            "status": t.status,
            "admin_reply": t.admin_reply,
            "created_at": t.created_at,
        })
    return tickets_list


@router.post("/tickets/{ticket_id}/reply", summary="Reply to and resolve a support ticket")
async def reply_to_ticket(
    ticket_id: uuid.UUID,
    req: TicketReplyRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Saves an administrator answer and updates support ticket resolution status.
    """
    verify_admin(claims)

    stmt = select(SupportTicket).where(SupportTicket.id == ticket_id)
    res = await db.execute(stmt)
    ticket = res.scalar_one_or_none()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support ticket not found."
        )

    ticket.admin_reply = req.reply
    ticket.status = req.status
    
    # Generate user notification
    notif = Notification(
        user_id=ticket.user_id,
        title="Support Ticket Answered",
        message=f"Admin replied to your ticket: '{ticket.subject}'. Status updated to {req.status.upper()}.",
        read=False
    )
    db.add(notif)
    await db.commit()

    logger.info("admin_ticket_replied_success", ticket_id=ticket_id, status=req.status)
    return {"status": "success", "message": f"Successfully replied and marked ticket as {req.status}."}
