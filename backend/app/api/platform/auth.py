"""
Digital Growth Studio — Platform Authentication Endpoints
"""
import re
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
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

    # 6. Create Profile
    profile = PlatformVendorProfile(
        vendor_id=vendor.id,
        business_name=payload.business_name.strip(),
        owner_name=payload.owner_name.strip(),
        email=payload.email.lower().strip(),
        phone=payload.phone.strip(),
        category=payload.category.strip() or "General",
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
        contact_phone=payload.phone.strip(),
    )
    db.add(store)

    # 8. Create Android App Config record
    app_config = PlatformVendorAppConfig(
        vendor_id=vendor.id,
        app_name=payload.business_name.strip(),
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
