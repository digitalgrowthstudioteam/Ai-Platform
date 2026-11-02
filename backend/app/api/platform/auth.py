"""
Digital Growth Studio — Platform Authentication Endpoints
"""
import re
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.core.firebase import verify_firebase_token
from app.core.platform_auth import (
    hash_password,
    verify_password,
    create_platform_access_token,
    get_current_platform_user,
)
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

router = APIRouter(prefix="/platform/auth", tags=["Platform Authentication"])


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

    # 3. Generate sequential vendor code (e.g. VND0001, VND0002)
    count_stmt = select(func.count(PlatformVendor.id))
    total_vendors = (await db.execute(count_stmt)).scalar() or 0
    vendor_code = f"VND{(total_vendors + 1):04d}"

    # 4. Create User
    user = PlatformUser(
        email=payload.email.lower().strip(),
        hashed_password=hash_password(payload.password),
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
        logo_url=payload.logo_url.strip() if payload.logo_url else None,
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
        logo_url=payload.logo_url.strip() if payload.logo_url else None,
    )
    db.add(store)

    # 8. Create Android App Config record
    app_config = PlatformVendorAppConfig(
        vendor_id=vendor.id,
        app_name=brand_title,
        app_logo_url=payload.logo_url.strip() if payload.logo_url else None,
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

    # New user signing in with Google: Auto-provision as new Vendor Admin
    user = PlatformUser(
        email=email,
        name=name,
        hashed_password=hash_password(secrets.token_urlsafe(32)),
        role="VENDOR_ADMIN",
        status="active",
    )
    db.add(user)
    await db.flush()

    count_stmt = select(func.count(PlatformVendor.id))
    current_count = (await db.execute(count_stmt)).scalar() or 0
    vendor_code = f"VND{current_count + 1:04d}"

    vendor = PlatformVendor(
        vendor_code=vendor_code,
        user_id=user.id,
        status="active",
    )
    db.add(vendor)
    await db.flush()

    business_name = f"{name}'s Store"
    profile = PlatformVendorProfile(
        vendor_id=vendor.id,
        business_name=business_name,
        owner_name=name,
        email=email,
        phone="",
        category="General",
        address="",
        description="Welcome to my online store powered by Digital Growth Studio.",
    )
    db.add(profile)

    base_slug = slugify(name) or "store"
    desired_slug = f"{base_slug}-{vendor_code.lower()}"
    store = PlatformStore(
        vendor_id=vendor.id,
        store_name=business_name,
        store_slug=desired_slug,
        subdomain=f"{desired_slug}.digitalgrowthstudio.in",
        status="active",
        contact_email=email,
    )
    db.add(store)

    app_config = PlatformVendorAppConfig(
        vendor_id=vendor.id,
        app_name=business_name,
        package_id=f"in.digitalgrowthstudio.{desired_slug.replace('-', '_')}",
        app_build_status="NOT_REQUESTED",
    )
    db.add(app_config)

    storage_usage = PlatformStorageUsage(
        vendor_id=vendor.id,
        total_bytes_used=0,
        image_bytes_used=0,
        product_count=0,
        limit_bytes=1073741824,
    )
    db.add(storage_usage)

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

    if user.role == "VENDOR_ADMIN":
        stmt = (
            select(PlatformVendor)
            .where(PlatformVendor.user_id == user.id)
            .options(selectinload(PlatformVendor.store))
        )
        res = await db.execute(stmt)
        vendor = res.scalar_one_or_none()
        if vendor:
            vendor_id = vendor.id
            vendor_code = vendor.vendor_code
            if vendor.store:
                store_slug = vendor.store.store_slug
                store_name = vendor.store.store_name

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
    )
