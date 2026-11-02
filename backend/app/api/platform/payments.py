"""
Digital Growth Studio — Platform Payments & Razorpay Integration
Handles:
1. One-Time Setup Fee Orders, Coupon validation & Razorpay checkout
2. Add-on Services Razorpay checkout & quota activation
3. Android App Monthly Subscription (₹499/mo) activation upon final APK approval
"""
import uuid
import structlog
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.config import get_settings
from app.core.platform_auth import require_vendor_admin, CurrentVendor
from app.models.platform.vendor import PlatformVendor, PlatformStore, PlatformVendorAppConfig, PlatformStorageUsage
from app.models.platform.subscription import (
    PlatformPlan,
    PlatformSubscription,
    PlatformPayment,
    PlatformAddon,
    PlatformVendorAddon,
    PlatformCoupon,
)
from app.schemas.platform.payments import (
    SetupFeeQuoteResponse,
    CouponValidateRequest,
    CouponValidateResponse,
    SetupFeeOrderCreateRequest,
    SetupFeeOrderResponse,
    SetupFeeVerifyRequest,
    AddonOrderCreateRequest,
    AddonVerifyRequest,
)

try:
    import razorpay
except ImportError:
    razorpay = None

logger = structlog.get_logger(__name__)
settings = get_settings()

router = APIRouter(prefix="/payments", tags=["Platform Payments & Razorpay"])


def _is_expired(dt: Optional[datetime], now: datetime) -> bool:
    if not dt:
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt < now


# ──────────────────────────────────────────────
# 1. Setup Fee Quote & Pricing
# ──────────────────────────────────────────────
@router.get("/setup-fee-quote", response_model=SetupFeeQuoteResponse)
async def get_setup_fee_quote(
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve setup fee quote, discounts, and payment clearance status for vendor."""
    vid = current.vendor.id
    sub_stmt = (
        select(PlatformSubscription)
        .where(PlatformSubscription.vendor_id == vid)
        .options(selectinload(PlatformSubscription.plan))
        .order_by(desc(PlatformSubscription.created_at))
    )
    sub = (await db.execute(sub_stmt)).scalars().first()

    # Default starter plan pricing
    plan_stmt = select(PlatformPlan).where(PlatformPlan.slug == "starter-store")
    plan = (await db.execute(plan_stmt)).scalar_one_or_none()

    base_mrp = plan.setup_fee_inr if plan else 2000.0
    sale_price = getattr(plan, "setup_fee_sale_price_inr", 999.0) if plan else 999.0

    custom_price = sub.setup_fee_custom_price_inr if sub else None
    final_price = custom_price if (custom_price is not None and custom_price < sale_price) else sale_price

    setup_fee_paid = sub.setup_fee_paid if sub else False
    setup_fee_waived = sub.setup_fee_waived if sub else False
    setup_fee_cleared = setup_fee_paid or setup_fee_waived

    return SetupFeeQuoteResponse(
        plan_name=plan.name if plan else "Starter Store Plan",
        base_price_inr=base_mrp,
        sale_price_inr=sale_price,
        custom_price_inr=custom_price,
        final_price_inr=final_price,
        setup_fee_paid=setup_fee_paid,
        setup_fee_waived=setup_fee_waived,
        setup_fee_cleared=setup_fee_cleared,
        key_id=settings.RAZORPAY_KEY_ID or "rzp_test_platform_mock",
        currency="INR",
        features=[
            "Official Android Mobile Shopping App compilation & Play Store setup",
            "Dedicated secure store subdomain (.digitalgrowthstudio.in)",
            "Unlimited product catalog with variant & image gallery hosting",
            "1GB High-Speed Cloud Storage CDN",
            "Direct WhatsApp order alerts & automated notifications",
        ],
    )


# ──────────────────────────────────────────────
# 2. Coupon Validation
# ──────────────────────────────────────────────
@router.post("/validate-coupon", response_model=CouponValidateResponse)
async def validate_coupon(
    payload: CouponValidateRequest,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Validate coupon code for setup fee and compute discount."""
    code_clean = payload.code.upper().strip()
    now = datetime.now(timezone.utc)

    stmt = select(PlatformCoupon).where(
        PlatformCoupon.code == code_clean,
        PlatformCoupon.is_active == True,
    )
    coupon = (await db.execute(stmt)).scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid coupon code.")

    if _is_expired(coupon.valid_until, now):
        raise HTTPException(status_code=400, detail="Coupon code has expired.")

    if coupon.used_count >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="Coupon code usage limit has been reached.")

    if coupon.vendor_id and coupon.vendor_id != current.vendor.id:
        raise HTTPException(status_code=400, detail="This coupon code is not valid for your account.")

    # Get quote price
    sub_stmt = select(PlatformSubscription).where(PlatformSubscription.vendor_id == current.vendor.id).order_by(desc(PlatformSubscription.created_at))
    sub = (await db.execute(sub_stmt)).scalars().first()
    plan_stmt = select(PlatformPlan).where(PlatformPlan.slug == "starter-store")
    plan = (await db.execute(plan_stmt)).scalar_one_or_none()
    current_price = getattr(plan, "setup_fee_sale_price_inr", 999.0) if plan else 999.0
    if sub and sub.setup_fee_custom_price_inr is not None and sub.setup_fee_custom_price_inr < current_price:
        current_price = sub.setup_fee_custom_price_inr

    discount_inr = 0.0
    if coupon.discount_type == "PERCENTAGE":
        discount_inr = round(current_price * (coupon.discount_value / 100.0), 2)
    else:
        discount_inr = round(min(coupon.discount_value, current_price), 2)

    new_total = max(0.0, current_price - discount_inr)
    return CouponValidateResponse(
        valid=True,
        code=coupon.code,
        discount_type=coupon.discount_type,
        discount_value=coupon.discount_value,
        discount_inr=discount_inr,
        new_total_inr=new_total,
        message=f"Coupon '{coupon.code}' applied! You save ₹{discount_inr:.0f}.",
    )


# ──────────────────────────────────────────────
# 3. Create Setup Fee Razorpay Order
# ──────────────────────────────────────────────
@router.post("/create-setup-fee-order", response_model=SetupFeeOrderResponse)
async def create_setup_fee_order(
    payload: SetupFeeOrderCreateRequest,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Generate official Razorpay order for vendor one-time setup fee."""
    vid = current.vendor.id
    sub_stmt = select(PlatformSubscription).where(PlatformSubscription.vendor_id == vid).order_by(desc(PlatformSubscription.created_at))
    sub = (await db.execute(sub_stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription record not found.")

    if sub.setup_fee_paid or sub.setup_fee_waived:
        raise HTTPException(status_code=400, detail="Setup fee has already been paid/cleared for this store.")

    plan_stmt = select(PlatformPlan).where(PlatformPlan.slug == "starter-store")
    plan = (await db.execute(plan_stmt)).scalar_one_or_none()
    base_price = getattr(plan, "setup_fee_sale_price_inr", 999.0) if plan else 999.0
    if sub.setup_fee_custom_price_inr is not None and sub.setup_fee_custom_price_inr < base_price:
        base_price = sub.setup_fee_custom_price_inr

    final_price = base_price

    # Apply coupon if provided
    if payload.coupon_code:
        code_clean = payload.coupon_code.upper().strip()
        now = datetime.now(timezone.utc)
        c_stmt = select(PlatformCoupon).where(
            PlatformCoupon.code == code_clean,
            PlatformCoupon.is_active == True,
        )
        coupon = (await db.execute(c_stmt)).scalar_one_or_none()
        if coupon and not _is_expired(coupon.valid_until, now) and coupon.used_count < coupon.max_uses:
            if not coupon.vendor_id or coupon.vendor_id == vid:
                if coupon.discount_type == "PERCENTAGE":
                    discount = round(final_price * (coupon.discount_value / 100.0), 2)
                else:
                    discount = round(min(coupon.discount_value, final_price), 2)
                final_price = max(0.0, final_price - discount)

    # 100% Free / Discounted case
    if final_price <= 0.0:
        sub.setup_fee_paid = True
        sub.setup_fee_paid_at = datetime.now(timezone.utc)
        sub.status = "PENDING_APK_APPROVAL"
        db.add(PlatformPayment(
            vendor_id=vid,
            subscription_id=sub.id,
            amount_inr=0.0,
            payment_type="SETUP_FEE",
            gateway="COUPON_100",
            status="SUCCESS",
        ))
        await db.commit()
        return SetupFeeOrderResponse(
            order_id="free_setup_grant",
            amount=0,
            currency="INR",
            key_id="",
            is_mock=True,
            is_free=True,
            message="100% discount applied. Account setup fee cleared!",
        )

    amount_paise = int(round(final_price * 100))
    is_mock = True
    order_id = f"order_mock_setup_{uuid.uuid4().hex[:10]}"

    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and razorpay:
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            order_data = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"setup_{current.vendor.vendor_code}_{uuid.uuid4().hex[:6]}",
                "notes": {
                    "vendor_id": str(vid),
                    "vendor_code": current.vendor.vendor_code,
                    "payment_type": "SETUP_FEE",
                },
            }
            rzp_order = client.order.create(order_data)
            order_id = rzp_order["id"]
            is_mock = False
        except Exception as e:
            logger.error("razorpay_setup_fee_order_failed", error=str(e))
            raise HTTPException(status_code=500, detail="Failed to initiate Razorpay checkout order.")

    sub.razorpay_order_id = order_id
    await db.commit()

    return SetupFeeOrderResponse(
        order_id=order_id,
        amount=amount_paise,
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID or "rzp_test_platform_mock",
        is_mock=is_mock,
        is_free=False,
    )


# ──────────────────────────────────────────────
# 4. Verify Setup Fee Payment
# ──────────────────────────────────────────────
@router.post("/verify-setup-fee")
async def verify_setup_fee_payment(
    payload: SetupFeeVerifyRequest,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Verify Razorpay signature, record transaction, and unlock dashboard access."""
    vid = current.vendor.id
    sub_stmt = select(PlatformSubscription).where(PlatformSubscription.vendor_id == vid).order_by(desc(PlatformSubscription.created_at))
    sub = (await db.execute(sub_stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription record not found.")

    is_mock = (
        payload.razorpay_order_id.startswith("order_mock_")
        or payload.razorpay_payment_id.startswith("pay_mock_")
        or payload.razorpay_signature.startswith("mock_")
        or not bool(settings.RAZORPAY_KEY_ID)
    )

    if not is_mock and settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and razorpay:
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            client.utility.verify_payment_signature({
                "razorpay_order_id": payload.razorpay_order_id,
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_signature": payload.razorpay_signature,
            })
        except Exception as e:
            logger.error("razorpay_signature_verification_failed", error=str(e))
            raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature.")

    now = datetime.now(timezone.utc)
    sub.setup_fee_paid = True
    sub.setup_fee_paid_at = now
    sub.status = "PENDING_APK_APPROVAL"  # Subscription auto-debit will begin after APK approval
    sub.razorpay_payment_id = payload.razorpay_payment_id
    sub.razorpay_order_id = payload.razorpay_order_id

    # Record payment
    payment = PlatformPayment(
        vendor_id=vid,
        subscription_id=sub.id,
        amount_inr=sub.monthly_price_inr,
        payment_type="SETUP_FEE",
        gateway="RAZORPAY",
        reference_id=payload.razorpay_payment_id,
        status="SUCCESS",
    )
    db.add(payment)

    # Increment coupon count if used
    if payload.coupon_code:
        c_stmt = select(PlatformCoupon).where(PlatformCoupon.code == payload.coupon_code.upper().strip())
        coupon = (await db.execute(c_stmt)).scalar_one_or_none()
        if coupon:
            coupon.used_count += 1

    await db.commit()
    logger.info("setup_fee_verified_successfully", vendor_id=str(vid), payment_id=payload.razorpay_payment_id)

    return {
        "success": True,
        "message": "One-Time Setup Fee confirmed! Your dashboard access has been unlocked.",
        "setup_fee_cleared": True,
    }


# ──────────────────────────────────────────────
# 5. Add-on Services Razorpay Checkout
# ──────────────────────────────────────────────
@router.post("/create-addon-order")
async def create_addon_order(
    payload: AddonOrderCreateRequest,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Generate platform Razorpay order for purchasing growth add-ons."""
    addon = (await db.execute(select(PlatformAddon).where(PlatformAddon.id == payload.addon_id))).scalar_one_or_none()
    if not addon or not addon.is_active:
        raise HTTPException(status_code=404, detail="Add-on service not found or currently inactive.")

    amount_paise = int(round(addon.price_inr * 100))
    is_mock = True
    order_id = f"order_mock_addon_{uuid.uuid4().hex[:10]}"

    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and razorpay:
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            order_data = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"addon_{addon.code}_{uuid.uuid4().hex[:6]}",
                "notes": {
                    "vendor_id": str(current.vendor.id),
                    "addon_id": str(addon.id),
                    "addon_code": addon.code,
                    "payment_type": "ADDON",
                },
            }
            rzp_order = client.order.create(order_data)
            order_id = rzp_order["id"]
            is_mock = False
        except Exception as e:
            logger.error("razorpay_addon_order_failed", error=str(e))
            raise HTTPException(status_code=500, detail="Failed to create Razorpay checkout for add-on.")

    return {
        "order_id": order_id,
        "amount": amount_paise,
        "currency": "INR",
        "addon_name": addon.name,
        "addon_code": addon.code,
        "key_id": settings.RAZORPAY_KEY_ID or "rzp_test_platform_mock",
        "is_mock": is_mock,
    }


@router.post("/verify-addon-payment")
async def verify_addon_payment(
    payload: AddonVerifyRequest,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Verify add-on payment, record payment, and immediately activate add-on entitlements."""
    vid = current.vendor.id
    addon = (await db.execute(select(PlatformAddon).where(PlatformAddon.id == payload.addon_id))).scalar_one_or_none()
    if not addon:
        raise HTTPException(status_code=404, detail="Add-on service not found.")

    is_mock = (
        payload.razorpay_order_id.startswith("order_mock_")
        or payload.razorpay_payment_id.startswith("pay_mock_")
        or payload.razorpay_signature.startswith("mock_")
        or not bool(settings.RAZORPAY_KEY_ID)
    )

    if not is_mock and settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and razorpay:
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            client.utility.verify_payment_signature({
                "razorpay_order_id": payload.razorpay_order_id,
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_signature": payload.razorpay_signature,
            })
        except Exception as e:
            logger.error("razorpay_addon_signature_failed", error=str(e))
            raise HTTPException(status_code=400, detail="Invalid Razorpay signature for add-on payment.")

    now = datetime.now(timezone.utc)
    vendor_addon = PlatformVendorAddon(
        vendor_id=vid,
        addon_id=addon.id,
        status="active",
        price_paid=addon.price_inr,
        activated_at=now,
        expires_at=now + timedelta(days=30) if addon.billing_type == "MONTHLY" else None,
    )
    db.add(vendor_addon)

    # Entitlement: If storage add-on (e.g. storage-5gb), instantly add 5GB to storage quota
    if addon.code == "storage-5gb":
        st = (await db.execute(select(PlatformStorageUsage).where(PlatformStorageUsage.vendor_id == vid))).scalar_one_or_none()
        if st:
            st.limit_bytes += 5 * 1024 * 1024 * 1024

    # Record payment transaction
    db.add(PlatformPayment(
        vendor_id=vid,
        amount_inr=addon.price_inr,
        payment_type="ADDON",
        gateway="RAZORPAY",
        reference_id=payload.razorpay_payment_id,
        status="SUCCESS",
    ))

    await db.commit()
    return {
        "success": True,
        "message": f"'{addon.name}' activated successfully via Razorpay!",
    }


# ──────────────────────────────────────────────
# 6. APK Approval & ₹499/mo Monthly Subscription Activation
# ──────────────────────────────────────────────
@router.post("/approve-apk-and-activate-subscription")
async def approve_apk_and_activate_subscription(
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Vendor tests and approves the final submitted Android APK.
    Activates the ₹499/month recurring auto-debit subscription.
    """
    vid = current.vendor.id
    cfg = current.vendor.app_config
    if not cfg:
        raise HTTPException(status_code=404, detail="App configuration not found.")

    if cfg.app_build_status != "BUILT" or not cfg.apk_download_url:
        raise HTTPException(
            status_code=400,
            detail="The final APK has not yet been submitted by our Android engineering team.",
        )

    now = datetime.now(timezone.utc)
    cfg.apk_user_approved = True
    cfg.apk_user_approved_at = now
    cfg.subscription_auto_debit_active = True

    # Activate subscription
    sub_stmt = select(PlatformSubscription).where(PlatformSubscription.vendor_id == vid).order_by(desc(PlatformSubscription.created_at))
    sub = (await db.execute(sub_stmt)).scalars().first()
    if sub:
        sub.status = "active"
        sub.starts_at = now
        sub.next_renewal_date = now + timedelta(days=30)
        sub.expires_at = now + timedelta(days=30)

    # Vendor status becomes fully active
    current.vendor.status = "active"

    await db.commit()
    logger.info("apk_approved_and_subscription_started", vendor_id=str(vid), app_name=cfg.app_name)

    return {
        "success": True,
        "message": "Final APK approved! Your ₹499/mo Android App recurring subscription is now active.",
        "apk_user_approved": True,
        "subscription_status": "active",
        "subscription_auto_debit_active": True,
        "next_renewal_date": (now + timedelta(days=30)).isoformat(),
    }

