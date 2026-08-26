"""
Digital Growth Studio — Admin Control Panel Router
"""
import uuid
import structlog
from datetime import datetime, timedelta
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
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
from app.models.campaign import Campaign
from app.models.subscription_addon import SubscriptionAddOn
from app.models.ads_service import ServiceQuotation
from app.models.ai_assistant import AICreditTransaction
from app.models.manual_expense import ManualExpense

logger = structlog.get_logger()
router = APIRouter(prefix="/admin", tags=["Admin Control Panel"])


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class PlanCount(BaseModel):
    plan: str
    count: int


class TrialStats(BaseModel):
    trials_started: int
    trials_active: int
    trials_expiring_today: int
    trials_expired: int
    trials_converted: int
    trial_conversion_rate: float


class PlatformStatsResponse(BaseModel):
    total_users: int
    connected_ad_accounts: int
    active_connections: int
    plan_distribution: List[PlanCount]
    total_campaigns: int
    total_addons_active: int
    trial_stats: TrialStats
    ai_individual_active_count: int
    ai_all_accounts_active_count: int
    ai_total_revenue_monthly_paise: int
    ai_churn_count: int
    ai_processing_cost_paise_estimate: int
    ai_gross_margin_percentage: float


class AdminUserItem(BaseModel):
    id: uuid.UUID
    email: str
    name: Optional[str] = None
    plan_id: str
    status: str
    connected_accounts_count: int
    last_sync_status: Optional[str] = None
    credits: int


class PlanOverrideRequest(BaseModel):
    plan_id: str


class StatusOverrideRequest(BaseModel):
    status: str


class AdminAddonOverrideRequest(BaseModel):
    addon_id: str
    quantity: int


class AdminCreditsOverrideRequest(BaseModel):
    credits: int


class AdminOptimizationSlotsOverrideRequest(BaseModel):
    slots: int


class AdminAdPackOverrideRequest(BaseModel):
    pack_type: str
    total_ad_credits: int
    used_ad_credits: int
    remaining_ad_credits: int
    expires_at_days: Optional[int] = 30
    price_paid: Optional[int] = 0


class AdminAdServiceRequestOverrideRequest(BaseModel):
    status: Optional[str] = None
    additional_services: Optional[list] = None


class AdminExpenseCreatePayload(BaseModel):
    category: str
    amount: float
    description: Optional[str] = None
    expense_date: Optional[datetime] = None


class AdminExpenseItem(BaseModel):
    id: uuid.UUID
    category: str
    amount: float
    currency: str
    description: Optional[str] = None
    expense_date: datetime
    created_at: datetime


class FinanceCategoryBreakdown(BaseModel):
    addons: int
    offers: int
    meta_ai_plans: int
    ai_intelligence: int
    one_time_credits: int


class FinanceStatsResponse(BaseModel):
    total_earned_paise: int
    gross_revenue_inr: float
    total_expenses_inr: float
    net_profit_inr: float
    category_breakdown: FinanceCategoryBreakdown
    
    quotations_pending_count: int
    quotations_pending_value_paise: int
    
    quotations_expired_count: int
    quotations_expired_value_paise: int
    
    quotations_expiring_tomorrow_count: int
    quotations_expiring_tomorrow_value_paise: int
    
    next_month_renewals_count: int
    next_month_renewals_value_paise: int
    
    active_subscriptions_count: int
    active_addons_count: int
    
    expenses: List[AdminExpenseItem]


# ──────────────────────────────────────────────
# Helper: Verify Admin Role
# ──────────────────────────────────────────────
def verify_admin(claims: dict):
    email = claims.get("email", "")
    # Admin checks: whitelisted emails
    whitelisted_admins = {
        "flasshgames2026@gmail.com",
        "digitalgrowthstudioteam@gmail.com",
        "vikramrwadkar@gmail.com",
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

    # 4. Total Campaigns
    stmt_camps = select(func.count(Campaign.id))
    res_camps = await db.execute(stmt_camps)
    total_camps = res_camps.scalar_one()

    # 5. Total Active Addons
    stmt_addons = select(func.count(SubscriptionAddOn.id)).where(SubscriptionAddOn.status == "active")
    res_addons = await db.execute(stmt_addons)
    total_addons = res_addons.scalar_one()

    # 6. Plan Distribution
    stmt_plans = select(User.plan_id, func.count(User.id)).group_by(User.plan_id)
    res_plans = await db.execute(stmt_plans)
    plans_rows = res_plans.all()

    plan_counts = []
    for r in plans_rows:
        plan_counts.append(PlanCount(plan=r.plan_id or "starter", count=r[1]))

    # 7. Trial Metrics
    now = datetime.utcnow()
    
    stmt_started = select(func.count(User.id)).where(User.trial_used == True)
    res_started = await db.execute(stmt_started)
    trials_started = res_started.scalar_one()

    stmt_active = select(func.count(User.id)).where(User.trial_status == "active").where(User.trial_ends_at > now)
    res_active = await db.execute(stmt_active)
    trials_active = res_active.scalar_one()

    stmt_expiring = select(func.count(User.id)).where(User.trial_status == "active").where(User.trial_ends_at >= now).where(User.trial_ends_at <= now + timedelta(days=1))
    res_expiring = await db.execute(stmt_expiring)
    trials_expiring = res_expiring.scalar_one()

    stmt_expired = select(func.count(User.id)).where(User.trial_status == "expired")
    res_expired = await db.execute(stmt_expired)
    trials_expired = res_expired.scalar_one()

    # Trials Converted: trial_used = True and has an active paid subscription
    stmt_converted = (
        select(func.count(User.id))
        .join(Subscription, User.id == Subscription.user_id)
        .where(User.trial_used == True)
        .where(Subscription.status == "active")
    )
    res_converted = await db.execute(stmt_converted)
    trials_converted = res_converted.scalar_one()

    conversion_rate = (trials_converted / trials_started * 100.0) if trials_started > 0 else 0.0

    trial_stats_obj = TrialStats(
        trials_started=trials_started,
        trials_active=trials_active,
        trials_expiring_today=trials_expiring,
        trials_expired=trials_expired,
        trials_converted=trials_converted,
        trial_conversion_rate=round(conversion_rate, 2),
    )

    # Compute AI Intelligence specific admin metrics
    stmt_ai_active = select(SubscriptionAddOn).where(SubscriptionAddOn.status == "active")
    res_ai_active = await db.execute(stmt_ai_active)
    active_addons_all = res_ai_active.scalars().all()

    ai_ind_count = 0
    ai_all_count = 0
    ai_rev_monthly_paise = 0

    for addon in active_addons_all:
        if addon.addon_id == "AI_INTELLIGENCE_INDIVIDUAL_MONTHLY":
            ai_ind_count += addon.quantity
            ai_rev_monthly_paise += 49900 * addon.quantity
        elif addon.addon_id == "AI_INTELLIGENCE_INDIVIDUAL_YEARLY":
            ai_ind_count += addon.quantity
            ai_rev_monthly_paise += int((499900 / 12) * addon.quantity)
        elif addon.addon_id == "AI_INTELLIGENCE_ALL_MONTHLY":
            ai_all_count += addon.quantity
            ai_rev_monthly_paise += 999900 * addon.quantity
        elif addon.addon_id == "AI_INTELLIGENCE_ALL_YEARLY":
            ai_all_count += addon.quantity
            ai_rev_monthly_paise += int((6999900 / 12) * addon.quantity)

    # Churn count
    stmt_churn = (
        select(func.count(SubscriptionAddOn.id))
        .where(SubscriptionAddOn.status.in_(["cancelled", "expired"]))
        .where(SubscriptionAddOn.addon_id.like("AI_INTELLIGENCE_%"))
    )
    res_churn = await db.execute(stmt_churn)
    ai_churn_count = res_churn.scalar_one()

    # AI Processing Cost estimate: ₹14.50 (1450 paise) per active individual slot account,
    # plus ₹43.50 (4350 paise) average per active All Accounts workspace subscription
    ai_cost_paise = (1450 * ai_ind_count) + (4350 * ai_all_count)

    # Gross Margin
    if ai_rev_monthly_paise > 0:
        ai_margin_pct = ((ai_rev_monthly_paise - ai_cost_paise) / ai_rev_monthly_paise) * 100.0
    else:
        ai_margin_pct = 0.0

    return PlatformStatsResponse(
        total_users=total_users,
        connected_ad_accounts=total_accs,
        active_connections=active_conns,
        plan_distribution=plan_counts,
        total_campaigns=total_camps,
        total_addons_active=total_addons,
        trial_stats=trial_stats_obj,
        ai_individual_active_count=ai_ind_count,
        ai_all_accounts_active_count=ai_all_count,
        ai_total_revenue_monthly_paise=ai_rev_monthly_paise,
        ai_churn_count=ai_churn_count,
        ai_processing_cost_paise_estimate=ai_cost_paise,
        ai_gross_margin_percentage=round(ai_margin_pct, 2),
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
                credits=user.credits,
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
    
    # Synchronize/Override Subscription table record
    stmt_sub = select(Subscription).where(Subscription.user_id == user.id).where(Subscription.status == "active")
    res_sub = await db.execute(stmt_sub)
    sub = res_sub.scalar_one_or_none()
    
    if sub:
        sub.plan = req.plan_id
        # Reset expires_at to 10 years in the future so override remains active
        sub.expires_at = datetime.utcnow() + timedelta(days=3650)
    else:
        new_sub = Subscription(
            user_id=user.id,
            plan=req.plan_id,
            status="active",
            started_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=3650)
        )
        db.add(new_sub)
        
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


@router.get("/users/{user_id}/details", summary="Get complete user details")
async def get_user_details(
    user_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns complete user profile details, active subscriptions, Meta connections, Meta ad accounts,
    tracked campaigns, active add-ons, and raised support tickets.
    """
    verify_admin(claims)

    # 1. Fetch User profile
    stmt_user = select(User).where(User.id == user_id)
    res_user = await db.execute(stmt_user)
    user = res_user.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found."
        )

    # 2. Fetch Meta connections
    stmt_conns = select(MetaConnection).where(MetaConnection.user_id == user_id)
    res_conns = await db.execute(stmt_conns)
    connections = res_conns.scalars().all()

    # 3. Fetch Meta ad accounts
    stmt_accs = select(MetaAdAccount).where(MetaAdAccount.user_id == user_id)
    res_accs = await db.execute(stmt_accs)
    ad_accounts = res_accs.scalars().all()

    # 4. Fetch Active Add-ons
    stmt_addons = select(SubscriptionAddOn).where(SubscriptionAddOn.user_id == user_id).where(SubscriptionAddOn.status == "active")
    res_addons = await db.execute(stmt_addons)
    addons = res_addons.scalars().all()

    # 5. Fetch Support tickets
    stmt_tickets = select(SupportTicket).where(SupportTicket.user_id == user_id).order_by(SupportTicket.created_at.desc())
    res_tickets = await db.execute(stmt_tickets)
    tickets = res_tickets.scalars().all()

    # 6. Fetch Ad packs
    from app.models.ads_service import MetaAdServiceRequest, AdPack
    stmt_packs = select(AdPack).where(AdPack.user_id == user_id).order_by(AdPack.purchased_at.desc())
    res_packs = await db.execute(stmt_packs)
    ad_packs = res_packs.scalars().all()

    # 7. Fetch Ad service requests
    stmt_reqs = select(MetaAdServiceRequest).where(MetaAdServiceRequest.user_id == user_id).order_by(MetaAdServiceRequest.created_at.desc())
    res_reqs = await db.execute(stmt_reqs)
    ad_service_requests = res_reqs.scalars().all()

    # 8. Fetch Campaigns for connected ad accounts
    campaigns = []
    if ad_accounts:
        acc_ids = [acc.id for acc in ad_accounts]
        stmt_camps = select(Campaign).where(Campaign.ad_account_id.in_(acc_ids))
        res_camps = await db.execute(stmt_camps)
        campaigns = res_camps.scalars().all()

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "plan_id": user.plan_id or "starter",
            "status": user.status,
            "credits": user.credits,
            "created_at": user.created_at,
            "deletion_scheduled_at": user.deletion_scheduled_at,
            "intro_offer_eligible": user.intro_offer_eligible,
            "intro_offer_used": user.intro_offer_used,
            "intro_offer_used_at": user.intro_offer_used_at,
        },
        "connections": [
            {
                "id": conn.id,
                "meta_user_id": conn.meta_user_id,
                "status": conn.status,
                "last_sync_at": conn.last_sync_at,
                "last_sync_status": conn.last_sync_status,
                "last_sync_error": conn.last_sync_error,
            }
            for conn in connections
        ],
        "ad_accounts": [
            {
                "id": acc.id,
                "meta_account_id": acc.meta_account_id,
                "account_name": acc.account_name,
                "currency": acc.currency,
                "timezone": acc.timezone,
                "account_status": acc.account_status,
                "industry": acc.industry,
            }
            for acc in ad_accounts
        ],
        "addons": [
            {
                "id": add.id,
                "addon_id": add.addon_id,
                "quantity": add.quantity,
                "status": add.status,
                "expires_at": add.expires_at,
            }
            for add in addons
        ],
        "tickets": [
            {
                "id": tick.id,
                "subject": tick.subject,
                "description": tick.description,
                "category": tick.category,
                "status": tick.status,
                "admin_reply": tick.admin_reply,
                "created_at": tick.created_at,
            }
            for tick in tickets
        ],
        "campaigns": [
            {
                "id": camp.id,
                "name": camp.name,
                "objective": camp.objective,
                "status": camp.status,
                "daily_budget": float(camp.daily_budget) if camp.daily_budget is not None else None,
            }
            for camp in campaigns
        ],
        "ad_packs": [
            {
                "id": str(pack.id),
                "pack_type": pack.pack_type,
                "total_ad_credits": pack.total_ad_credits,
                "used_ad_credits": pack.used_ad_credits,
                "remaining_ad_credits": pack.remaining_ad_credits,
                "price_paid": pack.price_paid,
                "purchased_at": pack.purchased_at,
                "expires_at": pack.expires_at,
                "status": pack.status,
            }
            for pack in ad_packs
        ],
        "ad_service_requests": [
            {
                "id": str(r.id),
                "full_name": r.full_name,
                "business_name": r.business_name,
                "email": r.email,
                "whatsapp_number": r.whatsapp_number,
                "website": r.website,
                "business_location": r.business_location,
                "industry": r.industry,
                "industry_other": r.industry_other,
                "business_description": r.business_description,
                "advertised_product": r.advertised_product,
                "campaign_objective": r.campaign_objective,
                "daily_budget": r.daily_budget,
                "number_of_ads": r.number_of_ads,
                "creative_required": r.creative_required,
                "additional_services": r.additional_services,
                "status": r.status,
                "partner_access_status": r.partner_access_status,
                "created_at": r.created_at,
            }
            for r in ad_service_requests
        ]
    }


@router.post("/users/{user_id}/addons", summary="Give or remove user subscription addons")
async def override_user_addons(
    user_id: uuid.UUID,
    req: AdminAddonOverrideRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates, updates, or deletes user subscription addons directly.
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

    # Find existing active addon
    stmt_addon = (
        select(SubscriptionAddOn)
        .where(SubscriptionAddOn.user_id == user_id)
        .where(SubscriptionAddOn.addon_id == req.addon_id)
        .where(SubscriptionAddOn.status == "active")
    )
    res_addon = await db.execute(stmt_addon)
    addon = res_addon.scalar_one_or_none()

    if req.quantity <= 0:
        # Remove addon
        if addon:
            await db.delete(addon)
            await db.commit()
        return {"status": "success", "message": f"Successfully removed addon {req.addon_id}."}

    # Add or update addon
    if addon:
        addon.quantity = req.quantity
        addon.expires_at = datetime.utcnow() + timedelta(days=3650)
    else:
        addon = SubscriptionAddOn(
            user_id=user_id,
            addon_id=req.addon_id,
            quantity=req.quantity,
            status="active",
            expires_at=datetime.utcnow() + timedelta(days=3650)
        )
        db.add(addon)

    await db.commit()
    logger.info("admin_addon_override_success", user_id=user_id, addon=req.addon_id, qty=req.quantity)
    return {"status": "success", "message": f"Successfully set addon {req.addon_id} quantity to {req.quantity}."}


@router.post("/users/{user_id}/credits", summary="Give or remove user credits")
async def override_user_credits(
    user_id: uuid.UUID,
    req: AdminCreditsOverrideRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Modifies a user's credit balance directly.
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

    user.credits = req.credits
    await db.commit()

    logger.info("admin_credits_override_success", user_id=user_id, credits=req.credits)
    return {"status": "success", "message": f"Successfully updated user credits to {req.credits}."}


@router.post("/users/{user_id}/ad-packs", summary="Give or remove user ad pack credits")
async def override_user_ad_packs(
    user_id: uuid.UUID,
    req: AdminAdPackOverrideRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(claims)
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    from app.models.ads_service import AdPack
    
    if req.total_ad_credits <= 0:
        # Delete active ad packs for user
        stmt_del = select(AdPack).where(AdPack.user_id == user_id).where(AdPack.status == "active")
        res_del = await db.execute(stmt_del)
        active_packs = res_del.scalars().all()
        for p in active_packs:
            await db.delete(p)
        await db.commit()
        logger.info("admin_ad_packs_removed", user_id=user_id)
        return {"status": "success", "message": "Successfully removed active ad packs."}

    # Add new ad pack
    new_pack = AdPack(
        user_id=user_id,
        pack_type=req.pack_type,
        total_ad_credits=req.total_ad_credits,
        used_ad_credits=req.used_ad_credits,
        remaining_ad_credits=req.remaining_ad_credits,
        price_paid=req.price_paid,
        purchased_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=req.expires_at_days),
        status="active",
        non_refundable_terms_accepted=True,
        non_refundable_terms_accepted_at=datetime.utcnow()
    )
    db.add(new_pack)
    await db.commit()
    logger.info("admin_ad_pack_created", user_id=user_id, credits=req.total_ad_credits)
    return {"status": "success", "message": f"Successfully created {req.total_ad_credits} ad credits pack."}


class AdminIntroOfferOverrideRequest(BaseModel):
    intro_offer_eligible: Optional[bool] = None
    intro_offer_used: Optional[bool] = None


@router.post("/users/{user_id}/intro-offer", summary="Toggle ₹333 promo offer eligibility/used for a user")
async def override_intro_offer(
    user_id: uuid.UUID,
    req: AdminIntroOfferOverrideRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    verify_admin(claims)
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if req.intro_offer_eligible is not None:
        user.intro_offer_eligible = req.intro_offer_eligible
    if req.intro_offer_used is not None:
        user.intro_offer_used = req.intro_offer_used
        if req.intro_offer_used:
            user.intro_offer_used_at = datetime.utcnow()
        else:
            user.intro_offer_used_at = None
    await db.commit()
    logger.info("admin_intro_offer_override", user_id=user_id, eligible=req.intro_offer_eligible, used=req.intro_offer_used)
    return {"status": "success", "message": "Intro offer status updated successfully."}


class AdminRaiseQuotationPayload(BaseModel):
    email: Optional[str] = None
    number_of_ads: int
    price_per_ad: int  # in Rupees
    validity_days: int
    include_setup: bool
    setup_price: int  # in Rupees
    include_creative: bool
    creative_price: int  # in Rupees
    custom_item_name: Optional[str] = None
    custom_item_price: Optional[int] = None  # in Rupees


class AdminRaiseTicketRequest(BaseModel):
    subject: str
    description: str
    category: str = "General Support"


@router.post("/users/{user_id}/raise-quotation", summary="Admin: Generate and send a custom service quotation to a user")
async def admin_raise_quotation(
    user_id: uuid.UUID,
    payload: AdminRaiseQuotationPayload,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(claims)
    
    target_user_id = user_id
    target_email = ""
    
    # Check if user_id is the zero UUID
    is_unregistered = str(user_id) == "00000000-0000-0000-0000-000000000000"
    
    if is_unregistered:
        if not payload.email:
            raise HTTPException(status_code=400, detail="Email is required for unregistered users.")
        email_clean = payload.email.strip().lower()
        
        # Check if user already exists
        stmt_u = select(User).where(User.email == email_clean)
        res_u = await db.execute(stmt_u)
        user = res_u.scalar_one_or_none()
        
        if not user:
            # Create a placeholder user
            user = User(
                firebase_uid=f"placeholder_{email_clean}",
                email=email_clean,
                name=email_clean.split("@")[0],
                status="active"
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            
        target_user_id = user.id
        target_email = user.email
    else:
        # Load user by user_id
        stmt_u = select(User).where(User.id == user_id)
        res_u = await db.execute(stmt_u)
        user = res_u.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        target_user_id = user.id
        target_email = user.email

    from app.models.ads_service import MetaAdServiceRequest, ServiceQuotation

    # Check for existing unpaid request
    stmt_req = select(MetaAdServiceRequest).where(
        MetaAdServiceRequest.user_id == target_user_id
    ).where(
        MetaAdServiceRequest.status.in_([
            "draft", "submitted", "eligibility_review", "eligible",
            "quotation_generated"
        ])
    ).limit(1)
    res_req = await db.execute(stmt_req)
    req = res_req.scalar_one_or_none()

    if not req:
        # Create placeholder onboarding request
        req = MetaAdServiceRequest(
            user_id=target_user_id,
            full_name=user.name or "Client",
            business_name=f"Campaign Setup — {user.name or 'Client'}",
            email=target_email or "",
            whatsapp_number="",
            business_location="India",
            industry="Ecommerce",
            advertised_product="Custom Ad Campaign",
            campaign_objective="Generate Leads",
            daily_budget="₹500–₹1,000/day",
            number_of_ads=payload.number_of_ads,
            creative_required=payload.include_creative,
            status="quotation_generated"
        )
        db.add(req)
        await db.commit()
        await db.refresh(req)
    else:
        req.number_of_ads = payload.number_of_ads
        req.creative_required = payload.include_creative
        req.status = "quotation_generated"
        db.add(req)

    # Cancel any existing pending quotations for this request
    stmt_cancel_old = select(ServiceQuotation).where(
        ServiceQuotation.service_request_id == req.id
    ).where(
        ServiceQuotation.status == "pending"
    )
    res_cancel_old = await db.execute(stmt_cancel_old)
    old_quotes = res_cancel_old.scalars().all()
    for oq in old_quotes:
        oq.status = "cancelled"
        db.add(oq)

    # Build line items list (prices in Paise)
    line_items = []
    ad_total_paise = payload.number_of_ads * payload.price_per_ad * 100
    line_items.append({
        "service_name": f"{payload.number_of_ads} Meta Ads Campaign Management",
        "regular_price": ad_total_paise,
        "offer_price": ad_total_paise,
        "quantity": payload.number_of_ads,
        "service_type": "ad_management"
    })

    if payload.include_setup:
        setup_paise = payload.setup_price * 100
        line_items.append({
            "service_name": "Meta Ad Account & Business Setup",
            "regular_price": setup_paise,
            "offer_price": setup_paise,
            "service_type": "account_setup"
        })

    if payload.include_creative:
        creative_paise = payload.creative_price * 100
        line_items.append({
            "service_name": "Creative Design & Copywriting Service",
            "regular_price": creative_paise,
            "offer_price": creative_paise,
            "service_type": "creative_design"
        })

    if payload.custom_item_name and payload.custom_item_price is not None:
        custom_paise = payload.custom_item_price * 100
        line_items.append({
            "service_name": payload.custom_item_name,
            "regular_price": custom_paise,
            "offer_price": custom_paise,
            "service_type": "custom"
        })

    final_total_paise = sum(item["offer_price"] for item in line_items)

    # Create new quotation
    quote = ServiceQuotation(
        user_id=target_user_id,
        service_request_id=req.id,
        regular_total=final_total_paise,
        discount_total=0,
        final_total=final_total_paise,
        currency="INR",
        status="pending",
        items=line_items,
        expires_at=datetime.utcnow() + timedelta(days=payload.validity_days)
    )
    db.add(quote)
    await db.commit()

    logger.info("admin_quotation_raised", user_id=target_user_id, quote_id=quote.id, total=final_total_paise)
    return {
        "status": "success",
        "message": "Quotation raised successfully.",
        "quotation_id": str(quote.id),
        "quotation_link": f"https://digitalgrowthstudio.in/pay-quotation/{str(quote.id)}"
    }


@router.post("/users/{user_id}/raise-ticket", summary="Admin: Raise a support ticket for a user")
async def admin_raise_ticket(
    user_id: uuid.UUID,
    payload: AdminRaiseTicketRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(claims)
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    from app.models.ticket import SupportTicket

    ticket = SupportTicket(
        user_id=user_id,
        subject=payload.subject,
        description=payload.description,
        category=payload.category,
        status="open"
    )
    db.add(ticket)
    await db.commit()

    logger.info("admin_ticket_raised_for_user", user_id=user_id, ticket_id=ticket.id)
    return {"status": "success", "message": "Support ticket raised successfully.", "ticket_id": str(ticket.id)}


@router.post("/users/{user_id}/ad-service-requests/{request_id}", summary="Override user Meta Ads service request status or additional services")
async def override_user_ad_service_request(
    user_id: uuid.UUID,
    request_id: uuid.UUID,
    req: AdminAdServiceRequestOverrideRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(claims)
    from app.models.ads_service import MetaAdServiceRequest
    stmt = (
        select(MetaAdServiceRequest)
        .where(MetaAdServiceRequest.id == request_id)
        .where(MetaAdServiceRequest.user_id == user_id)
    )
    res = await db.execute(stmt)
    service_req = res.scalar_one_or_none()
    if not service_req:
        raise HTTPException(status_code=404, detail="Ads service request not found.")

    if req.status is not None:
        service_req.status = req.status

    if req.additional_services is not None:
        service_req.additional_services = req.additional_services

    db.add(service_req)
    await db.commit()
    logger.info("admin_ad_service_request_override", user_id=user_id, request_id=request_id)
    return {"status": "success", "message": "Successfully updated ads service request."}


@router.delete("/users/{user_id}/ad-service-requests/{request_id}", summary="Delete user Meta Ads service request")
async def delete_user_ad_service_request(
    user_id: uuid.UUID,
    request_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    verify_admin(claims)
    from app.models.ads_service import MetaAdServiceRequest, ServiceQuotation, AdPack
    stmt = (
        select(MetaAdServiceRequest)
        .where(MetaAdServiceRequest.id == request_id)
        .where(MetaAdServiceRequest.user_id == user_id)
    )
    res = await db.execute(stmt)
    service_req = res.scalar_one_or_none()
    if not service_req:
        raise HTTPException(status_code=404, detail="Ads service request not found.")

    # Delete associated quotations
    stmt_q = select(ServiceQuotation).where(ServiceQuotation.service_request_id == request_id)
    res_q = await db.execute(stmt_q)
    for q in res_q.scalars().all():
        await db.delete(q)

    # Delete associated packs
    stmt_p = select(AdPack).where(AdPack.service_request_id == request_id)
    res_p = await db.execute(stmt_p)
    for p in res_p.scalars().all():
        await db.delete(p)

    await db.delete(service_req)
    await db.commit()
    logger.info("admin_ad_service_request_deleted", user_id=user_id, request_id=request_id)
    return {"status": "success", "message": "Successfully deleted ads service request and associated data."}


# ──────────────────────────────────────────────
# Admin: Manual Resync for Any User Account
# ──────────────────────────────────────────────

class AdminResyncRequest(BaseModel):
    force: bool = False  # If True, bypasses interval check (but still updates last_sync_at)


@router.post("/users/{user_id}/resync", summary="Trigger resync for a user's ad accounts (admin only)")
async def admin_resync_user(
    user_id: uuid.UUID,
    req: Optional[AdminResyncRequest] = None,
    background_tasks: BackgroundTasks = None,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin-only endpoint to trigger a Meta data sync for a specific user's ad accounts.
    
    - By default, respects the user's plan sync interval (3hr, 6hr, 12hr, etc.)
    - If force=True, triggers sync immediately but still updates last_sync_at
      so the next automatic sync follows the normal schedule.
    """
    from app.services.entitlement_engine import EntitlementEngine
    from app.models.meta import MetaConnection
    from app.workers.tasks import sync_ad_account_task
    from app.api.v1.meta import run_sync_inline
    from datetime import timezone, timedelta

    verify_admin(claims)

    force = req.force if req else False

    # Verify target user exists
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # Fetch user's Meta connection
    stmt_conn = select(MetaConnection).where(MetaConnection.user_id == user_id)
    res_conn = await db.execute(stmt_conn)
    conn = res_conn.scalar_one_or_none()
    if not conn or conn.status != "connected":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no active Meta connection."
        )

    # Check sync interval unless force=True
    if not force:
        entitlements = await EntitlementEngine.resolve_entitlements(user, db)
        interval_hours = entitlements.get("sync_interval_hours", 48)

        if conn.last_sync_at:
            now = datetime.now(timezone.utc)
            last_sync = conn.last_sync_at.replace(tzinfo=timezone.utc) if conn.last_sync_at.tzinfo is None else conn.last_sync_at
            elapsed = now - last_sync
            remaining = timedelta(hours=interval_hours) - elapsed

            if remaining.total_seconds() > 0:
                remaining_mins = int(remaining.total_seconds() / 60)
                return {
                    "status": "skipped",
                    "message": f"User's plan allows sync every {interval_hours}h. Next sync available in {remaining_mins} minutes.",
                    "plan_id": user.plan_id,
                    "sync_interval_hours": interval_hours,
                    "remaining_minutes": remaining_mins,
                }

    # Prevent duplicate in_progress syncs
    if conn.last_sync_status == "in_progress":
        return {
            "status": "in_progress",
            "message": "A sync is already in progress for this user's Meta connection."
        }

    # Fetch user's active ad accounts
    stmt_acc = select(MetaAdAccount).where(
        MetaAdAccount.user_id == user_id,
        MetaAdAccount.account_status == 1,
    )
    res_acc = await db.execute(stmt_acc)
    accounts = res_acc.scalars().all()

    if not accounts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active ad accounts found for this user."
        )

    synced_count = 0
    for acc in accounts:
        try:
            sync_ad_account_task.delay(str(acc.id))
        except Exception:
            pass
        if background_tasks:
            background_tasks.add_task(run_sync_inline, str(acc.id))
        synced_count += 1

    logger.info("admin_resync_triggered", user_id=str(user_id), account_count=synced_count, forced=force)
    return {
        "status": "success",
        "message": f"Resync triggered for {synced_count} ad account(s) belonging to {user.email}.",
        "forced": force,
    }


# ──────────────────────────────────────────────
# Admin: AI Credits & Optimization Limits overrides
# ──────────────────────────────────────────────

@router.post("/users/{user_id}/optimization-slots", summary="Assign admin override optimization slots to user")
async def override_user_optimization_slots(
    user_id: uuid.UUID,
    req: AdminOptimizationSlotsOverrideRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Super Admin endpoint to override a user's AI optimization campaign slots directly.
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
    
    user.admin_assigned_optimization_slots = req.slots
    db.add(user)
    await db.commit()
    
    logger.info("admin_optimization_slots_override_success", user_id=str(user_id), slots=req.slots)
    return {
        "status": "success",
        "message": f"Successfully updated user admin assigned optimization slots to {req.slots}."
    }


@router.get("/ai/dashboard", summary="Get internal cost and profitability dashboard stats")
async def get_admin_ai_dashboard(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Internal SaaS metrics dashboard for tracking Gemini token costs, pack revenues, and profit margins.
    """
    verify_admin(claims)
    
    from app.models.ai_usage import AIUsageRecord
    from app.models.ai_assistant import AICreditTransaction
    from sqlalchemy import case
    
    # 1. Aggregate AIUsageRecord stats
    usage_stmt = (
        select(
            func.count(AIUsageRecord.id).label("total_requests"),
            func.sum(AIUsageRecord.input_tokens).label("in_tok"),
            func.sum(AIUsageRecord.output_tokens).label("out_tok"),
            func.sum(AIUsageRecord.estimated_cost).label("cost_usd"),
            func.sum(case((AIUsageRecord.request_type == 'ai_assistant', 1), else_=0)).label("assistant_reqs"),
            func.sum(case((AIUsageRecord.request_type == 'ai_optimization', 1), else_=0)).label("optimization_reqs")
        )
        .where(AIUsageRecord.success == True)
    )
    usage_res = await db.execute(usage_stmt)
    row = usage_res.first()
    
    total_assistant = int(row.assistant_reqs or 0) if row else 0
    total_optimization = int(row.optimization_reqs or 0) if row else 0
    in_tokens = int(row.in_tok or 0) if row else 0
    out_tokens = int(row.out_tok or 0) if row else 0
    estimated_cost_usd = float(row.cost_usd or 0.0) if row else 0.0
    
    # 2. Aggregate Credit Pack revenue from transaction ledger
    revenue_stmt = (
        select(AICreditTransaction)
        .where(AICreditTransaction.transaction_type == 'grant')
        .where(AICreditTransaction.reason == 'Credit pack purchase')
    )
    rev_res = await db.execute(revenue_stmt)
    txns = rev_res.scalars().all()
    
    pack_prices_inr = {
        100: 199.0,
        500: 949.0,
        1000: 1899.0,
        3000: 5799.0,
        5000: 8999.0
    }
    revenue_inr = 0.0
    for txn in txns:
        # txn.credit_amount holds the quantity granted
        revenue_inr += pack_prices_inr.get(txn.credit_amount, 0.0)
        
    # Convert USD costs to INR (using standard SaaS exchange rate of 83.5)
    cost_inr = estimated_cost_usd * 83.5
    profit_inr = revenue_inr - cost_inr
    margin_pct = (profit_inr / revenue_inr) * 100 if revenue_inr > 0 else 0.0
    if revenue_inr == 0 and cost_inr > 0:
        margin_pct = -100.0
        
    return {
        "total_assistant_requests": total_assistant,
        "total_optimization_requests": total_optimization,
        "total_input_tokens": in_tokens,
        "total_output_tokens": out_tokens,
        "estimated_cost_usd": estimated_cost_usd,
        "credit_pack_revenue_inr": revenue_inr,
        "estimated_cost_inr": cost_inr,
        "profit_inr": profit_inr,
        "margin_pct": margin_pct
    }


# ──────────────────────────────────────────────
# Admin: Finance & Expense Management Routes
# ──────────────────────────────────────────────

@router.get("/finance/stats", response_model=FinanceStatsResponse, summary="Admin: Query finance overview and statistics")
async def get_admin_finance_stats(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    verify_admin(claims)

    # Parse dates if provided
    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD.")
    if end_date:
        try:
            # Include the entire end day
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1) - timedelta(seconds=1)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD.")

    # 1. Total Earned from ServiceQuotation (Offers & Add-ons/Regular Quotes)
    stmt_quotes = select(ServiceQuotation).where(ServiceQuotation.status == "paid")
    if start_dt:
        stmt_quotes = stmt_quotes.where(ServiceQuotation.updated_at >= start_dt)
    if end_dt:
        stmt_quotes = stmt_quotes.where(ServiceQuotation.updated_at <= end_dt)
    
    res_quotes = await db.execute(stmt_quotes)
    paid_quotes = res_quotes.scalars().all()

    offers_paise = 0
    addons_paise = 0

    for q in paid_quotes:
        is_promo = False
        if q.items:
            for item in q.items:
                if item.get("service_type") == "ad_management_promo" or item.get("name", "").lower() == "introductory offer":
                    is_promo = True
                    break
        
        if is_promo:
            offers_paise += q.final_total
        else:
            addons_paise += q.final_total

    # 2. Total Earned from Base Subscriptions (Starter, Growth, Pro, Agency)
    stmt_subs = select(Subscription).where(Subscription.status == "active")
    if start_dt:
        stmt_subs = stmt_subs.where(Subscription.started_at >= start_dt)
    if end_dt:
        stmt_subs = stmt_subs.where(Subscription.started_at <= end_dt)
        
    res_subs = await db.execute(stmt_subs)
    active_subs = res_subs.scalars().all()

    meta_ai_plans_paise = 0
    PLAN_PRICES = {
        "starter": 9900,
        "growth": 99900,
        "pro": 299900,
        "agency": 499900,
    }

    for s in active_subs:
        # Exclude admin overrides, mock payments, and complimentary/bonus starter plans
        sub_id = s.razorpay_subscription_id
        if not sub_id:
            continue
        if sub_id == "free_grant_bonus":
            continue
        if sub_id.startswith("order_mock_") or sub_id.startswith("pay_mock_") or sub_id.startswith("free_") or sub_id.startswith("manual-"):
            continue
            
        plan_name = s.plan.lower()
        meta_ai_plans_paise += PLAN_PRICES.get(plan_name, 0)

    # 3. Total Earned from AI Intelligence Subscriptions & Other Add-ons
    stmt_addons = select(SubscriptionAddOn).where(SubscriptionAddOn.status == "active")
    if start_dt:
        stmt_addons = stmt_addons.where(SubscriptionAddOn.created_at >= start_dt)
    if end_dt:
        stmt_addons = stmt_addons.where(SubscriptionAddOn.created_at <= end_dt)

    res_addons = await db.execute(stmt_addons)
    addons_records = res_addons.scalars().all()

    ai_intelligence_paise = 0
    
    ADDON_PRICES = {
        "additional_account": 29900,
        "faster_sync": 99900,
        "lifetime_history_monthly": 19900,
        "lifetime_history_annual": 199900,
        "ai_deep_analysis": 49900,
        "additional_team_member": 19900,
        "AI_INTELLIGENCE_INDIVIDUAL_MONTHLY": 49900,
        "AI_INTELLIGENCE_INDIVIDUAL_YEARLY": 499900,
        "AI_INTELLIGENCE_ALL_MONTHLY": 999900,
        "AI_INTELLIGENCE_ALL_YEARLY": 6999900,
        "additional_optimization_campaign": 9900,
    }

    for a in addons_records:
        # Exclude admin overrides and mock payments
        pmt_id = a.razorpay_payment_id
        if not pmt_id:
            continue
        if pmt_id.startswith("order_mock_") or pmt_id.startswith("pay_mock_") or pmt_id.startswith("free_") or pmt_id.startswith("manual-"):
            continue
            
        price = ADDON_PRICES.get(a.addon_id, 0) * a.quantity
        if "AI_INTELLIGENCE_" in a.addon_id:
            ai_intelligence_paise += price
        else:
            addons_paise += price

    # 4. Total Earned from One-time Credit Packs
    stmt_txns = (
        select(AICreditTransaction)
        .where(AICreditTransaction.credit_type == "purchased")
        .where(AICreditTransaction.transaction_type == "grant")
        .where(AICreditTransaction.reason == "Credit pack purchase")
    )
    if start_dt:
        stmt_txns = stmt_txns.where(AICreditTransaction.created_at >= start_dt)
    if end_dt:
        stmt_txns = stmt_txns.where(AICreditTransaction.created_at <= end_dt)

    res_txns = await db.execute(stmt_txns)
    txns = res_txns.scalars().all()

    one_time_credits_paise = 0
    CREDIT_PACK_PRICES = {
        100: 19900,
        500: 94900,
        1000: 189900,
        3000: 579900,
        5000: 899900,
    }
    for t in txns:
        one_time_credits_paise += CREDIT_PACK_PRICES.get(t.credit_amount, 0)

    # 5. Quotation Pending stats
    stmt_q_pend = select(ServiceQuotation).where(ServiceQuotation.status == "pending")
    if start_dt:
        stmt_q_pend = stmt_q_pend.where(ServiceQuotation.created_at >= start_dt)
    if end_dt:
        stmt_q_pend = stmt_q_pend.where(ServiceQuotation.created_at <= end_dt)
    res_q_pend = await db.execute(stmt_q_pend)
    q_pend = res_q_pend.scalars().all()
    q_pend_count = len(q_pend)
    q_pend_val = sum(q.final_total for q in q_pend)

    # 6. Quotation Expired stats
    now_utc = datetime.utcnow()
    stmt_q_exp = select(ServiceQuotation).where(
        (ServiceQuotation.status.in_(["cancelled", "expired"])) |
        ((ServiceQuotation.status == "pending") & (ServiceQuotation.expires_at < now_utc))
    )
    if start_dt:
        stmt_q_exp = stmt_q_exp.where(ServiceQuotation.created_at >= start_dt)
    if end_dt:
        stmt_q_exp = stmt_q_exp.where(ServiceQuotation.created_at <= end_dt)
    res_q_exp = await db.execute(stmt_q_exp)
    q_exp = res_q_exp.scalars().all()
    q_exp_count = len(q_exp)
    q_exp_val = sum(q.final_total for q in q_exp)

    # 7. Quotation Expiring Tomorrow
    tomorrow_start = now_utc.date() + timedelta(days=1)
    tomorrow_start_dt = datetime(tomorrow_start.year, tomorrow_start.month, tomorrow_start.day)
    tomorrow_end_dt = tomorrow_start_dt + timedelta(days=1) - timedelta(seconds=1)
    
    stmt_q_tmrw = select(ServiceQuotation).where(
        ServiceQuotation.status == "pending"
    ).where(
        ServiceQuotation.expires_at >= tomorrow_start_dt
    ).where(
        ServiceQuotation.expires_at <= tomorrow_end_dt
    )
    res_q_tmrw = await db.execute(stmt_q_tmrw)
    q_tmrw = res_q_tmrw.scalars().all()
    q_tmrw_count = len(q_tmrw)
    q_tmrw_val = sum(q.final_total for q in q_tmrw)

    # 8. Active Subscriptions & Add-ons count
    stmt_sub_active = select(func.count(Subscription.id)).where(Subscription.status == "active")
    res_sub_active = await db.execute(stmt_sub_active)
    active_subs_count = res_sub_active.scalar_one()

    stmt_add_active = select(func.count(SubscriptionAddOn.id)).where(SubscriptionAddOn.status == "active")
    res_add_active = await db.execute(stmt_add_active)
    active_addons_count = res_add_active.scalar_one()

    # 9. Next Month Renewals Forecast
    today = now_utc.date()
    if today.month == 12:
        next_month_year = today.year + 1
        next_month = 1
    else:
        next_month_year = today.year
        next_month = today.month + 1
    
    next_month_start = datetime(next_month_year, next_month, 1)
    if next_month == 12:
        next_month_end = datetime(next_month_year + 1, 1, 1) - timedelta(seconds=1)
    else:
        next_month_end = datetime(next_month_year, next_month + 1, 1) - timedelta(seconds=1)

    stmt_sub_ren = select(Subscription).where(
        Subscription.status == "active"
    ).where(
        Subscription.expires_at >= next_month_start
    ).where(
        Subscription.expires_at <= next_month_end
    )
    res_sub_ren = await db.execute(stmt_sub_ren)
    sub_ren = res_sub_ren.scalars().all()

    stmt_add_ren = select(SubscriptionAddOn).where(
        SubscriptionAddOn.status == "active"
    ).where(
        SubscriptionAddOn.expires_at >= next_month_start
    ).where(
        SubscriptionAddOn.expires_at <= next_month_end
    )
    res_add_ren = await db.execute(stmt_add_ren)
    add_ren = res_add_ren.scalars().all()

    next_month_renewals_count = 0
    next_month_renewals_val = 0
    for s in sub_ren:
        sub_id = s.razorpay_subscription_id
        if not sub_id or sub_id == "free_grant_bonus" or sub_id.startswith("order_mock_") or sub_id.startswith("pay_mock_") or sub_id.startswith("free_") or sub_id.startswith("manual-"):
            continue
        next_month_renewals_count += 1
        next_month_renewals_val += PLAN_PRICES.get(s.plan.lower(), 0)
    for a in add_ren:
        pmt_id = a.razorpay_payment_id
        if not pmt_id or pmt_id.startswith("order_mock_") or pmt_id.startswith("pay_mock_") or pmt_id.startswith("free_") or pmt_id.startswith("manual-"):
            continue
        next_month_renewals_count += 1
        next_month_renewals_val += ADDON_PRICES.get(a.addon_id, 0) * a.quantity

    # 10. Fetch Expenses in the range
    stmt_expenses = select(ManualExpense).order_by(ManualExpense.expense_date.desc())
    if start_dt:
        stmt_expenses = stmt_expenses.where(ManualExpense.expense_date >= start_dt)
    if end_dt:
        stmt_expenses = stmt_expenses.where(ManualExpense.expense_date <= end_dt)

    res_expenses = await db.execute(stmt_expenses)
    expenses_list = res_expenses.scalars().all()

    total_expenses_inr = sum(e.amount for e in expenses_list)

    total_earned_paise = (
        addons_paise +
        offers_paise +
        meta_ai_plans_paise +
        ai_intelligence_paise +
        one_time_credits_paise
    )
    gross_revenue_inr = total_earned_paise / 100.0
    net_profit_inr = gross_revenue_inr - total_expenses_inr

    category_breakdown = FinanceCategoryBreakdown(
        addons=addons_paise,
        offers=offers_paise,
        meta_ai_plans=meta_ai_plans_paise,
        ai_intelligence=ai_intelligence_paise,
        one_time_credits=one_time_credits_paise
    )

    expenses_formatted = [
        AdminExpenseItem(
            id=e.id,
            category=e.category,
            amount=e.amount,
            currency=e.currency,
            description=e.description,
            expense_date=e.expense_date,
            created_at=e.created_at
        )
        for e in expenses_list
    ]

    return FinanceStatsResponse(
        total_earned_paise=total_earned_paise,
        gross_revenue_inr=gross_revenue_inr,
        total_expenses_inr=total_expenses_inr,
        net_profit_inr=net_profit_inr,
        category_breakdown=category_breakdown,
        quotations_pending_count=q_pend_count,
        quotations_pending_value_paise=q_pend_val,
        quotations_expired_count=q_exp_count,
        quotations_expired_value_paise=q_exp_val,
        quotations_expiring_tomorrow_count=q_tmrw_count,
        quotations_expiring_tomorrow_value_paise=q_tmrw_val,
        next_month_renewals_count=next_month_renewals_count,
        next_month_renewals_value_paise=next_month_renewals_val,
        active_subscriptions_count=active_subs_count,
        active_addons_count=active_addons_count,
        expenses=expenses_formatted
    )


@router.post("/finance/expenses", response_model=AdminExpenseItem, summary="Admin: Record a manual business expense")
async def create_admin_expense(
    payload: AdminExpenseCreatePayload,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    verify_admin(claims)
    
    expense = ManualExpense(
        category=payload.category,
        amount=payload.amount,
        description=payload.description,
        expense_date=payload.expense_date or datetime.utcnow(),
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    
    return AdminExpenseItem(
        id=expense.id,
        category=expense.category,
        amount=expense.amount,
        currency=expense.currency,
        description=expense.description,
        expense_date=expense.expense_date,
        created_at=expense.created_at
    )


@router.delete("/finance/expenses/{expense_id}", summary="Admin: Delete a manual business expense")
async def delete_admin_expense(
    expense_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    verify_admin(claims)
    
    stmt = select(ManualExpense).where(ManualExpense.id == expense_id)
    res = await db.execute(stmt)
    expense = res.scalar_one_or_none()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense record not found.")
        
    await db.delete(expense)
    await db.commit()
    
    return {"status": "success", "message": "Expense record deleted successfully."}
