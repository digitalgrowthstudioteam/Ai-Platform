"""
Digital Growth Studio — Meta Ads Service Acquisition Router
"""
import uuid
import structlog
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from app.database import get_db
from app.dependencies import get_current_user
from app.api.v1.meta import get_db_user_from_claims
from app.models.user import User
from app.models.ads_service import MetaAdServiceRequest, AdPack, ServiceQuotation
from app.models.subscription import Subscription
from app.services.config_seeder import get_admin_config_value
from app.services.ads_service_eligibility import evaluate_service_eligibility, calculate_quotation
from app.config import get_settings

settings = get_settings()

logger = structlog.get_logger()
router = APIRouter(
    prefix="/ads-service",
    tags=["Meta Ads Management Service"],
)

# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class ServiceRequestCreate(BaseModel):
    full_name: str
    business_name: str
    email: str
    whatsapp_number: str
    website: Optional[str] = None
    business_location: str
    industry: str
    industry_other: Optional[str] = None
    business_description: Optional[str] = None
    advertised_product: str
    campaign_objective: str
    daily_budget: str
    number_of_ads: int
    creative_required: bool
    additional_services: List[str]
    meta_account_exists: bool
    meta_business_id: Optional[str] = None
    meta_ad_account_id: Optional[str] = None

class AdminUpdateServiceRequest(BaseModel):
    status: Optional[str] = None
    partner_access_status: Optional[str] = None
    ad_credits_to_consume: Optional[int] = None

# Helper to verify signature if Razorpay is loaded
try:
    import razorpay
except ImportError:
    razorpay = None


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("/config", summary="Get service pricing configuration")
async def get_service_config(
    db: AsyncSession = Depends(get_db)
):
    """
    Returns admin-configured service pricing, ad packs, and additional services lists.
    """
    services_pricing = await get_admin_config_value(db, "meta_ads_services_pricing")
    ad_packs = await get_admin_config_value(db, "meta_ads_ad_packs")
    additional_services = await get_admin_config_value(db, "meta_ads_additional_services")

    return {
        "services_pricing": services_pricing,
        "ad_packs": ad_packs,
        "additional_services": additional_services
    }


@router.post("/request", summary="Submit a Meta Ads management service request")
async def create_service_request(
    payload: ServiceRequestCreate,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates or registers a service request onboarding form.
    Validates restricted industry eligibility.
    """
    user = await get_db_user_from_claims(claims, db)

    # 1. Run eligibility validator
    eligibility = await evaluate_service_eligibility(db, user, payload.dict())
    if not eligibility["eligible"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=eligibility["reason"]
        )

    # 2. Check if a request already exists in progress
    stmt_exists = (
        select(MetaAdServiceRequest)
        .where(MetaAdServiceRequest.user_id == user.id)
        .where(MetaAdServiceRequest.status.in_([
            "draft", "submitted", "eligibility_review", "eligible",
            "quotation_generated"
        ]))
        .limit(1)
    )
    res_exists = await db.execute(stmt_exists)
    existing_request = res_exists.scalar_one_or_none()

    if existing_request:
        # Update existing request instead of duplicating
        for field, val in payload.dict().items():
            setattr(existing_request, field, val)
        existing_request.updated_at = datetime.utcnow()
        req = existing_request
    else:
        # Create new service request
        req = MetaAdServiceRequest(
            user_id=user.id,
            status="submitted",
            **payload.dict()
        )
        db.add(req)

    await db.commit()
    await db.refresh(req)

    return {
        "status": "success",
        "message": "Service request registered successfully.",
        "request_id": str(req.id),
        "service_status": req.status
    }


@router.get("/request/latest", summary="Get the user's latest service request and quote details")
async def get_latest_service_request(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the latest MetaAdServiceRequest details, computed quotation, and Starter plan trial status.
    """
    user = await get_db_user_from_claims(claims, db)

    # 1. Fetch latest request
    stmt = (
        select(MetaAdServiceRequest)
        .where(MetaAdServiceRequest.user_id == user.id)
        .order_by(MetaAdServiceRequest.created_at.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    req = res.scalar_one_or_none()

    if not req:
        return {"request": None, "quotation": None, "user_eligibility": {
            "eligible": user.ads_service_eligible != False,
            "reason": user.restriction_reason,
            "intro_offer_eligible": user.intro_offer_eligible and not user.intro_offer_used
        }}

    # 2. Compute dynamic quotation details
    quote_data = await calculate_quotation(db, user, req)

    # 3. Retrieve or create ServiceQuotation record in database
    stmt_quote = (
        select(ServiceQuotation)
        .where(ServiceQuotation.service_request_id == req.id)
        .order_by(ServiceQuotation.created_at.desc())
        .limit(1)
    )
    res_quote = await db.execute(stmt_quote)
    db_quote = res_quote.scalar_one_or_none()

    if not db_quote or db_quote.status == "pending":
        # Keep DB quotation in sync with configuration
        if db_quote:
            db_quote.regular_total = quote_data["regular_total"]
            db_quote.discount_total = quote_data["discount_total"]
            db_quote.final_total = quote_data["final_total"]
            db_quote.items = quote_data["items"]
            db_quote.expires_at = datetime.utcnow() + timedelta(days=7)
        else:
            db_quote = ServiceQuotation(
                user_id=user.id,
                service_request_id=req.id,
                regular_total=quote_data["regular_total"],
                discount_total=quote_data["discount_total"],
                final_total=quote_data["final_total"],
                items=quote_data["items"],
                status="pending",
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            db.add(db_quote)
        await db.commit()
        await db.refresh(db_quote)

    return {
        "request": {
            "id": str(req.id),
            "full_name": req.full_name,
            "business_name": req.business_name,
            "email": req.email,
            "whatsapp_number": req.whatsapp_number,
            "website": req.website,
            "business_location": req.business_location,
            "industry": req.industry,
            "industry_other": req.industry_other,
            "business_description": req.business_description,
            "advertised_product": req.advertised_product,
            "campaign_objective": req.campaign_objective,
            "daily_budget": req.daily_budget,
            "number_of_ads": req.number_of_ads,
            "creative_required": req.creative_required,
            "additional_services": req.additional_services,
            "meta_account_exists": req.meta_account_exists,
            "meta_business_id": req.meta_business_id,
            "meta_ad_account_id": req.meta_ad_account_id,
            "status": req.status,
            "partner_access_status": req.partner_access_status
        },
        "quotation": {
            "id": str(db_quote.id),
            "regular_total": db_quote.regular_total,
            "discount_total": db_quote.discount_total,
            "final_total": db_quote.final_total,
            "items": db_quote.items,
            "status": db_quote.status
        },
        "user_eligibility": {
            "eligible": user.ads_service_eligible != False,
            "reason": user.restriction_reason,
            "intro_offer_eligible": user.intro_offer_eligible and not user.intro_offer_used
        }
    }


@router.post("/request/{id}/activate-trial", summary="Start Starter Plan 7-day trial")
async def activate_service_trial(
    id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Activates the 7-day Starter plan trial for new customers starting their ads service.
    Enforces Starter Plan requirements before allowing checkout.
    """
    user = await get_db_user_from_claims(claims, db)

    stmt = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == id).where(MetaAdServiceRequest.user_id == user.id)
    res = await db.execute(stmt)
    req = res.scalar_one_or_none()

    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ads service request not found."
        )

    # Validate active subscription
    stmt_sub = select(Subscription).where(Subscription.user_id == user.id).where(Subscription.status == "active")
    res_sub = await db.execute(stmt_sub)
    sub = res_sub.scalar_one_or_none()

    if sub:
        return {"status": "success", "message": "Starter Plan is already active via subscription."}

    # Start trial if eligible
    if user.trial_status == "not_started" and not user.trial_used:
        user.trial_status = "active"
        user.trial_started_at = datetime.utcnow()
        user.trial_ends_at = datetime.utcnow() + timedelta(days=7)
        user.trial_used = True
        user.plan_id = "starter"
        db.add(user)

        req.status = "trial_started"
        db.add(req)
        await db.commit()

        return {"status": "success", "message": "7-day Starter Plan trial started successfully."}
    elif user.trial_status == "active":
        return {"status": "success", "message": "Starter Plan trial is already active."}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your free trial has already been used. Please subscribe to Starter Plan to complete your onboarding."
        )


@router.post("/request/{id}/purchase-pack", summary="Initialize checkout order for ad services")
async def purchase_service_pack(
    id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates a Razorpay Order ID for checkout. Falls back to mock order if credentials are not configured.
    """
    user = await get_db_user_from_claims(claims, db)

    stmt = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == id).where(MetaAdServiceRequest.user_id == user.id)
    res = await db.execute(stmt)
    req = res.scalar_one_or_none()

    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found."
        )

    stmt_quote = select(ServiceQuotation).where(ServiceQuotation.service_request_id == req.id).where(ServiceQuotation.status == "pending")
    res_quote = await db.execute(stmt_quote)
    quote = res_quote.scalar_one_or_none()

    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending quotation found for this request."
        )

    amount = quote.final_total
    currency = quote.currency

    # 1. Razorpay integration check
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and razorpay:
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            order_data = {
                "amount": amount,
                "currency": currency,
                "receipt": f"receipt_ads_{str(quote.id)[:10]}"
            }
            order = client.order.create(data=order_data)
            return {
                "order_id": order["id"],
                "amount": order["amount"],
                "currency": order["currency"],
                "key_id": settings.RAZORPAY_KEY_ID,
                "is_mock": False
            }
        except Exception as e:
            logger.error("razorpay_ads_order_generation_failed", error=str(e))

    # Mock order fallback
    return {
        "order_id": f"order_mock_{uuid.uuid4().hex[:12]}",
        "amount": amount,
        "currency": currency,
        "key_id": "mock_razorpay_key",
        "is_mock": True
    }


class PaymentVerificationRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@router.post("/request/{id}/verify-payment", summary="Verify payment and issue ad pack credits")
async def verify_service_payment(
    id: uuid.UUID,
    req: PaymentVerificationRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies Razorpay payment signature. Activates the service, provisions the AdPack, and marks introductory offer consumed.
    """
    user = await get_db_user_from_claims(claims, db)

    stmt = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == id).where(MetaAdServiceRequest.user_id == user.id)
    res = await db.execute(stmt)
    service_req = res.scalar_one_or_none()

    if not service_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ads service request not found."
        )

    stmt_quote = select(ServiceQuotation).where(ServiceQuotation.service_request_id == service_req.id).where(ServiceQuotation.status == "pending")
    res_quote = await db.execute(stmt_quote)
    quote = res_quote.scalar_one_or_none()

    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending quotation not found."
        )

    # 1. Signature Verification
    is_mock = req.razorpay_order_id.startswith("order_mock_")
    if not is_mock and settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and razorpay:
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            client.utility.verify_payment_signature({
                "razorpay_order_id": req.razorpay_order_id,
                "razorpay_payment_id": req.razorpay_payment_id,
                "razorpay_signature": req.razorpay_signature,
            })
        except Exception as e:
            logger.error("signature_verification_failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Razorpay cryptographic signature check failed."
            )

    # 2. Update Quotation Status
    quote.status = "paid"
    db.add(quote)

    # 3. Create AdPack
    # Calculate pack properties based on quotation details
    is_promo = any(item.get("service_type") == "ad_management_promo" for item in quote.items)
    ad_quantity = service_req.number_of_ads

    validity_days = 30
    # Determine validity from matched configuration items
    for item in quote.items:
        if item.get("validity_days") and item.get("validity_days") > validity_days:
            validity_days = item["validity_days"]

    pack = AdPack(
        user_id=user.id,
        service_request_id=service_req.id,
        pack_type="promo_1_ad" if is_promo else f"pack_{ad_quantity}",
        total_ad_credits=ad_quantity,
        used_ad_credits=0,
        remaining_ad_credits=ad_quantity,
        price_paid=quote.final_total,
        purchased_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=validity_days),
        status="active",
        non_refundable_terms_accepted=True,
        non_refundable_terms_accepted_at=datetime.utcnow()
    )
    db.add(pack)

    # 4. Burn Introductory Offer if promo pack was purchased
    if is_promo:
        user.intro_offer_used = True
        user.intro_offer_used_at = datetime.utcnow()
        user.intro_offer_service_request_id = service_req.id
        db.add(user)

    # 5. Advance Service Request status
    service_req.status = "whatsapp_pending"
    db.add(service_req)

    # 6. Grant Starter Plan 1-month bonus
    from app.services.subscription_bonus import grant_starter_plan_bonus
    await grant_starter_plan_bonus(user, db, days=30)

    await db.commit()
    await db.refresh(pack)

    return {
        "status": "success",
        "message": "Payment verified. Ad pack activated successfully.",
        "pack_id": str(pack.id)
    }


@router.get("/packs", summary="Get user active ad packs")
async def get_user_ad_packs(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of the logged-in user's ad packs with counts and expiry statuses.
    Autocancels expired ad packs on read.
    """
    user = await get_db_user_from_claims(claims, db)
    now = datetime.utcnow().replace(tzinfo=timezone.utc)

    # Fetch user packs
    stmt = select(AdPack).where(AdPack.user_id == user.id).order_by(AdPack.purchased_at.desc())
    res = await db.execute(stmt)
    packs = res.scalars().all()

    packs_list = []
    total_remaining = 0

    for p in packs:
        expiry = p.expires_at
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)

        # Autocancel if expired
        if p.status == "active" and now > expiry:
            p.status = "expired"
            p.remaining_ad_credits = 0
            db.add(p)
            await db.commit()

        if p.status == "active":
            total_remaining += p.remaining_ad_credits

        packs_list.append({
            "id": str(p.id),
            "pack_type": p.pack_type,
            "total": p.total_ad_credits,
            "used": p.used_ad_credits,
            "remaining": p.remaining_ad_credits,
            "purchased_at": p.purchased_at,
            "expires_at": p.expires_at,
            "status": p.status
        })

    return {
        "packs": packs_list,
        "total_remaining_credits": total_remaining
    }


# ──────────────────────────────────────────────
# User Orders & Billing History
# ──────────────────────────────────────────────

@router.get("/orders", summary="Get user's all Meta Ads service orders with status")
async def get_user_orders(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all MetaAdServiceRequest records for the authenticated user,
    with order status pipeline info.
    """
    user = await get_db_user_from_claims(claims, db)

    paid_statuses = [
        "trial_started",
        "whatsapp_pending",
        "whatsapp_connected",
        "partner_access_requested",
        "partner_access_granted",
        "campaign_setup",
        "campaign_live",
        "completed"
    ]

    stmt = select(MetaAdServiceRequest).where(
        MetaAdServiceRequest.user_id == user.id
    ).where(
        (MetaAdServiceRequest.status.in_(paid_statuses)) |
        (MetaAdServiceRequest.id.in_(
            select(ServiceQuotation.service_request_id).where(ServiceQuotation.status == "paid")
        ))
    ).order_by(MetaAdServiceRequest.created_at.desc())
    res = await db.execute(stmt)
    requests = res.scalars().all()

    orders = []
    for r in requests:
        # Check associated AdPack
        stmt_pack = select(AdPack).where(AdPack.service_request_id == r.id)
        res_pack = await db.execute(stmt_pack)
        pack = res_pack.scalar_one_or_none()

        if pack:
            total = pack.total_ad_credits
            used = pack.used_ad_credits
            expires_at = pack.expires_at
        else:
            total = r.number_of_ads
            used = 0
            # Fallback to user trial_ends_at or created_at + 30 days
            stmt_user = select(User).where(User.id == r.user_id)
            res_user = await db.execute(stmt_user)
            db_user = res_user.scalar_one_or_none()
            if db_user and db_user.trial_ends_at:
                expires_at = db_user.trial_ends_at
            else:
                expires_at = r.created_at + timedelta(days=30)

        for i in range(1, total + 1):
            ad_status = "completed" if i <= used else r.status
            # If the overall request status is completed but this ad isn't used, mark it active
            if ad_status == "completed" and i > used:
                ad_status = "whatsapp_pending"

            # Build a pipeline status list for the stepper for this individual ad
            pipeline = [
                {"step": "Order Placed", "done": True},
                {"step": "Team Connected on WhatsApp", "done": ad_status in (
                    "whatsapp_connected", "partner_access_requested", "partner_access_granted",
                    "campaign_setup", "campaign_live", "completed"
                )},
                {"step": "Ads Initiated", "done": ad_status in (
                    "campaign_setup", "campaign_live", "completed"
                )},
                {"step": "Completed", "done": ad_status == "completed"},
            ]

            orders.append({
                "id": f"{r.id}-{i}",
                "business_name": r.business_name,
                "advertised_product": f"{r.advertised_product} (Ad {i}/{total})",
                "campaign_objective": r.campaign_objective,
                "number_of_ads": 1,
                "daily_budget": r.daily_budget,
                "status": ad_status,
                "partner_access_status": r.partner_access_status,
                "additional_services": r.additional_services,
                "creative_required": r.creative_required,
                "whatsapp_number": r.whatsapp_number,
                "created_at": r.created_at,
                "expires_at": expires_at,
                "pipeline": pipeline,
            })

    return {"orders": orders}


@router.get("/billing-history", summary="Get user's billing/transaction history")
async def get_user_billing_history(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns a consolidated billing log combining:
    - ServiceQuotation payments
    - AdPack purchases (with price_paid > 0)
    - Subscription billing events
    """
    user = await get_db_user_from_claims(claims, db)
    transactions = []

    # 1. Service Quotations
    stmt_q = select(ServiceQuotation).where(
        ServiceQuotation.user_id == user.id
    ).order_by(ServiceQuotation.created_at.desc())
    res_q = await db.execute(stmt_q)
    quotations = res_q.scalars().all()
    for q in quotations:
        # Load related request details to check status and load prefill details
        stmt_req = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == q.service_request_id)
        res_req = await db.execute(stmt_req)
        req = res_req.scalar_one_or_none()

        # Check 2-day expiry
        if q.status == "pending":
            now = datetime.now(timezone.utc)
            created = q.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if now - created > timedelta(days=2):
                q.status = "cancelled"
                db.add(q)
                if req and req.status in ("quotation_generated", "submitted", "eligibility_review", "eligible"):
                    req.status = "cancelled"
                    db.add(req)
                await db.commit()

        email = req.email if req else user.email
        name = req.full_name if req else (user.name or "")
        phone = req.whatsapp_number if req else ""

        transactions.append({
            "id": str(q.id),
            "type": "quotation",
            "description": f"Service Quotation",
            "amount": q.final_total,
            "currency": q.currency,
            "status": q.status,
            "date": q.created_at,
            "service_request_id": str(q.service_request_id) if req else None,
            "items": q.items,
            "email": email,
            "name": name,
            "phone": phone
        })

    # 2. Ad Packs with price_paid > 0
    stmt_p = select(AdPack).where(
        AdPack.user_id == user.id,
        AdPack.price_paid > 0,
    ).order_by(AdPack.purchased_at.desc())
    res_p = await db.execute(stmt_p)
    packs = res_p.scalars().all()
    for p in packs:
        transactions.append({
            "id": str(p.id),
            "type": "ad_pack",
            "description": f"{p.total_ad_credits} Ads — {p.pack_type.replace('_', ' ').title()}",
            "amount": p.price_paid,
            "currency": "INR",
            "status": "paid",
            "date": p.purchased_at,
        })

    # 3. Subscriptions
    stmt_s = select(Subscription).where(
        Subscription.user_id == user.id
    ).order_by(Subscription.started_at.desc())
    res_s = await db.execute(stmt_s)
    subs = res_s.scalars().all()
    for s in subs:
        transactions.append({
            "id": str(s.id),
            "type": "subscription",
            "description": f"{s.plan.title()} Plan Subscription",
            "amount": 0,
            "currency": "INR",
            "status": s.status,
            "date": s.started_at,
        })

    # Sort by date desc
    transactions.sort(key=lambda t: t["date"], reverse=True)

    return {"transactions": transactions}


# ──────────────────────────────────────────────
# Admin Management Routes
# ──────────────────────────────────────────────

@router.get("/admin/requests", summary="Admin: List all service requests")
async def admin_list_requests(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all service requests registered in the application. Restricted to administrators.
    """
    email = claims.get("email", "")
    whitelisted_admins = {"flasshgames2026@gmail.com", "digitalgrowthstudioteam@gmail.com"}
    if email not in whitelisted_admins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

    stmt = select(MetaAdServiceRequest).order_by(MetaAdServiceRequest.created_at.desc())
    res = await db.execute(stmt)
    requests = res.scalars().all()

    requests_data = []
    for r in requests:
        # Fetch associated user profile
        stmt_u = select(User).where(User.id == r.user_id)
        res_u = await db.execute(stmt_u)
        u = res_u.scalar_one_or_none()

        # Fetch associated ad packs
        stmt_p = select(AdPack).where(AdPack.service_request_id == r.id)
        res_p = await db.execute(stmt_p)
        packs = res_p.scalars().all()
        
        remaining_credits = sum(p.remaining_ad_credits for p in packs if p.status == "active")

        requests_data.append({
            "id": str(r.id),
            "customer_name": r.full_name,
            "customer_email": r.email,
            "business_name": r.business_name,
            "whatsapp_number": r.whatsapp_number,
            "industry": r.industry,
            "industry_other": r.industry_other,
            "status": r.status,
            "partner_access_status": r.partner_access_status,
            "remaining_credits": remaining_credits,
            "created_at": r.created_at,
            "user_eligibility": {
                "eligible": u.ads_service_eligible if u else True,
                "reason": u.restriction_reason if u else None
            }
        })

    return requests_data


@router.post("/admin/requests/{id}/update-status", summary="Admin: Update request parameters or record ad consumption")
async def admin_update_request(
    id: uuid.UUID,
    payload: AdminUpdateServiceRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the request operational status or partner access permission, or deducts ad pack credits when ads are consumed.
    """
    email = claims.get("email", "")
    whitelisted_admins = {"flasshgames2026@gmail.com", "digitalgrowthstudioteam@gmail.com"}
    if email not in whitelisted_admins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

    stmt = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == id)
    res = await db.execute(stmt)
    req = res.scalar_one_or_none()

    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found."
        )

    # Update simple parameters
    if payload.status:
        req.status = payload.status
    if payload.partner_access_status:
        req.partner_access_status = payload.partner_access_status

    # Consume credits if requested
    if payload.ad_credits_to_consume and payload.ad_credits_to_consume > 0:
        stmt_packs = (
            select(AdPack)
            .where(AdPack.service_request_id == req.id)
            .where(AdPack.status == "active")
            .order_by(AdPack.expires_at.asc())
        )
        res_packs = await db.execute(stmt_packs)
        packs = res_packs.scalars().all()

        to_consume = payload.ad_credits_to_consume
        for p in packs:
            if to_consume <= 0:
                break
            available = p.remaining_ad_credits
            if available > 0:
                deducted = min(available, to_consume)
                p.remaining_ad_credits -= deducted
                p.used_ad_credits += deducted
                to_consume -= deducted
                
                if p.remaining_ad_credits == 0:
                    p.status = "consumed"
                db.add(p)

        if to_consume > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to consume credits: customer only has {payload.ad_credits_to_consume - to_consume} active credits remaining."
            )

    await db.commit()
    return {"status": "success", "message": "Service request parameters updated successfully."}
