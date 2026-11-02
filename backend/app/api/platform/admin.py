"""
Digital Growth Studio — Super Admin Control Panel API Endpoints
Restricted exclusively to authenticated Super Admin accounts.
"""
import uuid
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.core.platform_auth import require_super_admin, hash_password
from app.models.platform.vendor import (
    PlatformUser,
    PlatformVendor,
    PlatformVendorProfile,
    PlatformStore,
    PlatformVendorAppConfig,
    PlatformStorageUsage,
)
from app.models.platform.catalog import PlatformProduct
from app.models.platform.order import PlatformOrder
from app.models.platform.subscription import (
    PlatformPlan,
    PlatformSubscription,
    PlatformAddon,
    PlatformVendorAddon,
    PlatformPayment,
)
from app.models.platform.system import PlatformAuditLog, PlatformSetting
from app.schemas.platform.admin import (
    SuperAdminOverviewResponse,
    VendorListItem,
    VendorStatusUpdateRequest,
    VendorCreateByAdminRequest,
    PlanCreateOrUpdateRequest,
    PlanResponse,
    AddonCreateOrUpdateRequest,
    AddonResponse,
    VendorAppStatusUpdateRequest,
    VendorStorageLimitUpdateRequest,
    PlatformAuditLogItem,
)
from app.schemas.platform.vendor import VendorDetailFullResponse

router = APIRouter(prefix="/platform/admin", tags=["Super Admin Panel"])


# ──────────────────────────────────────────────
# 1. Platform Overview & Metrics
# ──────────────────────────────────────────────
@router.get("/overview", response_model=SuperAdminOverviewResponse)
async def get_admin_overview(
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide analytics for Super Admin."""
    total_vendors = (await db.execute(select(func.count(PlatformVendor.id)))).scalar() or 0
    active_vendors = (await db.execute(select(func.count(PlatformVendor.id)).where(PlatformVendor.status == "active"))).scalar() or 0
    inactive_vendors = (await db.execute(select(func.count(PlatformVendor.id)).where(PlatformVendor.status == "inactive"))).scalar() or 0
    trial_vendors = (await db.execute(select(func.count(PlatformVendor.id)).where(PlatformVendor.status == "trial"))).scalar() or 0

    expired_subs = (await db.execute(
        select(func.count(PlatformSubscription.id)).where(PlatformSubscription.status == "expired")
    )).scalar() or 0

    # Monthly Recurring Revenue (sum of active subscriptions)
    mrr_query = select(func.sum(PlatformSubscription.monthly_price_inr)).where(
        PlatformSubscription.status.in_(["active", "trial"])
    )
    total_mrr = (await db.execute(mrr_query)).scalar() or 0.0

    total_orders = (await db.execute(select(func.count(PlatformOrder.id)))).scalar() or 0
    total_products = (await db.execute(select(func.count(PlatformProduct.id)))).scalar() or 0

    now = datetime.now(timezone.utc)
    first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    new_regs = (await db.execute(
        select(func.count(PlatformVendor.id)).where(PlatformVendor.created_at >= first_of_month)
    )).scalar() or 0

    total_storage_bytes = (await db.execute(select(func.sum(PlatformStorageUsage.total_bytes_used)))).scalar() or 0
    total_storage_mb = round(total_storage_bytes / (1024 * 1024), 2)

    return SuperAdminOverviewResponse(
        total_vendors=total_vendors,
        active_vendors=active_vendors,
        inactive_vendors=inactive_vendors,
        trial_vendors=trial_vendors,
        expired_subscriptions=expired_subs,
        total_mrr_inr=float(total_mrr),
        total_orders_all_vendors=total_orders,
        total_products_all_vendors=total_products,
        new_registrations_this_month=new_regs,
        total_storage_used_mb=total_storage_mb,
    )


# ──────────────────────────────────────────────
# 2. Vendor Management
# ──────────────────────────────────────────────
@router.get("/vendors", response_model=List[VendorListItem])
async def list_all_vendors(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """View and search all registered vendors."""
    stmt = (
        select(PlatformVendor)
        .options(
            selectinload(PlatformVendor.profile),
            selectinload(PlatformVendor.store),
            selectinload(PlatformVendor.app_config),
        )
        .order_by(desc(PlatformVendor.created_at))
    )
    if status_filter:
        stmt = stmt.where(PlatformVendor.status == status_filter)

    vendors = (await db.execute(stmt)).scalars().all()

    items = []
    for v in vendors:
        p = v.profile
        s = v.store
        app = v.app_config

        # Check search match
        if search:
            q = search.lower()
            matched = (
                q in v.vendor_code.lower()
                or (p and q in p.business_name.lower())
                or (p and q in p.owner_name.lower())
                or (p and q in p.email.lower())
                or (s and q in s.store_slug.lower())
            )
            if not matched:
                continue

        # Get subscription
        sub_stmt = (
            select(PlatformSubscription)
            .where(PlatformSubscription.vendor_id == v.id)
            .options(selectinload(PlatformSubscription.plan))
            .order_by(PlatformSubscription.expires_at.desc())
        )
        sub = (await db.execute(sub_stmt)).scalar_one_or_none()

        prod_count = (await db.execute(select(func.count(PlatformProduct.id)).where(PlatformProduct.vendor_id == v.id))).scalar() or 0
        order_count = (await db.execute(select(func.count(PlatformOrder.id)).where(PlatformOrder.vendor_id == v.id))).scalar() or 0

        items.append(VendorListItem(
            id=v.id,
            vendor_code=v.vendor_code,
            business_name=p.business_name if p else "N/A",
            owner_name=p.owner_name if p else "N/A",
            email=p.email if p else "N/A",
            phone=p.phone if p else "N/A",
            store_slug=s.store_slug if s else "N/A",
            subdomain=s.subdomain if s else "N/A",
            status=v.status,
            plan_name=sub.plan.name if sub and sub.plan else "Starter Store",
            subscription_status=sub.status if sub else v.status,
            total_products=prod_count,
            total_orders=order_count,
            app_build_status=app.app_build_status if app else "NOT_REQUESTED",
            created_at=v.created_at,
        ))
    return items


@router.post("/vendors", status_code=status.HTTP_201_CREATED)
async def create_vendor_manually(
    payload: VendorCreateByAdminRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Super Admin manually provisions a new vendor account."""
    existing = (await db.execute(select(PlatformUser).where(PlatformUser.email == payload.email.lower()))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="User email already exists")

    total_vendors = (await db.execute(select(func.count(PlatformVendor.id)))).scalar() or 0
    vendor_code = f"VND{(total_vendors + 1):04d}"

    user = PlatformUser(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        name=payload.owner_name.strip(),
        role="VENDOR_ADMIN",
        status="active",
    )
    db.add(user)
    await db.flush()

    vendor = PlatformVendor(vendor_code=vendor_code, user_id=user.id, status="active")
    db.add(vendor)
    await db.flush()

    profile = PlatformVendorProfile(
        vendor_id=vendor.id,
        business_name=payload.business_name.strip(),
        owner_name=payload.owner_name.strip(),
        email=payload.email.lower(),
        phone=payload.phone.strip(),
        category=payload.category,
    )
    db.add(profile)

    store = PlatformStore(
        vendor_id=vendor.id,
        store_name=payload.business_name.strip(),
        store_slug=payload.store_slug.strip().lower(),
        subdomain=f"{payload.store_slug.strip().lower()}.digitalgrowthstudio.in",
        status="active",
        contact_email=payload.email.lower(),
        contact_phone=payload.phone.strip(),
    )
    db.add(store)

    app_config = PlatformVendorAppConfig(
        vendor_id=vendor.id,
        app_name=payload.business_name.strip(),
        package_id=f"in.digitalgrowthstudio.{payload.store_slug.strip().lower().replace('-', '_')}",
        app_build_status="NOT_REQUESTED",
    )
    db.add(app_config)

    storage = PlatformStorageUsage(vendor_id=vendor.id, total_bytes_used=0, limit_bytes=1073741824)
    db.add(storage)

    plan = (await db.execute(select(PlatformPlan).where(PlatformPlan.slug == payload.plan_slug))).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if plan:
        sub = PlatformSubscription(
            vendor_id=vendor.id,
            plan_id=plan.id,
            status="active",
            starts_at=now,
            expires_at=now + timedelta(days=30),
            next_renewal_date=now + timedelta(days=30),
            monthly_price_inr=plan.monthly_price_inr,
            setup_fee_paid=True,
        )
        db.add(sub)

    # Log audit
    audit = PlatformAuditLog(
        actor_id=admin.id,
        actor_role="SUPER_ADMIN",
        vendor_id=vendor.id,
        action="CREATE_VENDOR_MANUAL",
        resource_type="VENDOR",
        resource_id=vendor_code,
    )
    db.add(audit)
    await db.commit()

    return {"message": "Vendor created successfully", "vendor_id": vendor.id, "vendor_code": vendor_code}


@router.get("/vendors/{vendor_id}", response_model=VendorDetailFullResponse)
async def get_vendor_full_detail(
    vendor_id: uuid.UUID,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve comprehensive details of a single vendor for Super Admin inspection."""
    stmt = (
        select(PlatformVendor)
        .where(PlatformVendor.id == vendor_id)
        .options(
            selectinload(PlatformVendor.profile),
            selectinload(PlatformVendor.store),
            selectinload(PlatformVendor.app_config),
            selectinload(PlatformVendor.storage_usage),
        )
    )
    v = (await db.execute(stmt)).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    p = v.profile
    s = v.store
    app = v.app_config
    st = v.storage_usage

    sub_stmt = (
        select(PlatformSubscription)
        .where(PlatformSubscription.vendor_id == v.id)
        .options(selectinload(PlatformSubscription.plan))
        .order_by(PlatformSubscription.expires_at.desc())
    )
    sub = (await db.execute(sub_stmt)).scalar_one_or_none()

    prod_count = (await db.execute(select(func.count(PlatformProduct.id)).where(PlatformProduct.vendor_id == v.id))).scalar() or 0
    order_count = (await db.execute(select(func.count(PlatformOrder.id)).where(PlatformOrder.vendor_id == v.id))).scalar() or 0

    return VendorDetailFullResponse(
        id=v.id,
        vendor_code=v.vendor_code,
        status=v.status,
        created_at=v.created_at,
        business_name=p.business_name if p else "N/A",
        owner_name=p.owner_name if p else "N/A",
        email=p.email if p else "N/A",
        phone=p.phone if p else "N/A",
        category=p.category if p else "General",
        address=p.address if p else None,
        description=p.description if p else None,
        gst_number=p.gst_number if p else None,
        logo_url=p.logo_url if p else None,
        website=p.website if p else None,
        store_slug=s.store_slug if s else "N/A",
        subdomain=s.subdomain if s else "N/A",
        store_status=s.status if s else "active",
        store_created_at=s.created_at if s else v.created_at,
        primary_color=s.primary_color if s else "#2563EB",
        secondary_color=s.secondary_color if s else "#1E293B",
        cod_enabled=s.cod_enabled if s else True,
        razorpay_enabled=s.razorpay_enabled if s else False,
        razorpay_key_id=s.razorpay_key_id if s else None,
        app_name=app.app_name if app else (p.business_name if p else "App"),
        app_logo_url=app.app_logo_url if app else None,
        splash_screen_url=app.splash_screen_url if app else None,
        app_primary_color=app.primary_color if app else "#2563EB",
        app_secondary_color=app.secondary_color if app else "#1E293B",
        package_id=app.package_id if app else "in.digitalgrowthstudio.store",
        app_build_status=app.app_build_status if app else "NOT_REQUESTED",
        app_version=app.app_version if app else "1.0.0",
        playstore_url=app.playstore_url if app else None,
        publication_status=app.publication_status if app else "UNPUBLISHED",
        total_products=prod_count,
        total_orders=order_count,
        storage_used_mb=round((st.total_bytes_used if st else 0) / (1024 * 1024), 2),
        storage_limit_mb=round((st.limit_bytes if st else 1073741824) / (1024 * 1024), 2),
        plan_name=sub.plan.name if sub and sub.plan else None,
        subscription_status=sub.status if sub else None,
        renewal_date=sub.next_renewal_date if sub else None,
    )


@router.patch("/vendors/{vendor_id}/status")
async def update_vendor_status(
    vendor_id: uuid.UUID,
    payload: VendorStatusUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Activate, deactivate, or suspend a vendor."""
    v = (await db.execute(select(PlatformVendor).where(PlatformVendor.id == vendor_id))).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    v.status = payload.status
    audit = PlatformAuditLog(
        actor_id=admin.id,
        actor_role="SUPER_ADMIN",
        vendor_id=v.id,
        action="UPDATE_STATUS",
        resource_type="VENDOR",
        resource_id=payload.status,
    )
    db.add(audit)
    await db.commit()
    return {"message": f"Vendor status updated to {payload.status}"}


@router.patch("/vendors/{vendor_id}/app-config")
async def update_vendor_app_build_status(
    vendor_id: uuid.UUID,
    payload: VendorAppStatusUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update Android application build and publication status for developers."""
    app_cfg = (await db.execute(select(PlatformVendorAppConfig).where(PlatformVendorAppConfig.vendor_id == vendor_id))).scalar_one_or_none()
    if not app_cfg:
        raise HTTPException(status_code=404, detail="Vendor app config not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(app_cfg, field, val)

    await db.commit()
    return {"message": "App build and publication configuration updated"}


@router.patch("/vendors/{vendor_id}/storage-limit")
async def update_vendor_storage_limit(
    vendor_id: uuid.UUID,
    payload: VendorStorageLimitUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Adjust storage quota for a vendor."""
    st = (await db.execute(select(PlatformStorageUsage).where(PlatformStorageUsage.vendor_id == vendor_id))).scalar_one_or_none()
    if not st:
        raise HTTPException(status_code=404, detail="Storage record not found")

    st.limit_bytes = payload.storage_limit_mb * 1024 * 1024
    await db.commit()
    return {"message": f"Storage limit updated to {payload.storage_limit_mb} MB"}


# ──────────────────────────────────────────────
# 3. Plan & Pricing Management
# ──────────────────────────────────────────────
@router.get("/plans", response_model=List[PlanResponse])
async def list_plans(
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all configurable subscription plans."""
    stmt = select(PlatformPlan).order_by(PlatformPlan.monthly_price_inr.asc())
    return (await db.execute(stmt)).scalars().all()


@router.post("/plans", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    payload: PlanCreateOrUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a subscription plan."""
    plan = PlatformPlan(
        name=payload.name,
        slug=payload.slug.lower().strip(),
        monthly_price_inr=payload.monthly_price_inr,
        setup_fee_inr=payload.setup_fee_inr,
        storage_limit_mb=payload.storage_limit_mb,
        max_products=payload.max_products,
        is_active=payload.is_active,
        features_json=payload.features_json or "[]",
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: uuid.UUID,
    payload: PlanCreateOrUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update subscription plan pricing and limits."""
    plan = (await db.execute(select(PlatformPlan).where(PlatformPlan.id == plan_id))).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    for field, val in payload.model_dump().items():
        setattr(plan, field, val)

    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: uuid.UUID,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a subscription plan."""
    plan = (await db.execute(select(PlatformPlan).where(PlatformPlan.id == plan_id))).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    active_subs = (await db.execute(select(func.count(PlatformSubscription.id)).where(PlatformSubscription.plan_id == plan_id))).scalar() or 0
    if active_subs > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete plan: {active_subs} vendor(s) are currently subscribed to this plan. Please deactivate it instead.")

    await db.delete(plan)
    await db.commit()
    return {"message": "Plan deleted successfully", "id": str(plan_id)}


# ──────────────────────────────────────────────
# 4. Add-on Services Management
# ──────────────────────────────────────────────
@router.get("/addons", response_model=List[AddonResponse])
async def list_addons(
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all configurable add-on services."""
    stmt = select(PlatformAddon).order_by(PlatformAddon.name.asc())
    return (await db.execute(stmt)).scalars().all()


@router.post("/addons", response_model=AddonResponse, status_code=status.HTTP_201_CREATED)
async def create_addon(
    payload: AddonCreateOrUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create an add-on service."""
    addon = PlatformAddon(
        name=payload.name,
        code=payload.code.lower().strip(),
        description=payload.description,
        price_inr=payload.price_inr,
        billing_type=payload.billing_type,
        is_active=payload.is_active,
    )
    db.add(addon)
    await db.commit()
    await db.refresh(addon)
    return addon


@router.put("/addons/{addon_id}", response_model=AddonResponse)
@router.patch("/addons/{addon_id}", response_model=AddonResponse)
async def update_addon(
    addon_id: uuid.UUID,
    payload: AddonCreateOrUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update an add-on service."""
    addon = (await db.execute(select(PlatformAddon).where(PlatformAddon.id == addon_id))).scalar_one_or_none()
    if not addon:
        raise HTTPException(status_code=404, detail="Addon not found")

    addon.name = payload.name
    addon.code = payload.code.lower().strip()
    addon.description = payload.description
    addon.price_inr = payload.price_inr
    addon.billing_type = payload.billing_type
    addon.is_active = payload.is_active

    await db.commit()
    await db.refresh(addon)
    return addon


@router.delete("/addons/{addon_id}")
async def delete_addon(
    addon_id: uuid.UUID,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete an add-on service."""
    addon = (await db.execute(select(PlatformAddon).where(PlatformAddon.id == addon_id))).scalar_one_or_none()
    if not addon:
        raise HTTPException(status_code=404, detail="Addon not found")

    # Clean up vendor addon links if any
    await db.execute(delete(PlatformVendorAddon).where(PlatformVendorAddon.addon_id == addon_id))
    await db.delete(addon)
    await db.commit()
    return {"message": "Addon deleted successfully", "id": str(addon_id)}


# ──────────────────────────────────────────────
# 5. Audit Logs
# ──────────────────────────────────────────────
@router.get("/audit-logs", response_model=List[PlatformAuditLogItem])
async def list_audit_logs(
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Inspect sensitive actions and modifications across the platform."""
    stmt = select(PlatformAuditLog).order_by(desc(PlatformAuditLog.created_at)).limit(100)
    return (await db.execute(stmt)).scalars().all()

