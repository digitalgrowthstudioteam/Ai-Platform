"""
Digital Growth Studio — Subscription Billing Router (Razorpay)
"""
import uuid
import structlog
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any

class PlansAvailabilityResponse(BaseModel):
    starter_available: bool
    active_starter_count: int

from app.database import get_db
from app.dependencies import get_current_user
from app.config import get_settings
from app.api.v1.meta import get_db_user_from_claims
from app.models.user import User
from app.models.subscription import Subscription
from app.models.subscription_addon import SubscriptionAddOn
from app.models.notification import Notification
from app.services.entitlement_engine import EntitlementEngine, PLANS_CONFIG, ADDONS_CONFIG

try:
    import razorpay
except ImportError:
    razorpay = None

logger = structlog.get_logger()
router = APIRouter(prefix="/billing", tags=["Billing & Subscriptions"])
settings = get_settings()


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class OrderCreationRequest(BaseModel):
    plan_id: Optional[str] = None  # free, starter, growth, pro, agency
    addon_id: Optional[str] = None # additional_account, faster_sync, etc.
    quantity: Optional[int] = 1


class OrderCreationResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: Optional[str] = None
    is_mock: bool = False


class PaymentVerificationRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: Optional[str] = None
    addon_id: Optional[str] = None
    quantity: Optional[int] = 1


class SubscriptionAddOnDetail(BaseModel):
    addon_id: str
    name: str
    quantity: int
    expires_at: datetime
    price_monthly: int


class SubscriptionDetailsResponse(BaseModel):
    plan: str
    status: str
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_mock: bool = False
    resolved_entitlements: Dict[str, Any]
    active_addons_list: List[SubscriptionAddOnDetail]
    monthly_total_cost: int


# Plan prices configuration (in INR Paise, i.e., 100 Paise = 1 INR)
PLAN_PRICES_PAISE = {
    "free": 0,
    "starter": 9900,     # ₹99
    "growth": 99900,    # ₹999
    "pro": 299900,      # ₹2,999
    "agency": 499900,   # ₹4,999
}

# Add-on prices in INR Paise
ADDON_PRICES_PAISE = {
    "additional_account": 29900,       # ₹299
    "faster_sync": 99900,              # ₹999
    "lifetime_history_monthly": 19900,  # ₹199
    "lifetime_history_annual": 199900,  # ₹1,999
    "ai_deep_analysis": 49900,         # ₹499
    "additional_team_member": 19900,   # ₹199
    "AI_INTELLIGENCE_INDIVIDUAL_MONTHLY": 49900,  # ₹499
    "AI_INTELLIGENCE_INDIVIDUAL_YEARLY": 499900,  # ₹4,999
    "AI_INTELLIGENCE_ALL_MONTHLY": 999900,        # ₹9,999
    "AI_INTELLIGENCE_ALL_YEARLY": 6999900,       # ₹69,999
    "additional_optimization_campaign": 9900,     # ₹99
    "credit_pack_100": 19900,                     # ₹199
    "credit_pack_500": 94900,                     # ₹949
    "credit_pack_1000": 189900,                    # ₹1,899
    "credit_pack_3000": 579900,                    # ₹5,799
    "credit_pack_5000": 899900,                    # ₹8,999
}


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("/subscription", response_model=SubscriptionDetailsResponse, summary="Query subscription details")
async def get_subscription_details(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns active plan, active add-ons list, next total monthly costs, and resolved entitlements.
    """
    user = await get_db_user_from_claims(claims, db)

    # 1. Fetch entitlements
    entitlements = await EntitlementEngine.resolve_entitlements(user, db)

    # 2. Query latest active base subscription
    stmt = (
        select(Subscription)
        .where(Subscription.user_id == user.id)
        .where(Subscription.status == "active")
        .order_by(Subscription.expires_at.desc())
    )
    res = await db.execute(stmt)
    sub = res.scalar_one_or_none()

    # 3. Fetch active user add-on models
    active_addons = await EntitlementEngine.get_active_addons(user.id, db)
    
    addons_list = []
    addons_cost_paise = 0
    
    for a in active_addons:
        cfg = ADDONS_CONFIG.get(a.addon_id, {})
        price_monthly = cfg.get("price_monthly", 0)
        # If it is annual, display monthly value approximation for stats
        if a.addon_id == "lifetime_history_annual":
            price_monthly = 166  # ~₹1,999 / 12
        elif a.addon_id == "AI_INTELLIGENCE_INDIVIDUAL_YEARLY":
            price_monthly = 416  # ~₹4,999 / 12
        elif a.addon_id == "AI_INTELLIGENCE_ALL_YEARLY":
            price_monthly = 5833  # ~₹69,999 / 12
            
        addons_list.append(
            SubscriptionAddOnDetail(
                addon_id=a.addon_id,
                name=cfg.get("name", a.addon_id),
                quantity=a.quantity,
                expires_at=a.expires_at,
                price_monthly=price_monthly,
            )
        )
        # Calculate monthly invoice totals
        # Quantities are multiplied by the base monthly price
        cost_key = "price_monthly" if a.addon_id not in ["lifetime_history_annual", "AI_INTELLIGENCE_INDIVIDUAL_YEARLY", "AI_INTELLIGENCE_ALL_YEARLY"] else "price_annual"
        unit_cost = cfg.get(cost_key, 0)
        
        # If annual, calculate its monthly equivalent
        if a.addon_id in ["lifetime_history_annual", "AI_INTELLIGENCE_INDIVIDUAL_YEARLY", "AI_INTELLIGENCE_ALL_YEARLY"]:
            addons_cost_paise += int((unit_cost / 12) * a.quantity)
        else:
            addons_cost_paise += unit_cost * a.quantity

    # Base subscription cost monthly (₹0 if trialing/unsubscribed, otherwise paid plan price)
    if not sub:
        base_price = 0
    else:
        user_plan = sub.plan.lower()
        base_price = PLANS_CONFIG.get(user_plan, {}).get("price_monthly", 0)
        if user_plan == "starter":
            base_price = 99
        elif user_plan == "growth":
            base_price = 999
        elif user_plan == "pro":
            base_price = 2999
        elif user_plan == "agency":
            base_price = 4999

    monthly_total_cost = base_price + addons_cost_paise

    if not sub:
        # Check trial status
        status_to_return = user.trial_status
        if user.trial_status == "active" and user.trial_ends_at:
            now = datetime.now(timezone.utc)
            ends_at = user.trial_ends_at
            if ends_at.tzinfo is None:
                ends_at = ends_at.replace(tzinfo=timezone.utc)
            if now > ends_at:
                user.trial_status = "expired"
                await db.commit()
                status_to_return = "expired"
            else:
                status_to_return = "trialing"

        return SubscriptionDetailsResponse(
            plan="starter",
            status=status_to_return,
            started_at=user.trial_started_at,
            expires_at=user.trial_ends_at,
            is_mock=not bool(settings.RAZORPAY_KEY_ID),
            resolved_entitlements=entitlements,
            active_addons_list=addons_list,
            monthly_total_cost=monthly_total_cost,
        )

    return SubscriptionDetailsResponse(
        plan=sub.plan,
        status=sub.status,
        started_at=sub.started_at,
        expires_at=sub.expires_at,
        is_mock=not bool(settings.RAZORPAY_KEY_ID),
        resolved_entitlements=entitlements,
        active_addons_list=addons_list,
        monthly_total_cost=monthly_total_cost,
    )


@router.get("/plans/availability", response_model=PlansAvailabilityResponse, summary="Query pricing plan availability limits")
async def get_plans_availability(
    db: AsyncSession = Depends(get_db),
):
    """
    Returns whether limited tiers (like Starter/Pro Early Access) are still open for registration.
    """
    stmt = select(func.count(User.id)).where(User.plan_id == "starter").where(User.status == "active")
    res = await db.execute(stmt)
    active_count = res.scalar_one()

    # Starter plan is available if count is less than 100
    starter_available = active_count < 100

    return PlansAvailabilityResponse(
        starter_available=starter_available,
        active_starter_count=active_count,
    )


@router.post("/order", response_model=OrderCreationResponse, summary="Create a subscription payment order")
async def create_billing_order(
    req: OrderCreationRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a Razorpay Order ID. If API credentials are not set, initializes a Mock bypass order.
    """
    user = await get_db_user_from_claims(claims, db)

    # Determine amount based on plan_id or addon_id
    if req.addon_id:
        if req.addon_id not in ADDON_PRICES_PAISE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid addon identifier '{req.addon_id}'."
            )
        qty = req.quantity or 1
        amount = ADDON_PRICES_PAISE[req.addon_id] * qty
    else:
        plan = (req.plan_id or "starter").lower()
        if plan not in PLAN_PRICES_PAISE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan subscription '{req.plan_id}'."
            )
        
        # Enforce 100 active users cap on starter plan (Pro Early Access)
        if plan == "starter":
            stmt = select(func.count(User.id)).where(User.plan_id == "starter").where(User.status == "active")
            res = await db.execute(stmt)
            active_count = res.scalar_one()
            if active_count >= 100:
                is_admin = False
                try:
                    email = claims.get("email", "")
                    whitelisted_admins = {
                        "flasshgames2026@gmail.com",
                        "digitalgrowthstudioteam@gmail.com",
                        "vikramrwadkar@gmail.com",
                    }
                    if email in whitelisted_admins:
                        is_admin = True
                except Exception:
                    pass
                if not is_admin:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Early Access Tier has reached its limit of 100 active users. Subscriptions are temporarily closed."
                    )
        
        amount = PLAN_PRICES_PAISE[plan]

    currency = "INR"

    # Razorpay active integration check
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and razorpay:
        try:
            import requests
            session = requests.Session()
            orig_req = session.request
            def timeout_req(*args, **kwargs):
                if "timeout" not in kwargs:
                    kwargs["timeout"] = 5.0
                return orig_req(*args, **kwargs)
            session.request = timeout_req

            client = razorpay.Client(session=session, auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            order_data = {
                "amount": amount,
                "currency": currency,
                "receipt": f"receipt_usr_{str(user.id)[:8]}",
                "payment_capture": 1,
            }
            order = client.order.create(data=order_data)
            return OrderCreationResponse(
                order_id=order["id"],
                amount=order["amount"],
                currency=order["currency"],
                key_id=settings.RAZORPAY_KEY_ID,
                is_mock=False,
            )
        except Exception as e:
            logger.error("razorpay_order_generation_failed", error=str(e))
            pass

    # Mock order generator fallback
    mock_order_id = f"order_mock_{str(uuid.uuid4())[:12]}"
    logger.info("billing_mock_order_initialized", user_id=user.id, order_id=mock_order_id)
    return OrderCreationResponse(
        order_id=mock_order_id,
        amount=amount,
        currency=currency,
        key_id="rzp_test_mock_key_id",
        is_mock=True,
    )


@router.post("/verify", summary="Verify subscription payment captured callback")
async def verify_billing_payment(
    req: PaymentVerificationRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Captures order callbacks. Performs cryptographic signature verification (or mock bypass) and registers upgrades/addons.
    """
    user = await get_db_user_from_claims(claims, db)

    is_verified = False

    # Check for live verification
    if (
        settings.RAZORPAY_KEY_ID 
        and settings.RAZORPAY_KEY_SECRET 
        and razorpay 
        and not req.razorpay_order_id.startswith("order_mock_")
        and not req.razorpay_signature.startswith("signature_mock_")
        and not req.razorpay_payment_id.startswith("pay_mock_")
    ):
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            params_dict = {
                "razorpay_order_id": req.razorpay_order_id,
                "razorpay_payment_id": req.razorpay_payment_id,
                "razorpay_signature": req.razorpay_signature,
            }
            client.utility.verify_payment_signature(params_dict)
            is_verified = True
            logger.info("razorpay_signature_verification_success", user_id=user.id)
        except Exception as e:
            logger.error("razorpay_signature_verification_failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Razorpay cryptographic signature check failed."
            )
    else:
        # Mock payment verification bypass
        logger.info("billing_mock_payment_bypass_verify", user_id=user.id)
        is_verified = True

    if is_verified:
        now = datetime.now(timezone.utc)
        
        # Disable intro offer eligibility upon any successful billing payment
        user.intro_offer_eligible = False
        user.intro_offer_used = True
        if not user.intro_offer_used_at:
            user.intro_offer_used_at = datetime.utcnow()
        db.add(user)
        
        # Grant Starter Plan 1-month bonus/extension for any successful billing payment
        from app.services.subscription_bonus import grant_starter_plan_bonus
        await grant_starter_plan_bonus(user, db, days=30)
        
        # Scenario A: User purchased an Add-On or Credit Pack
        if req.addon_id:
            if req.addon_id.startswith("credit_pack_"):
                # One-time Credit Pack purchase
                pack_credits_map = {
                    "credit_pack_100": 100,
                    "credit_pack_500": 500,
                    "credit_pack_1000": 1000,
                    "credit_pack_3000": 3000,
                    "credit_pack_5000": 5000,
                }
                credits_to_grant = pack_credits_map.get(req.addon_id, 0) * (req.quantity or 1)
                
                # Update user credits
                user.purchased_credits_remaining += credits_to_grant
                user.credits += credits_to_grant
                db.add(user)
                
                # Write to credit transactions ledger (signed ledger)
                from app.models.ai_assistant import AICreditTransaction
                txn = AICreditTransaction(
                    user_id=user.id,
                    credit_amount=credits_to_grant,
                    amount=credits_to_grant,
                    credit_type="purchased",
                    transaction_type="grant",
                    description=f"Purchased {credits_to_grant} AI Credits Pack",
                    reason="Credit pack purchase",
                    reference_id=req.razorpay_payment_id
                )
                db.add(txn)
                
                await db.commit()
                logger.info("credits_pack_purchased_successfully", user_id=user.id, addon_id=req.addon_id, credits=credits_to_grant)
                return {"status": "success", "message": f"Successfully added {credits_to_grant} AI credits to your account."}
            
            else:
                # Determine duration
                days = 365 if req.addon_id in ["lifetime_history_annual", "AI_INTELLIGENCE_INDIVIDUAL_YEARLY", "AI_INTELLIGENCE_ALL_YEARLY"] else 30
                expiry = now + timedelta(days=days)
                
                # Check if user already has this active add-on
                stmt = (
                    select(SubscriptionAddOn)
                    .where(SubscriptionAddOn.user_id == user.id)
                    .where(SubscriptionAddOn.addon_id == req.addon_id)
                    .where(SubscriptionAddOn.status == "active")
                )
                res = await db.execute(stmt)
                existing = res.scalar_one_or_none()
                
                if existing:
                    existing.quantity += (req.quantity or 1)
                    existing.expires_at = expiry
                    existing.razorpay_payment_id = req.razorpay_payment_id
                else:
                    addon = SubscriptionAddOn(
                        user_id=user.id,
                        addon_id=req.addon_id,
                        quantity=(req.quantity or 1),
                        status="active",
                        razorpay_payment_id=req.razorpay_payment_id,
                        expires_at=expiry,
                    )
                    db.add(addon)
                    
                await db.commit()
                logger.info("addon_registered_successfully", user_id=user.id, addon_id=req.addon_id, quantity=req.quantity)
                return {"status": "success", "message": f"Successfully activated add-on: {req.addon_id}."}
            
        # Scenario B: User upgraded Base Subscription plan
        elif req.plan_id:
            user.plan_id = req.plan_id
            
            sub = Subscription(
                user_id=user.id,
                plan=req.plan_id,
                status="active",
                razorpay_customer_id=f"cust_{str(user.id)[:8]}",
                razorpay_subscription_id=req.razorpay_payment_id,
                started_at=now,
                expires_at=now + timedelta(days=30),
            )
            db.add(sub)
            
            # Trigger self-healing reset immediately to allocate plan credits
            await EntitlementEngine.check_and_reset_monthly_credits(user, db)
            
            # Generate plan upgrade notification
            notif = Notification(
                user_id=user.id,
                title="Subscription Activated",
                message=f"Thank you! Your '{req.plan_id.upper()}' subscription is now active.",
                read=False
            )
            db.add(notif)
            await db.commit()
 
            logger.info("subscription_plan_activated", user_id=user.id, plan=req.plan_id)
            return {"status": "success", "message": f"Successfully upgraded plan to {req.plan_id}."}

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Subscription payment verification failed."
    )


@router.post("/addon/cancel", summary="Cancel auto-renewal of an active add-on")
async def cancel_active_addon(
    addon_id: str,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Sets active add-on auto-renewal status to cancelled. 
    The entitlements remain valid until expires_at date.
    """
    user = await get_db_user_from_claims(claims, db)
    
    stmt = (
        select(SubscriptionAddOn)
        .where(SubscriptionAddOn.user_id == user.id)
        .where(SubscriptionAddOn.addon_id == addon_id)
        .where(SubscriptionAddOn.status == "active")
    )
    res = await db.execute(stmt)
    addon = res.scalar_one_or_none()
    
    if not addon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active add-on found for ID '{addon_id}'."
        )
        
    addon.status = "cancelled"
    await db.commit()
    
    logger.info("addon_auto_renewal_cancelled", user_id=user.id, addon_id=addon_id)
    return {"status": "success", "message": f"Successfully cancelled auto-renewal for add-on: {addon_id}."}


# ──────────────────────────────────────────────
# AI Intelligence Billing Schemas
# ──────────────────────────────────────────────
class AIIntelligenceAccountDetail(BaseModel):
    id: uuid.UUID
    meta_account_id: str
    account_name: str
    ai_intelligence_status: str
    historical_intelligence_status: str


class AIIntelligenceStatusResponse(BaseModel):
    all_accounts_active: bool
    individual_slots_total: int
    individual_slots_used: int
    individual_slots_available: int
    accounts: List[AIIntelligenceAccountDetail]


class AIAssignmentRequest(BaseModel):
    ad_account_id: str


# ──────────────────────────────────────────────
# AI Assignment & Status Endpoints
# ──────────────────────────────────────────────
@router.get("/ai-intelligence/status", response_model=AIIntelligenceStatusResponse, summary="Get AI Intelligence subscription and accounts assignment status")
async def get_ai_intelligence_status(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_db_user_from_claims(claims, db)
    
    # 1. Resolve active addons to count slots
    addons = await EntitlementEngine.get_active_addons(user.id, db)
    
    all_accounts_active = any(
        a.addon_id in ["AI_INTELLIGENCE_ALL_MONTHLY", "AI_INTELLIGENCE_ALL_YEARLY"] 
        for a in addons
    )
    
    individual_slots_total = sum(
        a.quantity for a in addons 
        if a.addon_id in ["AI_INTELLIGENCE_INDIVIDUAL_MONTHLY", "AI_INTELLIGENCE_INDIVIDUAL_YEARLY"]
    )
    
    # 2. Get all Meta Ad Accounts for this user
    from app.models.meta import MetaAdAccount
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
    res = await db.execute(stmt)
    accounts = res.scalars().all()
    
    # Self-healing: if all_accounts is active, make sure all accounts are active in database
    if all_accounts_active:
        updated = False
        for acc in accounts:
            if acc.ai_intelligence_status != "active":
                acc.ai_intelligence_status = "active"
                acc.historical_intelligence_status = "active"
                updated = True
        if updated:
            await db.commit()
    else:
        # Check that number of active assigned accounts doesn't exceed individual slots
        active_assigned = [acc for acc in accounts if acc.ai_intelligence_status == "active"]
        if len(active_assigned) > individual_slots_total:
            # We exceed, let's revert the excess
            active_assigned.sort(key=lambda x: x.created_at)
            for i, acc in enumerate(active_assigned):
                if i >= individual_slots_total:
                    acc.ai_intelligence_status = "none"
                    acc.historical_intelligence_status = "paused"
            await db.commit()
            
    # Re-fetch after self-healing updates
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
    res = await db.execute(stmt)
    accounts = res.scalars().all()
    
    individual_slots_used = sum(1 for acc in accounts if acc.ai_intelligence_status == "active" and not all_accounts_active)
    individual_slots_available = max(0, individual_slots_total - individual_slots_used)
    
    accounts_list = [
        AIIntelligenceAccountDetail(
            id=acc.id,
            meta_account_id=acc.meta_account_id,
            account_name=acc.account_name,
            ai_intelligence_status=acc.ai_intelligence_status or "none",
            historical_intelligence_status=acc.historical_intelligence_status or "none",
        ) for acc in accounts
    ]
    
    return AIIntelligenceStatusResponse(
        all_accounts_active=all_accounts_active,
        individual_slots_total=individual_slots_total,
        individual_slots_used=individual_slots_used,
        individual_slots_available=individual_slots_available,
        accounts=accounts_list
    )


@router.post("/ai-intelligence/assign", summary="Assign an individual AI Intelligence entitlement slot to an ad account")
async def assign_ai_intelligence(
    req: AIAssignmentRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_db_user_from_claims(claims, db)
    
    # 1. Check if user has active ALL_ACCOUNTS
    addons = await EntitlementEngine.get_active_addons(user.id, db)
    all_accounts_active = any(
        a.addon_id in ["AI_INTELLIGENCE_ALL_MONTHLY", "AI_INTELLIGENCE_ALL_YEARLY"] 
        for a in addons
    )
    if all_accounts_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment not required. All connected accounts are already covered by your All Accounts subscription."
        )
        
    # 2. Check if user has available individual slots
    individual_slots_total = sum(
        a.quantity for a in addons 
        if a.addon_id in ["AI_INTELLIGENCE_INDIVIDUAL_MONTHLY", "AI_INTELLIGENCE_INDIVIDUAL_YEARLY"]
    )
    if individual_slots_total <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active Individual AI Intelligence subscriptions found. Please purchase a slot first."
        )
        
    # 3. Find the target MetaAdAccount
    from app.models.meta import MetaAdAccount
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
    try:
        acc_uuid = uuid.UUID(req.ad_account_id)
        stmt = stmt.where(MetaAdAccount.id == acc_uuid)
    except (ValueError, TypeError):
        stmt = stmt.where(MetaAdAccount.meta_account_id == req.ad_account_id)
    res = await db.execute(stmt)
    target_acc = res.scalar_one_or_none()
    if not target_acc:
        raise HTTPException(status_code=404, detail="Target ad account not found.")
        
    # If already active, nothing to do
    if target_acc.ai_intelligence_status == "active":
        return {"status": "success", "message": f"Account '{target_acc.account_name}' is already active."}
        
    # 4. Resolve current assignments
    stmt_all = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
    res_all = await db.execute(stmt_all)
    all_accounts = res_all.scalars().all()
    active_assigned = [acc for acc in all_accounts if acc.ai_intelligence_status == "active"]
    
    # If active count is already at max slots, we must unassign/pause one to make space
    if len(active_assigned) >= individual_slots_total:
        active_assigned.sort(key=lambda x: x.created_at)
        to_unassign = active_assigned[0]
        to_unassign.ai_intelligence_status = "none"
        to_unassign.historical_intelligence_status = "paused"
        db.add(to_unassign)
        logger.info("reassignment_unassigned_previous_account", user_id=user.id, ad_account_id=str(to_unassign.id))
        
    target_acc.ai_intelligence_status = "active"
    target_acc.historical_intelligence_status = "active"
    db.add(target_acc)
    
    await db.commit()
    logger.info("assigned_ai_intelligence_to_account", user_id=user.id, ad_account_id=str(target_acc.id))
    return {"status": "success", "message": f"Successfully activated Full AI Intelligence on account: {target_acc.account_name}."}


@router.post("/ai-intelligence/unassign", summary="Unassign/pause AI Intelligence entitlement from an ad account")
async def unassign_ai_intelligence(
    req: AIAssignmentRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_db_user_from_claims(claims, db)
    
    from app.models.meta import MetaAdAccount
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
    try:
        acc_uuid = uuid.UUID(req.ad_account_id)
        stmt = stmt.where(MetaAdAccount.id == acc_uuid)
    except (ValueError, TypeError):
        stmt = stmt.where(MetaAdAccount.meta_account_id == req.ad_account_id)
    res = await db.execute(stmt)
    target_acc = res.scalar_one_or_none()
    if not target_acc:
        raise HTTPException(status_code=404, detail="Target ad account not found.")
        
    target_acc.ai_intelligence_status = "none"
    target_acc.historical_intelligence_status = "paused"
    db.add(target_acc)
    
    await db.commit()
    logger.info("unassigned_ai_intelligence_from_account", user_id=user.id, ad_account_id=str(target_acc.id))
    return {"status": "success", "message": f"Successfully paused continuous Full AI Intelligence on account: {target_acc.account_name}."}
