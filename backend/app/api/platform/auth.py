"""
Digital Growth Studio — Platform Authentication Endpoints
"""
import re
import uuid
import secrets
from typing import List, Optional
import structlog
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.core.firebase import verify_firebase_token
from app.core.platform_auth import (
    hash_password,
    verify_password,
    create_platform_access_token,
    get_current_platform_user,
    generate_next_vendor_code,
)

logger = structlog.get_logger()
from app.models.platform.vendor import (
    PlatformUser,
    PlatformVendor,
    PlatformVendorProfile,
    PlatformStore,
    PlatformVendorAppConfig,
    PlatformStorageUsage,
)
from app.models.platform.subscription import PlatformPlan, PlatformSubscription
from app.schemas.platform.auth import (
    PlatformRegisterRequest,
    PlatformLoginRequest,
    PlatformGoogleLoginRequest,
    PlatformTokenResponse,
    PlatformUserMeResponse,
)
from app.schemas.platform.admin import PlanResponse

router = APIRouter(prefix="/platform/auth", tags=["Platform Authentication"])


@router.get("/plans", response_model=List[PlanResponse])
async def get_public_plans(db: AsyncSession = Depends(get_db)):
    """Public endpoint to fetch all active subscription plans for pricing pages and dynamic store showcases."""
    stmt = select(PlatformPlan).where(PlatformPlan.is_active == True).order_by(PlatformPlan.monthly_price_inr.asc())
    return (await db.execute(stmt)).scalars().all()


def slugify(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return cleaned or "store"


@router.post("/register", response_model=PlatformTokenResponse, status_code=status.HTTP_201_CREATED)
async def register_vendor(payload: PlatformRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Public registration for new vendors."""
    # 1. Check if email already registered
    stmt = select(PlatformUser).where(PlatformUser.email == payload.email.lower().strip())
    existing_user = (await db.execute(stmt)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )

    # 2. Derive store slug
    desired_slug = slugify(payload.store_slug or payload.business_name)
    slug_stmt = select(PlatformStore).where(PlatformStore.store_slug == desired_slug)
    if (await db.execute(slug_stmt)).scalar_one_or_none():
        desired_slug = f"{desired_slug}-{uuid.uuid4().hex[:4]}"

    # 3. Generate unique sequential vendor code (e.g. VND0007)
    vendor_code = await generate_next_vendor_code(db)

    # 4. Create User
    pwd = payload.password
    if not pwd and payload.google_id_token:
        claims = await verify_firebase_token(payload.google_id_token)
        if not claims or not claims.get("email"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Google authentication credentials."
            )
        pwd = secrets.token_urlsafe(32)
    elif not pwd:
        pwd = secrets.token_urlsafe(32)

    user = PlatformUser(
        email=payload.email.lower().strip(),
        hashed_password=hash_password(pwd),
        name=payload.owner_name.strip(),
        role="VENDOR_ADMIN",
        status="active",
    )
    db.add(user)
    await db.flush()

    # 5. Create Vendor
    vendor = PlatformVendor(
        vendor_code=vendor_code,
        user_id=user.id,
        status="trial",
    )
    db.add(vendor)
    await db.flush()

    phone_to_use = (payload.whatsapp_number or payload.phone or "").strip()
    biz_phone = (payload.business_phone or phone_to_use).strip()
    brand_title = (payload.brand_name.strip() if payload.brand_name else payload.business_name.strip())

    # Process logo if provided (support base64 upload to CDN or direct URL)
    stored_logo_url = None
    if payload.logo_url and payload.logo_url.strip():
        raw_logo = payload.logo_url.strip()
        if raw_logo.startswith("data:image/"):
            try:
                import base64
                header, b64_str = raw_logo.split(";base64,", 1)
                img_data = base64.b64decode(b64_str)
                ext = "png"
                if "jpeg" in header or "jpg" in header:
                    ext = "jpg"
                elif "svg" in header:
                    ext = "svg"
                elif "webp" in header:
                    ext = "webp"
                from app.services.bunny_storage import bunny_storage
                uploaded = await bunny_storage.upload_file(
                    vendor_id=str(vendor.id),
                    file_bytes=img_data,
                    filename=f"logo_{desired_slug}.{ext}",
                    folder="app-assets",
                )
                stored_logo_url = uploaded.get("url")
            except Exception as up_err:
                logger.warning("logo_base64_upload_failed", error=str(up_err))
                stored_logo_url = raw_logo
        else:
            stored_logo_url = raw_logo

    # 6. Create Profile
    profile = PlatformVendorProfile(
        vendor_id=vendor.id,
        business_name=payload.business_name.strip(),
        owner_name=payload.owner_name.strip(),
        email=payload.email.lower().strip(),
        phone=phone_to_use,
        category=payload.category.strip() or "General",
        address=payload.address.strip() if payload.address else None,
        description=payload.description.strip() if payload.description else None,
        logo_url=stored_logo_url,
        brand_name=brand_title,
        brand_name_locked=True,
        whatsapp_number=payload.whatsapp_number.strip() if payload.whatsapp_number else phone_to_use,
        whatsapp_business_name=payload.whatsapp_business_name.strip() if payload.whatsapp_business_name else brand_title,
        business_phone=biz_phone,
        has_payment_gateway=payload.has_payment_gateway or "No",
        needs_delivery_help=payload.needs_delivery_help or "No",
    )
    db.add(profile)

    # 7. Create Store
    subdomain = f"{desired_slug}.digitalgrowthstudio.in"
    store = PlatformStore(
        vendor_id=vendor.id,
        store_name=payload.business_name.strip(),
        store_slug=desired_slug,
        subdomain=subdomain,
        status="active",
        contact_email=payload.email.lower().strip(),
        contact_phone=biz_phone,
        business_address=payload.address.strip() if payload.address else None,
        description=payload.description.strip() if payload.description else None,
        logo_url=stored_logo_url,
    )
    db.add(store)

    # 8. Create Android App Config record
    app_config = PlatformVendorAppConfig(
        vendor_id=vendor.id,
        app_name=brand_title,
        app_logo_url=stored_logo_url,
        package_id=f"in.digitalgrowthstudio.{desired_slug.replace('-', '_')}",
        app_build_status="NOT_REQUESTED",
    )
    db.add(app_config)

    # 9. Create Storage Usage record (1GB limit default)
    storage_usage = PlatformStorageUsage(
        vendor_id=vendor.id,
        total_bytes_used=0,
        image_bytes_used=0,
        product_count=0,
        limit_bytes=1073741824,
    )
    db.add(storage_usage)

    # 10. Assign Starter Store Plan
    plan_stmt = select(PlatformPlan).where(PlatformPlan.slug == "starter-store")
    plan = (await db.execute(plan_stmt)).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if plan:
        sub = PlatformSubscription(
            vendor_id=vendor.id,
            plan_id=plan.id,
            status="trial",
            starts_at=now,
            expires_at=now + timedelta(days=14),
            next_renewal_date=now + timedelta(days=14),
            monthly_price_inr=plan.monthly_price_inr,
            setup_fee_paid=False,
        )
        db.add(sub)

    await db.commit()

    token = create_platform_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "vendor_id": str(vendor.id),
        "vendor_code": vendor.vendor_code,
    })

    return PlatformTokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        vendor_id=vendor.id,
        vendor_code=vendor.vendor_code,
        store_slug=desired_slug,
    )


@router.post("/login", response_model=PlatformTokenResponse)
async def login_platform(payload: PlatformLoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate Super Admin or Vendor Admin."""
    stmt = (
        select(PlatformUser)
        .where(PlatformUser.email == payload.email.lower().strip())
        .options(
            selectinload(PlatformUser.vendors).selectinload(PlatformVendor.store),
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive or suspended",
        )

    vendor_id = None
    vendor_code = None
    store_slug = None

    if user.role == "VENDOR_ADMIN" and user.vendors:
        primary_vendor = user.vendors[0]
        vendor_id = primary_vendor.id
        vendor_code = primary_vendor.vendor_code
        if primary_vendor.store:
            store_slug = primary_vendor.store.store_slug

    token_claims = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
    }
    if vendor_id:
        token_claims["vendor_id"] = str(vendor_id)
        token_claims["vendor_code"] = vendor_code

    token = create_platform_access_token(token_claims)

    return PlatformTokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        vendor_id=vendor_id,
        vendor_code=vendor_code,
        store_slug=store_slug,
    )


@router.post("/google-login", response_model=PlatformTokenResponse)
async def google_login_platform(
    payload: PlatformGoogleLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate via Firebase Google Auth ID Token.
    Security policy:
    - Only vikramrwadkar@gmail.com is granted SUPER_ADMIN access.
    - Other Google accounts are authenticated as VENDOR_ADMIN (or auto-provisioned if new).
    """
    claims = await verify_firebase_token(payload.id_token)
    if not claims or not claims.get("email"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google authentication credentials.",
        )

    email = claims["email"].lower().strip()
    name = claims.get("name") or email.split("@")[0]

    # Specific rule: ONLY vikramrwadkar@gmail.com gets SUPER_ADMIN
    is_super_admin_email = (email == "vikramrwadkar@gmail.com")

    stmt = (
        select(PlatformUser)
        .where(PlatformUser.email == email)
        .options(
            selectinload(PlatformUser.vendors).selectinload(PlatformVendor.store),
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if is_super_admin_email:
        if not user:
            user = PlatformUser(
                email=email,
                name=name or "Vikram Wadkar",
                hashed_password=hash_password(secrets.token_urlsafe(32)),
                role="SUPER_ADMIN",
                status="active",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            if user.role != "SUPER_ADMIN" or user.status != "active":
                user.role = "SUPER_ADMIN"
                user.status = "active"
                await db.commit()
                await db.refresh(user)

        token = create_platform_access_token({
            "sub": str(user.id),
            "email": user.email,
            "role": "SUPER_ADMIN",
        })
        return PlatformTokenResponse(
            access_token=token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            name=user.name,
            role="SUPER_ADMIN",
            vendor_id=None,
            vendor_code=None,
            store_slug=None,
        )

    # For any other Google user
    if user:
        if user.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive or suspended",
            )
        # Deny SUPER_ADMIN to any other Google account
        if user.role == "SUPER_ADMIN" and not is_super_admin_email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: Super Admin access is restricted to vikramrwadkar@gmail.com.",
            )

        vendor_id = None
        vendor_code = None
        store_slug = None
        if user.vendors:
            primary_vendor = user.vendors[0]
            vendor_id = primary_vendor.id
            vendor_code = primary_vendor.vendor_code
            if primary_vendor.store:
                store_slug = primary_vendor.store.store_slug

        token = create_platform_access_token({
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "vendor_id": str(vendor_id) if vendor_id else None,
            "vendor_code": vendor_code,
        })
        return PlatformTokenResponse(
            access_token=token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            vendor_id=vendor_id,
            vendor_code=vendor_code,
            store_slug=store_slug,
        )

    # User has not registered yet:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="No store account found for this Google email. Please register your store first to configure your business name and details.",
    )


@router.get("/me", response_model=PlatformUserMeResponse)
async def get_my_platform_session(
    user: PlatformUser = Depends(get_current_platform_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve currently authenticated platform session and vendor context."""
    vendor_id = None
    vendor_code = None
    store_slug = None
    store_name = None
    setup_fee_cleared = True
    setup_fee_paid = True
    setup_fee_waived = False
    subscription_status = "active"
    subscription_expires_at = None
    is_subscription_expired = False
    monthly_price_inr = 499.0
    apk_user_approved = False
    sms_gateway_enabled = False
    razorpay_enabled = False
    custom_domain_enabled = False
    shiprocket_enabled = False
    whatsapp_alerts_enabled = False
    hyperlocal_enabled = False
    ai_credits = 9999 if user.role == "SUPER_ADMIN" else 5

    if user.role == "VENDOR_ADMIN":
        now = datetime.now(timezone.utc)
        stmt = (
            select(PlatformVendor)
            .where(PlatformVendor.user_id == user.id)
            .options(
                selectinload(PlatformVendor.store),
                selectinload(PlatformVendor.app_config),
            )
        )
        res = await db.execute(stmt)
        vendor = res.scalar_one_or_none()
        if vendor:
            vendor_id = vendor.id
            vendor_code = vendor.vendor_code
            ai_credits = getattr(vendor, "ai_credits", 5)
            if vendor.store:
                store_slug = vendor.store.store_slug
                store_name = vendor.store.store_name
                sms_gateway_enabled = getattr(vendor.store, "sms_gateway_enabled", False)
                razorpay_enabled = getattr(vendor.store, "razorpay_enabled", False)
                custom_domain_enabled = getattr(vendor.store, "custom_domain_enabled", False)
                shiprocket_enabled = getattr(vendor.store, "shiprocket_enabled", False)
                whatsapp_alerts_enabled = getattr(vendor.store, "whatsapp_alerts_enabled", False)
                hyperlocal_enabled = getattr(vendor.store, "hyperlocal_enabled", False)
            if vendor.app_config:
                apk_user_approved = getattr(vendor.app_config, "apk_user_approved", False)

            # Check setup fee and subscription status
            sub_stmt = (
                select(PlatformSubscription)
                .where(PlatformSubscription.vendor_id == vendor.id)
                .order_by(desc(PlatformSubscription.created_at))
            )
            sub = (await db.execute(sub_stmt)).scalars().first()
            if sub:
                setup_fee_paid = sub.setup_fee_paid
                setup_fee_waived = sub.setup_fee_waived
                setup_fee_cleared = sub.setup_fee_paid or sub.setup_fee_waived
                subscription_status = sub.status
                subscription_expires_at = sub.expires_at
                monthly_price_inr = sub.monthly_price_inr or 499.0

                if setup_fee_cleared:
                    if vendor.status in ("inactive", "suspended"):
                        is_subscription_expired = True
                        subscription_status = vendor.status
                    elif sub.status in ("inactive", "expired", "past_due", "cancelled"):
                        is_subscription_expired = True
                        subscription_status = sub.status
                    elif sub.expires_at:
                        sub_exp = sub.expires_at if sub.expires_at.tzinfo else sub.expires_at.replace(tzinfo=timezone.utc)
                        if sub_exp < now:
                            is_subscription_expired = True
            else:
                setup_fee_cleared = False
                setup_fee_paid = False

    return PlatformUserMeResponse(
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        vendor_id=vendor_id,
        vendor_code=vendor_code,
        store_slug=store_slug,
        store_name=store_name,
        status=user.status,
        setup_fee_cleared=setup_fee_cleared,
        setup_fee_paid=setup_fee_paid,
        setup_fee_waived=setup_fee_waived,
        subscription_status=subscription_status,
        subscription_expires_at=subscription_expires_at,
        is_subscription_expired=is_subscription_expired,
        monthly_price_inr=monthly_price_inr,
        apk_user_approved=apk_user_approved,
        sms_gateway_enabled=sms_gateway_enabled,
        razorpay_enabled=razorpay_enabled,
        custom_domain_enabled=custom_domain_enabled,
        shiprocket_enabled=shiprocket_enabled,
        whatsapp_alerts_enabled=whatsapp_alerts_enabled,
        hyperlocal_enabled=hyperlocal_enabled,
        ai_credits=ai_credits,
    )
