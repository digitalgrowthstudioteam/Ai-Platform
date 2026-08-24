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
from app.models.ads_service import MetaAdServiceRequest, AdPack, ServiceQuotation, CampaignPlan
from app.models.subscription import Subscription
from app.models.notification import Notification
from app.services.config_seeder import get_admin_config_value
from app.services.ads_service_eligibility import evaluate_service_eligibility, calculate_quotation
from app.services.email_service import EmailService
from app.services.campaign_plan_service import CampaignPlanService
from app.services.pdf_generator import PDFReportGenerator
from app.config import get_settings
from fastapi.responses import StreamingResponse

settings = get_settings()

logger = structlog.get_logger()
router = APIRouter(
    prefix="/ads-service",
    tags=["Meta Ads Management Service"],
)

# ──────────────────────────────────────────────
# Order ID Generation Helpers (YYMMDDHHMMSSXXXX)
# ──────────────────────────────────────────────
async def get_custom_id_for_request(r: MetaAdServiceRequest, db: AsyncSession) -> str:
    dt = r.created_at
    timestamp = dt.strftime("%y%m%d%H%M%S")
    today_start = datetime(dt.year, dt.month, dt.day, tzinfo=dt.tzinfo)
    stmt = select(func.count(MetaAdServiceRequest.id)).where(
        MetaAdServiceRequest.created_at >= today_start,
        MetaAdServiceRequest.created_at < dt
    )
    res = await db.execute(stmt)
    count = res.scalar() or 0
    return f"{timestamp}{count + 1:04d}"

async def get_custom_id_for_pack(p: AdPack, db: AsyncSession) -> str:
    dt = p.purchased_at
    timestamp = dt.strftime("%y%m%d%H%M%S")
    today_start = datetime(dt.year, dt.month, dt.day, tzinfo=dt.tzinfo)
    stmt = select(func.count(AdPack.id)).where(
        AdPack.service_request_id == None,
        AdPack.purchased_at >= today_start,
        AdPack.purchased_at < dt
    )
    res = await db.execute(stmt)
    count = res.scalar() or 0
    return f"{timestamp}{count + 1:04d}"

async def resolve_custom_id(custom_id: str, db: AsyncSession):
    if len(custom_id) < 16:
        return None, None
    timestamp = custom_id[:12]
    try:
        dt = datetime.strptime(timestamp, "%y%m%d%H%M%S")
        dt = dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None, None

    stmt = select(MetaAdServiceRequest).where(
        MetaAdServiceRequest.created_at >= dt - timedelta(seconds=1),
        MetaAdServiceRequest.created_at <= dt + timedelta(seconds=1)
    )
    res = await db.execute(stmt)
    reqs = res.scalars().all()
    for r in reqs:
        cid = await get_custom_id_for_request(r, db)
        if cid == custom_id:
            return r, None

    stmt = select(AdPack).where(
        AdPack.service_request_id == None,
        AdPack.purchased_at >= dt - timedelta(seconds=1),
        AdPack.purchased_at <= dt + timedelta(seconds=1)
    )
    res = await db.execute(stmt)
    packs = res.scalars().all()
    for p in packs:
        cid = await get_custom_id_for_pack(p, db)
        if cid == custom_id:
            return None, p

    return None, None


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class ServiceRequestCreate(BaseModel):
    campaign_plan_id: Optional[uuid.UUID] = None
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
    status: Optional[str] = "submitted"


class CampaignPlanCreate(BaseModel):
    business_name: str
    industry: str
    industry_other: Optional[str] = None
    product_or_service: str
    campaign_objective: str
    conversion_location: str
    target_location: str
    target_customer: str
    budget: str
    duration: str
    creative_availability: str
    website: Optional[str] = None
    offer: Optional[str] = None
    previous_ads_experience: str
    main_challenge: str


class CampaignPlanSavePayload(BaseModel):
    business_name: str
    campaign_profile: dict
    report_data: dict
    readiness_score: int

class AdminUpdateServiceRequest(BaseModel):
    status: Optional[str] = None
    partner_access_status: Optional[str] = None
    ad_credits_to_consume: Optional[int] = None

class AdminUpdateOrderStatusPayload(BaseModel):
    status: str
    comment: Optional[str] = None

class PublicCheckoutPayload(BaseModel):
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None

class PublicPaymentVerificationRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None

# Helper to verify signature if Razorpay is loaded
try:
    import razorpay
except ImportError:
    razorpay = None


# ──────────────────────────────────────────────
# Campaign Plan Endpoints
# ──────────────────────────────────────────────

@router.post("/campaign-plans/generate", summary="Generate a dynamic campaign plan")
async def generate_campaign_plan(
    payload: CampaignPlanCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Open endpoint to generate a plan for guest or logged in users.
    Validates restricted industry list.
    """
    profile = payload.dict()
    
    # Restriction validation logic
    full_desc = f"{profile.get('industry')} {profile.get('industry_other') or ''} {profile.get('product_or_service')} {profile.get('main_challenge')}".lower()
    restricted_keywords = [
        "gambling", "betting", "casino", "weapons", "gun", "ammunition", 
        "sexual", "erotic", "adult toy", "counterfeit", "fake brand", 
        "illegal drug", "recreational drug", "marijuana", "weed", "cocaine",
        "financial scheme", "ponzi", "pyramid scheme"
    ]
    for kw in restricted_keywords:
        if kw in full_desc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unfortunately, our Meta Ads management service is currently unavailable for this business category."
            )
            
    plan = await CampaignPlanService.generate_plan(profile)
    return plan


@router.post("/campaign-plans/save", summary="Saves generated campaign plan")
async def save_campaign_plan(
    payload: CampaignPlanSavePayload,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user = await get_db_user_from_claims(claims, db)
    
    # 1. Check if the user has already joined (paid / used onboarding offer)
    if user.intro_offer_used or user.intro_offer_eligible == False:
        raise HTTPException(
            status_code=400,
            detail="You have already joined our Meta Ads management services. You cannot generate a free plan."
        )

    # 2. Auto-delete campaign plans older than 48 hours for clean database checks
    cutoff = datetime.utcnow() - timedelta(hours=48)
    from sqlalchemy import delete
    await db.execute(delete(CampaignPlan).where(CampaignPlan.created_at < cutoff))
    await db.commit()

    # 3. Check if user already has an active generated campaign plan
    stmt_check = select(CampaignPlan).where(CampaignPlan.user_id == user.id, CampaignPlan.created_at >= cutoff)
    res_check = await db.execute(stmt_check)
    if res_check.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="You have already generated a Campaign Plan. Only one plan is allowed per user."
        )

    new_plan = CampaignPlan(
        user_id=user.id,
        business_name=payload.business_name,
        campaign_profile=payload.campaign_profile,
        report_data=payload.report_data,
        readiness_score=payload.readiness_score,
        status="generated"
    )
    db.add(new_plan)
    await db.commit()
    await db.refresh(new_plan)
    
    return {"status": "success", "plan_id": str(new_plan.id)}


@router.get("/campaign-plans", summary="List user's generated campaign plans")
async def list_campaign_plans(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user = await get_db_user_from_claims(claims, db)

    # Auto delete campaign plans older than 48 hours
    cutoff = datetime.utcnow() - timedelta(hours=48)
    from sqlalchemy import delete
    await db.execute(delete(CampaignPlan).where(CampaignPlan.created_at < cutoff))
    await db.commit()

    stmt = select(CampaignPlan).where(CampaignPlan.user_id == user.id).order_by(CampaignPlan.created_at.desc())
    res = await db.execute(stmt)
    plans = res.scalars().all()
    return plans


@router.get("/campaign-plans/{plan_id}", summary="Get campaign plan detail")
async def get_campaign_plan(
    plan_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user = await get_db_user_from_claims(claims, db)

    # Auto delete campaign plans older than 48 hours
    cutoff = datetime.utcnow() - timedelta(hours=48)
    from sqlalchemy import delete
    await db.execute(delete(CampaignPlan).where(CampaignPlan.created_at < cutoff))
    await db.commit()

    stmt = select(CampaignPlan).where(CampaignPlan.id == plan_id, CampaignPlan.user_id == user.id)
    res = await db.execute(stmt)
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Campaign plan not found.")
    return plan


@router.get("/campaign-plans/{plan_id}/pdf", summary="Download Campaign Plan PDF")
async def download_campaign_plan_pdf(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    # Auto delete campaign plans older than 48 hours
    cutoff = datetime.utcnow() - timedelta(hours=48)
    from sqlalchemy import delete
    await db.execute(delete(CampaignPlan).where(CampaignPlan.created_at < cutoff))
    await db.commit()

    stmt = select(CampaignPlan).where(CampaignPlan.id == plan_id)
    res = await db.execute(stmt)
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Campaign plan not found.")

    stmt_user = select(User).where(User.id == plan.user_id)
    res_user = await db.execute(stmt_user)
    user = res_user.scalar_one_or_none()
    user_name = user.name if user and user.name else "DGS Member"

    pdf_buffer = PDFReportGenerator.generate_campaign_plan_report(
        user_name=user_name,
        business_name=plan.business_name,
        plan_data=plan.report_data
    )
    
    filename = f"Campaign_Plan_{plan.business_name.replace(' ', '_')}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ──────────────────────────────────────────────
# Public Quotation Endpoints
# ──────────────────────────────────────────────

@router.get("/public/quotations/{quotation_id}", summary="Public: Get quotation detail by ID")
async def get_public_quotation(
    quotation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ServiceQuotation).where(ServiceQuotation.id == quotation_id)
    res = await db.execute(stmt)
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found.")
        
    stmt_req = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == quote.service_request_id)
    res_req = await db.execute(stmt_req)
    req = res_req.scalar_one_or_none()
    
    email = req.email if req else ""
    name = req.full_name if req else ""
    phone = req.whatsapp_number if req else ""
    
    return {
        "id": str(quote.id),
        "amount": quote.final_total,
        "currency": quote.currency,
        "status": quote.status,
        "items": quote.items,
        "email": email,
        "name": name,
        "phone": phone,
        "service_request_id": str(quote.service_request_id) if req else None,
    }


@router.post("/public/quotations/{quotation_id}/checkout", summary="Public: Initialize quotation checkout")
async def public_quotation_checkout(
    quotation_id: uuid.UUID,
    payload: PublicCheckoutPayload,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ServiceQuotation).where(ServiceQuotation.id == quotation_id)
    res = await db.execute(stmt)
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found.")
        
    if quote.status != "pending":
        raise HTTPException(status_code=400, detail="This quotation is no longer pending.")
        
    email = payload.email.strip().lower()
    stmt_user = select(User).where(User.email == email)
    res_user = await db.execute(stmt_user)
    user = res_user.scalar_one_or_none()
    
    if not user:
        user = User(
            firebase_uid=f"placeholder_{uuid.uuid4().hex}",
            email=email,
            name=payload.name or email.split("@")[0],
            status="active"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    quote.user_id = user.id
    db.add(quote)
    
    stmt_req = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == quote.service_request_id)
    res_req = await db.execute(stmt_req)
    req = res_req.scalar_one_or_none()
    if req:
        req.user_id = user.id
        if payload.name and not req.full_name:
            req.full_name = payload.name
        if payload.phone and not req.whatsapp_number:
            req.whatsapp_number = payload.phone
        db.add(req)
        
    await db.commit()
    
    amount = quote.final_total
    currency = quote.currency
    
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
            logger.error("razorpay_public_order_generation_failed", error=str(e))
            
    return {
        "order_id": f"order_mock_{uuid.uuid4().hex[:12]}",
        "amount": amount,
        "currency": currency,
        "key_id": "mock_razorpay_key",
        "is_mock": True
    }


@router.post("/public/quotations/{quotation_id}/verify-payment", summary="Public: Verify quotation payment")
async def public_verify_quotation_payment(
    quotation_id: uuid.UUID,
    req: PublicPaymentVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ServiceQuotation).where(ServiceQuotation.id == quotation_id)
    res = await db.execute(stmt)
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found.")
        
    stmt_req = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == quote.service_request_id)
    res_req = await db.execute(stmt_req)
    service_req = res_req.scalar_one_or_none()
    if not service_req:
        raise HTTPException(status_code=404, detail="Ads service request not found.")
        
    email = req.email.strip().lower()
    stmt_user = select(User).where(User.email == email)
    res_user = await db.execute(stmt_user)
    user = res_user.scalar_one_or_none()
    if not user:
        user = User(
            firebase_uid=f"placeholder_{uuid.uuid4().hex}",
            email=email,
            name=req.name or email.split("@")[0],
            status="active"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

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
            logger.error("public_signature_verification_failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Razorpay cryptographic signature check failed."
            )
            
    quote.status = "paid"
    quote.user_id = user.id
    db.add(quote)
    
    is_promo = any(item.get("service_type") == "ad_management_promo" for item in quote.items)
    ad_quantity = service_req.number_of_ads
    
    validity_days = 30
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
    
    if is_promo:
        user.intro_offer_used = True
        user.intro_offer_used_at = datetime.utcnow()
        user.intro_offer_service_request_id = service_req.id
        db.add(user)
        
    service_req.status = "whatsapp_pending"
    service_req.user_id = user.id
    if req.name:
        service_req.full_name = req.name
    if req.phone:
        service_req.whatsapp_number = req.phone
    db.add(service_req)
    
    from app.services.subscription_bonus import grant_starter_plan_bonus
    await grant_starter_plan_bonus(user, db, days=30)
    
    await db.commit()
    await db.refresh(pack)
    
    return {
        "status": "success",
        "message": "Payment verified. Ad pack activated successfully.",
        "pack_id": str(pack.id)
    }


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
            if field != "status":
                setattr(existing_request, field, val)
        if payload.status:
            existing_request.status = payload.status
        existing_request.updated_at = datetime.utcnow()
        req = existing_request
    else:
        # Create new service request
        req = MetaAdServiceRequest(
            user_id=user.id,
            status=payload.status or "submitted",
            **payload.dict(exclude={"status"})
        )
        db.add(req)

    await db.commit()
    await db.refresh(req)

    # Automatically generate / update quotation if status is "submitted"
    if req.status == "submitted":
        from app.services.ads_service_eligibility import calculate_quotation
        quote_data = await calculate_quotation(db, user, req)
        
        from app.models.ads_service import ServiceQuotation
        stmt_quote = (
            select(ServiceQuotation)
            .where(ServiceQuotation.service_request_id == req.id)
            .order_by(ServiceQuotation.created_at.desc())
            .limit(1)
        )
        res_quote = await db.execute(stmt_quote)
        db_quote = res_quote.scalar_one_or_none()

        if not db_quote or db_quote.status == "pending":
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



async def build_orders_for_request(r: MetaAdServiceRequest, db: AsyncSession) -> list:
    # Get custom base order ID in format YYMMDDHHMMSSXXXX
    custom_id = await get_custom_id_for_request(r, db)

    # 1. Check associated AdPack
    stmt_pack = select(AdPack).where(AdPack.service_request_id == r.id)
    res_pack = await db.execute(stmt_pack)
    pack = res_pack.scalar_one_or_none()

    if pack:
        total = pack.total_ad_credits
        used = pack.used_ad_credits
        expires_at = pack.expires_at
        order_statuses = pack.order_statuses or {}
    else:
        total = r.number_of_ads or 1
        used = 0
        order_statuses = {}
        # Fallback to user trial_ends_at or created_at + 30 days
        stmt_user = select(User).where(User.id == r.user_id)
        res_user = await db.execute(stmt_user)
        db_user = res_user.scalar_one_or_none()
        if db_user and db_user.trial_ends_at:
            expires_at = db_user.trial_ends_at
        else:
            expires_at = r.created_at + timedelta(days=30)

    orders = []

    # A. Individual Ads
    for i in range(1, total + 1):
        order_id = f"{custom_id}-ad-{i}"
        legacy_id = f"{r.id}-ad-{i}"
        
        # Check custom override status/comment/history (support both custom ID and legacy UUID keys)
        target_id = order_id if order_id in order_statuses else (legacy_id if legacy_id in order_statuses else None)
        if target_id:
            ad_status = order_statuses[target_id]["status"]
            comment = order_statuses[target_id].get("comment", "")
            history = order_statuses[target_id].get("history", [])
        else:
            ad_status = "completed" if i <= used else r.status
            if ad_status == "completed" and i > used:
                ad_status = "whatsapp_pending"
            comment = ""
            history = []

        pipeline = [
            {"step": "Order Placed", "done": True},
            {"step": "Team Connected on WhatsApp", "done": ad_status in (
                "whatsapp_connected", "partner_access_requested", "partner_access_granted",
                "campaign_setup", "campaign_live", "completed", "ready_for_setup", "ads_initiated"
            )},
            {"step": "Ads Initiated", "done": ad_status in (
                "campaign_setup", "campaign_live", "completed", "ads_initiated"
            )},
            {"step": "Completed", "done": ad_status == "completed"},
        ]

        orders.append({
            "id": order_id,
            "parent_request_id": str(r.id),
            "order_type": "ad",
            "business_name": r.business_name,
            "advertised_product": f"{r.advertised_product} (Ad {i}/{total})",
            "campaign_objective": r.campaign_objective,
            "number_of_ads": 1,
            "daily_budget": r.daily_budget,
            "status": ad_status,
            "comment": comment,
            "history": history,
            "partner_access_status": r.partner_access_status,
            "creative_required": r.creative_required,
            "whatsapp_number": r.whatsapp_number,
            "created_at": r.created_at,
            "expires_at": expires_at,
            "pipeline": pipeline,
        })

    # B. Add-on deliverables from paid quotations
    stmt_q = select(ServiceQuotation).where(
        ServiceQuotation.service_request_id == r.id,
        ServiceQuotation.status == "paid"
    ).limit(1)
    res_q = await db.execute(stmt_q)
    paid_quote = res_q.scalar_one_or_none()

    has_setup = not r.meta_account_exists
    has_creative = r.creative_required

    # If there was a paid quotation, check its items
    if paid_quote:
        has_setup = any(item.get("service_type") == "account_setup" for item in paid_quote.items)
        has_creative = any(item.get("service_type") == "creative_design" for item in paid_quote.items)

    # 1) Account Setup Order Row
    if has_setup:
        order_id = f"{custom_id}-setup"
        legacy_id = f"{r.id}-setup"
        target_id = order_id if order_id in order_statuses else (legacy_id if legacy_id in order_statuses else None)
        
        if target_id:
            setup_status = order_statuses[target_id]["status"]
            comment = order_statuses[target_id].get("comment", "")
            history = order_statuses[target_id].get("history", [])
        else:
            setup_status = "completed" if r.partner_access_status == "granted" or r.status in (
                "campaign_setup", "campaign_live", "completed"
            ) else r.status
            comment = ""
            history = []
        
        setup_pipeline = [
            {"step": "Order Placed", "done": True},
            {"step": "WhatsApp Connected", "done": setup_status not in ("trial_started", "whatsapp_pending")},
            {"step": "Partner Access Granted", "done": r.partner_access_status == "granted" or setup_status in (
                "partner_access_granted", "campaign_setup", "campaign_live", "completed", "ready_for_setup", "ads_initiated"
            )},
            {"step": "Completed", "done": r.partner_access_status == "granted" or setup_status in (
                "campaign_setup", "campaign_live", "completed"
            )},
        ]
        
        orders.append({
            "id": order_id,
            "parent_request_id": str(r.id),
            "order_type": "addon_setup",
            "business_name": r.business_name,
            "advertised_product": f"Meta Ad Account Setup — {r.business_name}",
            "campaign_objective": "Setup & Business Verification",
            "number_of_ads": 0,
            "daily_budget": "—",
            "status": setup_status,
            "comment": comment,
            "history": history,
            "partner_access_status": r.partner_access_status,
            "creative_required": False,
            "whatsapp_number": r.whatsapp_number,
            "created_at": r.created_at,
            "expires_at": expires_at,
            "pipeline": setup_pipeline,
        })

    # 2) Creative Design Order Row
    if has_creative:
        order_id = f"{custom_id}-creative"
        legacy_id = f"{r.id}-creative"
        target_id = order_id if order_id in order_statuses else (legacy_id if legacy_id in order_statuses else None)
        
        if target_id:
            creative_status = order_statuses[target_id]["status"]
            comment = order_statuses[target_id].get("comment", "")
            history = order_statuses[target_id].get("history", [])
        else:
            creative_status = "completed" if r.status in ("campaign_setup", "campaign_live", "completed") else r.status
            comment = ""
            history = []
        
        creative_pipeline = [
            {"step": "Order Placed", "done": True},
            {"step": "Brief Received", "done": True},
            {"step": "Creatives Ready", "done": creative_status in ("campaign_setup", "campaign_live", "completed", "ads_initiated")},
            {"step": "Completed", "done": creative_status in ("campaign_setup", "campaign_live", "completed")},
        ]
        
        orders.append({
            "id": order_id,
            "parent_request_id": str(r.id),
            "order_type": "addon_creative",
            "business_name": r.business_name,
            "advertised_product": f"Creative Design & Copywriting — {r.business_name}",
            "campaign_objective": "Ad Creatives & Formats",
            "number_of_ads": 0,
            "daily_budget": "—",
            "status": creative_status,
            "comment": comment,
            "history": history,
            "partner_access_status": r.partner_access_status,
            "creative_required": True,
            "whatsapp_number": r.whatsapp_number,
            "created_at": r.created_at,
            "expires_at": expires_at,
            "pipeline": creative_pipeline,
        })

    return orders


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

    stmt_reqs = select(MetaAdServiceRequest).where(
        MetaAdServiceRequest.user_id == user.id
    ).order_by(MetaAdServiceRequest.created_at.desc())
    res_reqs = await db.execute(stmt_reqs)
    all_requests = res_reqs.scalars().all()

    requests = []
    for r in all_requests:
        # Check if there is an associated quotation
        stmt_q = select(ServiceQuotation).where(ServiceQuotation.service_request_id == r.id)
        res_q = await db.execute(stmt_q)
        quotes = res_q.scalars().all()
        
        if quotes:
            # If there are quotations, at least one must be 'paid'
            if any(q.status == "paid" for q in quotes):
                requests.append(r)
        else:
            # If there are no quotations, we check if the request is 'trial_started'
            # or if it has an associated AdPack
            stmt_ap = select(AdPack).where(AdPack.service_request_id == r.id)
            res_ap = await db.execute(stmt_ap)
            has_pack = res_ap.scalar_one_or_none() is not None
            
            if r.status == "trial_started" or has_pack:
                requests.append(r)

    orders = []
    for r in requests:
        req_orders = await build_orders_for_request(r, db)
        orders.extend(req_orders)

    # Fetch manually allotted AdPacks (where service_request_id is NULL)
    stmt_manual_packs = select(AdPack).where(
        AdPack.user_id == user.id,
        AdPack.service_request_id == None
    ).order_by(AdPack.purchased_at.desc())
    res_manual_packs = await db.execute(stmt_manual_packs)
    manual_packs = res_manual_packs.scalars().all()

    for p in manual_packs:
        custom_id = await get_custom_id_for_pack(p, db)
        total = p.total_ad_credits
        used = p.used_ad_credits
        order_statuses = p.order_statuses or {}
        status = "completed" if p.status in ("consumed", "expired") else "whatsapp_pending"

        for i in range(1, total + 1):
            order_id = f"{custom_id}-ad-{i}"
            legacy_id = f"manual-{p.id}-ad-{i}"
            
            target_id = order_id if order_id in order_statuses else (legacy_id if legacy_id in order_statuses else None)
            if target_id:
                ad_status = order_statuses[target_id]["status"]
                comment = order_statuses[target_id].get("comment", "")
                history = order_statuses[target_id].get("history", [])
            else:
                ad_status = "completed" if i <= used else status
                comment = ""
                history = []
            
            pipeline = [
                {"step": "Allotted by Admin", "done": True},
                {"step": "Ready for Setup", "done": ad_status in ("ready_for_setup", "ads_initiated", "completed")},
                {"step": "Ads Initiated", "done": ad_status in ("ads_initiated", "completed") or i <= used or p.status in ("consumed", "expired")},
                {"step": "Completed", "done": ad_status == "completed"},
            ]

            orders.append({
                "id": order_id,
                "parent_request_id": None,
                "order_type": "manual_ad",
                "business_name": "Allotted Ads",
                "advertised_product": f"Meta Ads Allotted by Admin (Ad {i}/{total})",
                "campaign_objective": "Manual Allotment",
                "number_of_ads": 1,
                "daily_budget": "Custom",
                "status": ad_status,
                "comment": comment,
                "history": history,
                "partner_access_status": "granted",
                "creative_required": False,
                "whatsapp_number": "—",
                "created_at": p.purchased_at,
                "expires_at": p.expires_at,
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


@router.post("/quotations/{id}/cancel", summary="Cancel a pending quotation")
async def cancel_quotation(
    id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user = await get_db_user_from_claims(claims, db)
    stmt = select(ServiceQuotation).where(
        ServiceQuotation.id == id,
        ServiceQuotation.user_id == user.id
    )
    res = await db.execute(stmt)
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found.")
        
    if quote.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending quotations can be cancelled.")
        
    quote.status = "cancelled"
    db.add(quote)
    
    # Also cancel the associated request if it is not already in an active/paid state
    stmt_req = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == quote.service_request_id)
    res_req = await db.execute(stmt_req)
    req = res_req.scalar_one_or_none()
    if req and req.status in ("draft", "submitted", "eligibility_review", "eligible", "quotation_generated"):
        req.status = "cancelled"
        db.add(req)
        
    await db.commit()
    return {"status": "success", "message": "Quotation cancelled successfully."}


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
            "user_id": str(r.user_id),
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


@router.get("/admin/orders", summary="Admin: List all service orders")
async def admin_list_orders(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all split service orders (individual ads and add-on deliverables) for paid requests.
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
    all_requests = res.scalars().all()

    requests = []
    for r in all_requests:
        # Check if there is an associated quotation
        stmt_q = select(ServiceQuotation).where(ServiceQuotation.service_request_id == r.id)
        res_q = await db.execute(stmt_q)
        quotes = res_q.scalars().all()
        
        if quotes:
            # If there are quotations, at least one must be 'paid'
            if any(q.status == "paid" for q in quotes):
                requests.append(r)
        else:
            # If there are no quotations, we check if the request is 'trial_started'
            # or if it has an associated AdPack
            stmt_ap = select(AdPack).where(AdPack.service_request_id == r.id)
            res_ap = await db.execute(stmt_ap)
            has_pack = res_ap.scalar_one_or_none() is not None
            
            if r.status == "trial_started" or has_pack:
                requests.append(r)

    all_orders = []
    for r in requests:
        # Fetch associated user profile
        stmt_u = select(User).where(User.id == r.user_id)
        res_u = await db.execute(stmt_u)
        u = res_u.scalar_one_or_none()

        req_orders = await build_orders_for_request(r, db)
        for o in req_orders:
            # Add user profile info
            o["customer_name"] = r.full_name
            o["customer_email"] = r.email
            o["user_id"] = str(r.user_id)
            o["user_eligibility"] = {
                "eligible": u.ads_service_eligible if u else True,
                "reason": u.restriction_reason if u else None
            }
            all_orders.append(o)

    # Fetch all manually allotted AdPacks
    stmt_manual_packs = select(AdPack).where(
        AdPack.service_request_id == None
    ).order_by(AdPack.purchased_at.desc())
    res_manual_packs = await db.execute(stmt_manual_packs)
    manual_packs = res_manual_packs.scalars().all()

    for p in manual_packs:
        custom_id = await get_custom_id_for_pack(p, db)
        # Fetch associated user profile
        stmt_u = select(User).where(User.id == p.user_id)
        res_u = await db.execute(stmt_u)
        u = res_u.scalar_one_or_none()

        total = p.total_ad_credits
        used = p.used_ad_credits
        order_statuses = p.order_statuses or {}
        status = "completed" if p.status in ("consumed", "expired") else "whatsapp_pending"

        for i in range(1, total + 1):
            order_id = f"{custom_id}-ad-{i}"
            legacy_id = f"manual-{p.id}-ad-{i}"
            
            target_id = order_id if order_id in order_statuses else (legacy_id if legacy_id in order_statuses else None)
            if target_id:
                ad_status = order_statuses[target_id]["status"]
                comment = order_statuses[target_id].get("comment", "")
                history = order_statuses[target_id].get("history", [])
            else:
                ad_status = "completed" if i <= used else status
                comment = ""
                history = []
            
            pipeline = [
                {"step": "Allotted by Admin", "done": True},
                {"step": "Ready for Setup", "done": ad_status in ("ready_for_setup", "ads_initiated", "completed")},
                {"step": "Ads Initiated", "done": ad_status in ("ads_initiated", "completed") or i <= used or p.status in ("consumed", "expired")},
                {"step": "Completed", "done": ad_status == "completed"},
            ]

            all_orders.append({
                "id": order_id,
                "parent_request_id": None,
                "order_type": "manual_ad",
                "business_name": "Allotted Ads",
                "advertised_product": f"Meta Ads Allotted by Admin (Ad {i}/{total})",
                "campaign_objective": "Manual Allotment",
                "number_of_ads": 1,
                "daily_budget": "Custom",
                "status": ad_status,
                "comment": comment,
                "history": history,
                "partner_access_status": "granted",
                "creative_required": False,
                "whatsapp_number": "—",
                "created_at": p.purchased_at,
                "expires_at": p.expires_at,
                "pipeline": pipeline,
                "customer_name": u.name if (u and u.name) else (u.email if u else "Manual User"),
                "customer_email": u.email if u else "unknown@example.com",
                "user_id": str(p.user_id),
                "user_eligibility": {
                    "eligible": u.ads_service_eligible if u else True,
                    "reason": u.restriction_reason if u else None
                }
            })

    return all_orders


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


@router.post("/admin/orders/{order_id}/status", summary="Admin: Update status, comment and log history of an individual lead/order")
async def admin_update_order_status(
    order_id: str,
    payload: AdminUpdateOrderStatusPayload,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    email = claims.get("email", "")
    whitelisted_admins = {"flasshgames2026@gmail.com", "digitalgrowthstudioteam@gmail.com"}
    if email not in whitelisted_admins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

    pack = None
    
    # 1. Parse base custom ID
    custom_id = None
    if "-ad-" in order_id:
        custom_id = order_id[:order_id.find("-ad-")]
    elif "-setup" in order_id:
        custom_id = order_id[:order_id.find("-setup")]
    elif "-creative" in order_id:
        custom_id = order_id[:order_id.find("-creative")]
        
    is_custom = custom_id and len(custom_id) == 16 and custom_id.isdigit()
    
    if is_custom:
        req, resolved_pack = await resolve_custom_id(custom_id, db)
        if req:
            stmt = select(AdPack).where(AdPack.service_request_id == req.id)
            res = await db.execute(stmt)
            pack = res.scalar_one_or_none()
            
            if not pack:
                # Lazily create an AdPack for this request
                pack = AdPack(
                    user_id=req.user_id,
                    service_request_id=req.id,
                    pack_type=f"pack_{req.number_of_ads}",
                    total_ad_credits=req.number_of_ads or 1,
                    used_ad_credits=0,
                    remaining_ad_credits=req.number_of_ads or 1,
                    price_paid=0,
                    expires_at=datetime.utcnow() + timedelta(days=30),
                    status="active",
                    non_refundable_terms_accepted=True,
                    non_refundable_terms_accepted_at=datetime.utcnow()
                )
                db.add(pack)
                await db.commit()
                await db.refresh(pack)
        elif resolved_pack:
            pack = resolved_pack
    else:
        # Legacy UUID fallback
        is_manual = order_id.startswith("manual-")
        if is_manual:
            # manual-{uuid}-ad-{i}
            ad_idx = order_id.rfind("-ad-")
            if ad_idx != -1:
                try:
                    uuid_str = order_id[7:ad_idx]
                    pack_id = uuid.UUID(uuid_str)
                    stmt = select(AdPack).where(AdPack.id == pack_id)
                    res = await db.execute(stmt)
                    pack = res.scalar_one_or_none()
                except ValueError:
                    pass
        else:
            # {r.id}-ad-{i} or {r.id}-setup or {r.id}-creative
            req_id_str = None
            if "-ad-" in order_id:
                req_id_str = order_id[:order_id.find("-ad-")]
            elif "-setup" in order_id:
                req_id_str = order_id[:order_id.find("-setup")]
            elif "-creative" in order_id:
                req_id_str = order_id[:order_id.find("-creative")]
                
            if req_id_str:
                try:
                    req_id = uuid.UUID(req_id_str)
                    stmt = select(AdPack).where(AdPack.service_request_id == req_id)
                    res = await db.execute(stmt)
                    pack = res.scalar_one_or_none()
                    
                    if not pack:
                        # Lazily create an AdPack for this request
                        stmt_req = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == req_id)
                        res_req = await db.execute(stmt_req)
                        req = res_req.scalar_one_or_none()
                        if req:
                            pack = AdPack(
                                user_id=req.user_id,
                                service_request_id=req.id,
                                pack_type=f"pack_{req.number_of_ads}",
                                total_ad_credits=req.number_of_ads or 1,
                                used_ad_credits=0,
                                remaining_ad_credits=req.number_of_ads or 1,
                                price_paid=0,
                                expires_at=datetime.utcnow() + timedelta(days=30),
                                status="active",
                                non_refundable_terms_accepted=True,
                                non_refundable_terms_accepted_at=datetime.utcnow()
                            )
                            db.add(pack)
                            await db.commit()
                            await db.refresh(pack)
                except ValueError:
                    pass

    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order or corresponding AdPack not found."
        )

    # Initialize order_statuses if needed
    order_statuses = pack.order_statuses
    if order_statuses is None:
        order_statuses = {}

    existing_record = order_statuses.get(order_id, {})
    old_status = existing_record.get("status")
    new_status = payload.status

    # Synchronize credit consumption if status changes to/from completed for ad orders
    is_ad_order = "-ad-" in order_id
    if is_ad_order:
        if new_status == "completed" and old_status != "completed":
            if pack.remaining_ad_credits > 0:
                pack.remaining_ad_credits -= 1
                pack.used_ad_credits += 1
                if pack.remaining_ad_credits == 0:
                    pack.status = "consumed"
        elif old_status == "completed" and new_status != "completed":
            pack.used_ad_credits = max(0, pack.used_ad_credits - 1)
            pack.remaining_ad_credits = min(pack.total_ad_credits, pack.remaining_ad_credits + 1)
            if pack.remaining_ad_credits > 0 and pack.status == "consumed":
                pack.status = "active"

    # Append to history
    history = existing_record.get("history", [])
    history_entry = {
        "status": new_status,
        "comment": payload.comment or "",
        "updated_at": datetime.utcnow().isoformat(),
        "updated_by": email
    }
    history.append(history_entry)

    # Update order statuses
    order_statuses[order_id] = {
        "status": new_status,
        "comment": payload.comment or "",
        "history": history
    }

    # Set and flag as modified
    from sqlalchemy.orm.attributes import flag_modified
    pack.order_statuses = {**order_statuses}
    flag_modified(pack, "order_statuses")
    
    db.add(pack)
    await db.commit()

    return {
        "status": "success",
        "message": f"Successfully updated status for order {order_id}.",
        "order_status": new_status,
        "comment": payload.comment or "",
        "history": history
    }
