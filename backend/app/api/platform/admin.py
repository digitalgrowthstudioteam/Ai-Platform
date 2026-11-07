"""
Digital Growth Studio — Super Admin Control Panel API Endpoints
Restricted exclusively to authenticated Super Admin accounts.
"""
import re
import json
import uuid
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc, update, delete, or_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.core.platform_auth import require_super_admin, hash_password, generate_next_vendor_code
from app.models.platform.vendor import (
    PlatformUser,
    PlatformVendor,
    PlatformVendorProfile,
    PlatformStore,
    PlatformVendorAppConfig,
    PlatformStorageUsage,
    PlatformStoreEvent,
)
from app.models.platform.catalog import (
    PlatformProduct,
    PlatformProductVariant,
    PlatformProductImage,
    PlatformCategory,
    PlatformBanner,
)
from app.models.platform.order import (
    PlatformOrder,
    PlatformOrderItem,
    PlatformCustomer,
)
from app.models.platform.subscription import (
    PlatformPlan,
    PlatformSubscription,
    PlatformAddon,
    PlatformVendorAddon,
    PlatformPayment,
    PlatformCoupon,
)
from app.models.platform.system import (
    PlatformAuditLog,
    PlatformSetting,
    PlatformNotification,
    PlatformCreditTransaction,
)
from app.schemas.platform.payments import (
    AdminCouponCreateRequest,
    AdminVendorSetupFeeUpdateRequest,
    AdminPlanPricingUpdateRequest,
)
from app.schemas.platform.admin import (
    SuperAdminOverviewResponse,
    VendorListItem,
    VendorStatusUpdateRequest,
    VendorSubdomainUpdateRequest,
    AdminGrantAccessRequest,
    VendorCreateByAdminRequest,
    PlanCreateOrUpdateRequest,
    PlanResponse,
    AddonCreateOrUpdateRequest,
    AddonResponse,
    VendorAppStatusUpdateRequest,
    VendorStorageLimitUpdateRequest,
    PlatformAuditLogItem,
    AdminDetailedAnalyticsResponse,
    AdminVendorSalesPerformanceItem,
    AdminTopSellingProductItem,
    AdminCategoryDistributionItem,
    AdminVendorOnboardingTrendItem,
)
from app.schemas.platform.vendor import (
    VendorDetailFullResponse,
    AdminVendorFullUpdateRequest,
    AdminAppToggleRequest,
    AiAdminCreditConfigUpdate,
    AiAdminGrantCreditsRequest,
)

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

    # Real funds received on Razorpay (confirmed successful payments)
    rzp_revenue_stmt = select(func.coalesce(func.sum(PlatformPayment.amount_inr), 0.0)).where(
        PlatformPayment.gateway == "RAZORPAY",
        PlatformPayment.status == "SUCCESS",
        or_(
            PlatformPayment.reference_id.is_(None),
            ~PlatformPayment.reference_id.startswith("pay_mock_")
        )
    )
    total_razorpay_funds = float((await db.execute(rzp_revenue_stmt)).scalar() or 0.0)

    # Number of confirmed Razorpay payments
    rzp_count_stmt = select(func.count(PlatformPayment.id)).where(
        PlatformPayment.gateway == "RAZORPAY",
        PlatformPayment.status == "SUCCESS",
        or_(
            PlatformPayment.reference_id.is_(None),
            ~PlatformPayment.reference_id.startswith("pay_mock_")
        )
    )
    total_payments_count = (await db.execute(rzp_count_stmt)).scalar() or 0

    # Monthly Recurring Revenue (MRR) - Only genuine active subscriptions paid via Razorpay
    mrr_query = select(func.coalesce(func.sum(PlatformSubscription.monthly_price_inr), 0.0)).where(
        PlatformSubscription.status == "active",
        PlatformSubscription.setup_fee_paid.is_(True),
        PlatformSubscription.razorpay_payment_id.isnot(None),
        ~PlatformSubscription.razorpay_payment_id.startswith("pay_mock_")
    )
    total_mrr = float((await db.execute(mrr_query)).scalar() or 0.0)

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
        total_mrr_inr=total_mrr,
        total_razorpay_funds_inr=total_razorpay_funds,
        total_payments_count=total_payments_count,
        total_orders_all_vendors=total_orders,
        total_products_all_vendors=total_products,
        new_registrations_this_month=new_regs,
        total_storage_used_mb=total_storage_mb,
    )


# ──────────────────────────────────────────────
# Detailed Platform Admin Analytics
# ──────────────────────────────────────────────
@router.get("/analytics", response_model=AdminDetailedAnalyticsResponse)
async def get_admin_detailed_analytics(
    date_range: str = "30d",
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Compute exhaustive platform-wide vendor analytics, sales leaderboards, and catalog statistics."""
    # 1. Fetch all vendors with eager loaded relations
    stmt_v = (
        select(PlatformVendor)
        .options(
            selectinload(PlatformVendor.profile),
            selectinload(PlatformVendor.store),
            selectinload(PlatformVendor.user),
        )
        .order_by(PlatformVendor.created_at.desc())
    )
    vendors = (await db.execute(stmt_v)).scalars().all()

    # 2. Product metrics by vendor
    stmt_prod = (
        select(
            PlatformProduct.vendor_id,
            func.count(PlatformProduct.id).label("total_products"),
            func.sum(case((PlatformProduct.stock_quantity > 0, 1), else_=0)).label("in_stock_products"),
        )
        .group_by(PlatformProduct.vendor_id)
    )
    prod_rows = (await db.execute(stmt_prod)).all()
    prod_map = {row[0]: {"total": row[1] or 0, "in_stock": int(row[2] or 0)} for row in prod_rows}

    # 3. Order metrics by vendor
    stmt_ord = (
        select(
            PlatformOrder.vendor_id,
            func.count(PlatformOrder.id).label("total_orders"),
            func.coalesce(func.sum(PlatformOrder.total_amount), 0.0).label("gross_revenue"),
            func.max(PlatformOrder.created_at).label("last_sale"),
        )
        .where(
            PlatformOrder.order_status != "CANCELLED",
            PlatformOrder.payment_status != "FAILED",
        )
        .group_by(PlatformOrder.vendor_id)
    )
    ord_rows = (await db.execute(stmt_ord)).all()
    ord_map = {
        row[0]: {
            "total_orders": row[1] or 0,
            "gross_revenue": float(row[2] or 0.0),
            "last_sale": row[3].strftime("%Y-%m-%d %H:%M") if row[3] else None,
        }
        for row in ord_rows
    }

    # 4. Units sold by vendor from order items
    stmt_units = (
        select(
            PlatformOrderItem.vendor_id,
            func.coalesce(func.sum(PlatformOrderItem.quantity), 0).label("units_sold"),
        )
        .join(PlatformOrder, PlatformOrderItem.order_id == PlatformOrder.id)
        .where(PlatformOrder.order_status != "CANCELLED")
        .group_by(PlatformOrderItem.vendor_id)
    )
    units_rows = (await db.execute(stmt_units)).all()
    units_map = {row[0]: int(row[1] or 0) for row in units_rows}

    # 5. Storefront events by vendor (visits & whatsapp leads)
    stmt_events = (
        select(
            PlatformStoreEvent.vendor_id,
            PlatformStoreEvent.event_type,
            func.count(PlatformStoreEvent.id),
        )
        .group_by(PlatformStoreEvent.vendor_id, PlatformStoreEvent.event_type)
    )
    event_rows = (await db.execute(stmt_events)).all()
    event_map = {}
    for vid, etype, count in event_rows:
        if vid not in event_map:
            event_map[vid] = {"visits": 0, "whatsapp": 0}
        if etype == "page_view":
            event_map[vid]["visits"] += count
        elif etype == "whatsapp_click":
            event_map[vid]["whatsapp"] += count

    # 6. Build Vendor Sales Leaderboard items
    leaderboard: List[AdminVendorSalesPerformanceItem] = []
    vendors_with_sales = 0
    vendors_without_sales = 0
    total_products_platform = 0
    total_in_stock_platform = 0
    total_orders_platform = 0
    total_units_sold_platform = 0
    total_platform_gmv = 0.0
    total_store_visits = 0
    total_whatsapp_leads = 0

    category_stats = {}

    for v in vendors:
        p_info = prod_map.get(v.id, {"total": 0, "in_stock": 0})
        o_info = ord_map.get(v.id, {"total_orders": 0, "gross_revenue": 0.0, "last_sale": None})
        u_sold = units_map.get(v.id, 0)
        e_info = event_map.get(v.id, {"visits": 0, "whatsapp": 0})

        gross_rev = o_info["gross_revenue"]
        orders_count = o_info["total_orders"]
        aov = round(gross_rev / orders_count, 2) if orders_count > 0 else 0.0
        visits_count = e_info["visits"]
        conv_rate = round((orders_count / visits_count) * 100, 2) if visits_count > 0 else (100.0 if orders_count > 0 else 0.0)
        has_sales = orders_count > 0 and gross_rev > 0

        if has_sales:
            vendors_with_sales += 1
        else:
            vendors_without_sales += 1

        total_products_platform += p_info["total"]
        total_in_stock_platform += p_info["in_stock"]
        total_orders_platform += orders_count
        total_units_sold_platform += u_sold
        total_platform_gmv += gross_rev
        total_store_visits += visits_count
        total_whatsapp_leads += e_info["whatsapp"]

        biz_name = getattr(v.profile, "business_name", None) or "Store"
        owner_name = getattr(v.profile, "owner_name", None) or (v.user.name if v.user else "Owner")
        email = getattr(v.profile, "email", None) or (v.user.email if v.user else "")
        phone = getattr(v.profile, "phone", None) or ""
        cat = getattr(v.profile, "category", None) or "General"
        slug = getattr(v.store, "store_slug", None) or v.vendor_code.lower()
        subd = getattr(v.store, "subdomain", None) or slug

        if cat not in category_stats:
            category_stats[cat] = {"vendors": 0, "products": 0, "revenue": 0.0}
        category_stats[cat]["vendors"] += 1
        category_stats[cat]["products"] += p_info["total"]
        category_stats[cat]["revenue"] += gross_rev

        item = AdminVendorSalesPerformanceItem(
            vendor_id=v.id,
            vendor_code=v.vendor_code,
            business_name=biz_name,
            owner_name=owner_name,
            email=email,
            phone=phone,
            store_slug=slug,
            subdomain=subd,
            status=v.status,
            total_products=p_info["total"],
            in_stock_products=p_info["in_stock"],
            total_orders=orders_count,
            units_sold=u_sold,
            gross_revenue_inr=gross_rev,
            average_order_value_inr=aov,
            store_visits=visits_count,
            conversion_rate=conv_rate,
            whatsapp_clicks=e_info["whatsapp"],
            has_sales=has_sales,
            last_sale_date=o_info["last_sale"],
            joined_at=v.created_at,
        )
        leaderboard.append(item)

    # Sort leaderboard: vendors with sales ranked by revenue desc, then units desc, then others by product count
    leaderboard.sort(key=lambda x: (x.has_sales, x.gross_revenue_inr, x.units_sold, x.total_products), reverse=True)

    # Top selling vendor spotlights
    top_by_revenue = leaderboard[0] if leaderboard and leaderboard[0].gross_revenue_inr > 0 else None
    top_by_units = max(leaderboard, key=lambda x: x.units_sold) if leaderboard and any(x.units_sold > 0 for x in leaderboard) else None

    # 7. Top 10 Best Selling Products platform-wide
    stmt_top_prods = (
        select(
            PlatformOrderItem.product_id,
            PlatformOrderItem.product_name,
            PlatformOrderItem.vendor_id,
            func.sum(PlatformOrderItem.quantity).label("units_sold"),
            func.sum(PlatformOrderItem.total).label("revenue"),
            func.avg(PlatformOrderItem.price).label("avg_price"),
        )
        .join(PlatformOrder, PlatformOrderItem.order_id == PlatformOrder.id)
        .where(PlatformOrder.order_status != "CANCELLED")
        .group_by(PlatformOrderItem.product_id, PlatformOrderItem.product_name, PlatformOrderItem.vendor_id)
        .order_by(desc("units_sold"), desc("revenue"))
        .limit(10)
    )
    top_prod_rows = (await db.execute(stmt_top_prods)).all()

    vendor_lookup = {v.id: v for v in vendors}
    top_selling_products: List[AdminTopSellingProductItem] = []
    for r in top_prod_rows:
        pid = str(r[0]) if r[0] else "custom"
        pname = r[1] or "Custom Order Item"
        v_entity = vendor_lookup.get(r[2])
        v_code = v_entity.vendor_code if v_entity else "N/A"
        v_bname = (getattr(v_entity.profile, "business_name", None) if v_entity else None) or "Store"
        v_slug = (getattr(v_entity.store, "store_slug", None) if v_entity else None) or "store"

        # Check stock quantity
        stock_qty = 0
        if r[0]:
            p_res = await db.execute(select(PlatformProduct.stock_quantity).where(PlatformProduct.id == r[0]))
            stock_qty = p_res.scalar() or 0

        top_selling_products.append(
            AdminTopSellingProductItem(
                product_id=pid,
                product_name=pname,
                vendor_code=v_code,
                vendor_business_name=v_bname,
                store_slug=v_slug,
                units_sold=int(r[3] or 0),
                revenue_inr=float(r[4] or 0.0),
                price_inr=float(r[5] or 0.0),
                stock_quantity=stock_qty,
            )
        )

    # 8. Category distribution items
    category_distribution = [
        AdminCategoryDistributionItem(
            category=cat_name,
            vendor_count=cdata["vendors"],
            product_count=cdata["products"],
            total_revenue_inr=round(cdata["revenue"], 2),
        )
        for cat_name, cdata in category_stats.items()
    ]
    category_distribution.sort(key=lambda x: (x.total_revenue_inr, x.vendor_count), reverse=True)

    # 9. Vendor growth trend (monthly buckets over the past 6 months)
    now = datetime.now(timezone.utc)
    growth_trend: List[AdminVendorOnboardingTrendItem] = []
    running_cumulative = 0

    for i in range(5, -1, -1):
        # Target month
        year = now.year
        month = now.month - i
        while month <= 0:
            month += 12
            year -= 1

        period_label = datetime(year, month, 1).strftime("%b %Y")
        start_of_month = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_of_month = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_of_month = datetime(year, month + 1, 1, tzinfo=timezone.utc)

        # Count new vendors onboarded this month
        def _to_utc(dt: Optional[datetime]) -> Optional[datetime]:
            if dt is None:
                return None
            return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)

        new_v = sum(1 for v in vendors if v.created_at and start_of_month <= _to_utc(v.created_at) < end_of_month)
        running_cumulative += new_v

        # Orders and GMV placed this month
        stmt_m_orders = (
            select(
                func.count(PlatformOrder.id),
                func.coalesce(func.sum(PlatformOrder.total_amount), 0.0),
            )
            .where(
                PlatformOrder.created_at >= start_of_month,
                PlatformOrder.created_at < end_of_month,
                PlatformOrder.order_status != "CANCELLED",
            )
        )
        m_row = (await db.execute(stmt_m_orders)).first()
        m_orders = (m_row[0] if m_row else 0) or 0
        m_gmv = float((m_row[1] if m_row else 0.0) or 0.0)

        growth_trend.append(
            AdminVendorOnboardingTrendItem(
                period=period_label,
                new_vendors=new_v,
                total_cumulative_vendors=running_cumulative,
                orders=m_orders,
                gmv_inr=m_gmv,
            )
        )

    # 10. Pixel & Tag Adoption tracking
    stmt_meta = select(func.count(PlatformStore.id)).where(PlatformStore.meta_pixel_id.isnot(None), PlatformStore.meta_pixel_id != "")
    meta_count = (await db.execute(stmt_meta)).scalar() or 0

    stmt_ga4 = select(func.count(PlatformStore.id)).where(PlatformStore.ga4_id.isnot(None), PlatformStore.ga4_id != "")
    ga4_count = (await db.execute(stmt_ga4)).scalar() or 0

    stmt_gtm = select(func.count(PlatformStore.id)).where(PlatformStore.gtm_id.isnot(None), PlatformStore.gtm_id != "")
    gtm_count = (await db.execute(stmt_gtm)).scalar() or 0

    stmt_tot_events = select(func.count(PlatformStoreEvent.id))
    total_events_logged = (await db.execute(stmt_tot_events)).scalar() or 0

    total_vendors = len(vendors)
    active_vendors = sum(1 for v in vendors if v.status == "active")
    inactive_vendors = sum(1 for v in vendors if v.status == "inactive")
    trial_vendors = sum(1 for v in vendors if v.status == "trial")
    avg_prods = round(total_products_platform / total_vendors, 1) if total_vendors > 0 else 0.0
    platform_aov = round(total_platform_gmv / total_orders_platform, 2) if total_orders_platform > 0 else 0.0
    platform_conv = round((total_orders_platform / total_store_visits) * 100, 2) if total_store_visits > 0 else 0.0

    return AdminDetailedAnalyticsResponse(
        total_vendors=total_vendors,
        active_vendors=active_vendors,
        inactive_vendors=inactive_vendors,
        trial_vendors=trial_vendors,
        vendors_with_sales=vendors_with_sales,
        vendors_without_sales=vendors_without_sales,
        total_products=total_products_platform,
        in_stock_products=total_in_stock_platform,
        out_of_stock_products=max(0, total_products_platform - total_in_stock_platform),
        avg_products_per_vendor=avg_prods,
        total_orders_platform=total_orders_platform,
        total_units_sold_platform=total_units_sold_platform,
        total_platform_gmv_inr=total_platform_gmv,
        platform_average_order_value_inr=platform_aov,
        total_store_visits=total_store_visits,
        platform_conversion_rate=platform_conv,
        total_whatsapp_leads=total_whatsapp_leads,
        top_vendor_by_revenue=top_by_revenue,
        top_vendor_by_units=top_by_units,
        vendor_leaderboard=leaderboard,
        top_selling_products=top_selling_products,
        category_distribution=category_distribution,
        growth_trend=growth_trend,
        meta_pixels_connected=meta_count,
        ga4_connected=ga4_count,
        gtm_connected=gtm_count,
        total_tracking_events_logged=total_events_logged,
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
            selectinload(PlatformVendor.storage_usage),
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
            publication_status=app.publication_status if app else "UNPUBLISHED",
            apk_user_approved=app.apk_user_approved if app else False,
            hyperlocal_enabled=s.hyperlocal_enabled if s else False,
            razorpay_enabled=s.razorpay_enabled if s else False,
            sms_gateway_enabled=s.sms_gateway_enabled if s else False,
            custom_domain_enabled=s.custom_domain_enabled if s else False,
            shiprocket_enabled=s.shiprocket_enabled if s else False,
            whatsapp_alerts_enabled=s.whatsapp_alerts_enabled if s else False,
            storage_used_mb=round((v.storage_usage.total_bytes_used if v.storage_usage else 0) / (1024 * 1024), 2),
            storage_limit_mb=round((v.storage_usage.limit_bytes if v.storage_usage else 1073741824) / (1024 * 1024), 2),
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

    vendor_code = await generate_next_vendor_code(db)

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
    vendor_id: str,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve comprehensive details of a single vendor for Super Admin inspection (by UUID or vendor_code)."""
    target_uuid = None
    try:
        target_uuid = uuid.UUID(vendor_id)
    except (ValueError, AttributeError):
        pass

    stmt = (
        select(PlatformVendor)
        .where(
            or_(PlatformVendor.id == target_uuid, PlatformVendor.vendor_code == vendor_id)
            if target_uuid
            else PlatformVendor.vendor_code == vendor_id
        )
        .options(
            selectinload(PlatformVendor.user),
            selectinload(PlatformVendor.profile),
            selectinload(PlatformVendor.store),
            selectinload(PlatformVendor.app_config),
            selectinload(PlatformVendor.storage_usage),
        )
    )
    v = (await db.execute(stmt)).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    u = v.user
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

    from app.services.platform.policies import get_store_policies
    policies = get_store_policies(s, p) if s else {}

    return VendorDetailFullResponse(
        id=v.id,
        vendor_code=v.vendor_code,
        status=v.status,
        created_at=v.created_at,
        # Owner (Personal) info
        owner_name=p.owner_name if p else (u.name if u else "N/A"),
        owner_email=u.email if u else (p.email if p else "N/A"),
        owner_phone=p.phone if p else "N/A",
        # Legacy aliases
        email=p.email if p else (u.email if u else "N/A"),
        phone=p.phone if p else "N/A",
        # Business info
        business_name=p.business_name if p else "N/A",
        brand_name=p.brand_name if p else None,
        category=p.category if p else "General",
        business_email=s.contact_email if (s and s.contact_email) else (p.email if p else None),
        business_phone=p.business_phone if (p and p.business_phone) else (s.contact_phone if s else (p.phone if p else None)),
        whatsapp_number=p.whatsapp_number if (p and p.whatsapp_number) else (s.contact_phone if s else None),
        address=p.address if p else (s.business_address if s else None),
        description=p.description if p else (s.description if s else None),
        gst_number=p.gst_number if p else None,
        logo_url=p.logo_url if p else (s.logo_url if s else None),
        website=p.website if p else None,
        # Store info
        store_name=s.store_name if s else (p.business_name if p else "N/A"),
        store_slug=s.store_slug if s else "N/A",
        subdomain=s.subdomain if s else "N/A",
        store_status=s.status if s else "active",
        store_created_at=s.created_at if s else v.created_at,
        contact_email=s.contact_email if s else None,
        contact_phone=s.contact_phone if s else None,
        primary_color=s.primary_color if s else "#2563EB",
        secondary_color=s.secondary_color if s else "#1E293B",
        cod_enabled=s.cod_enabled if s else True,
        razorpay_enabled=s.razorpay_enabled if s else False,
        razorpay_key_id=s.razorpay_key_id if s else None,
        razorpay_key_secret=s.razorpay_key_secret if s else None,
        razorpay_verified=s.razorpay_verified if s else False,
        shipping_charge=s.shipping_charge if s else 0.0,
        free_shipping_min_order=s.free_shipping_min_order if s else 999.0,
        estimated_delivery_days=s.estimated_delivery_days if s else "3-5 Business Days",
        # Policies
        terms_and_conditions=policies.get("terms_and_conditions"),
        privacy_policy=policies.get("privacy_policy"),
        shipping_policy=policies.get("shipping_policy"),
        refund_policy=policies.get("refund_policy"),
        meta_pixel_id=s.meta_pixel_id if s else None,
        gtm_id=s.gtm_id if s else None,
        ga4_id=s.ga4_id if s else None,
        tracking_enabled=getattr(s, "tracking_enabled", True) if s else True,
        # App info
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
        # Custom Domain info
        custom_domain=s.custom_domain if s else None,
        custom_domain_enabled=s.custom_domain_enabled if s else False,
        custom_domain_status=s.custom_domain_status if s else "UNCONFIGURED",
        custom_domain_ssl_status=s.custom_domain_ssl_status if s else "PENDING",
        custom_domain_dns_target=s.custom_domain_dns_target if s else "cname.digitalgrowthstudio.in",
        # SMS Gateway & Modular Apps
        sms_gateway_enabled=s.sms_gateway_enabled if s else False,
        sms_provider=s.sms_provider if s else "FAST2SMS",
        sms_api_key=s.sms_api_key if s else None,
        sms_sender_id=s.sms_sender_id if s else None,
        sms_custom_url=s.sms_custom_url if s else None,
        sms_order_placed_active=s.sms_order_placed_active if s else True,
        sms_order_dispatched_active=s.sms_order_dispatched_active if s else True,
        sms_welcome_active=s.sms_welcome_active if s else True,
        sms_otp_active=s.sms_otp_active if s else True,
        whatsapp_alerts_enabled=s.whatsapp_alerts_enabled if s else False,
        shiprocket_enabled=s.shiprocket_enabled if s else False,
        hyperlocal_enabled=s.hyperlocal_enabled if s else False,
        plan_name=sub.plan.name if sub and sub.plan else None,
        subscription_status=sub.status if sub else None,
        renewal_date=sub.next_renewal_date if sub else None,
        setup_fee_paid=sub.setup_fee_paid if sub else False,
        setup_fee_waived=sub.setup_fee_waived if sub else False,
        setup_fee_custom_price_inr=sub.setup_fee_custom_price_inr if sub else None,
        apk_user_approved=app.apk_user_approved if app else False,
        apk_download_url=app.apk_download_url if app else None,
        subscription_auto_debit_active=app.subscription_auto_debit_active if app else False,
        is_locked=app.is_locked if app else False,
    )


@router.put("/vendors/{vendor_id}/details", response_model=VendorDetailFullResponse)
async def update_vendor_full_details_by_admin(
    vendor_id: str,
    payload: AdminVendorFullUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Super Admin master update endpoint:
    Allows Super Admin to edit every detail of any vendor account:
    - Personal Owner Details (name, login email, phone)
    - Business Details (business name, brand name, category, GST, address, phone/WhatsApp, description)
    - Storefront & Settings (store name, slug, colors, payment keys, shipping fees, policies)
    """
    target_uuid = None
    try:
        target_uuid = uuid.UUID(vendor_id)
    except (ValueError, AttributeError):
        pass

    stmt = (
        select(PlatformVendor)
        .where(
            or_(PlatformVendor.id == target_uuid, PlatformVendor.vendor_code == vendor_id)
            if target_uuid
            else PlatformVendor.vendor_code == vendor_id
        )
        .options(
            selectinload(PlatformVendor.user),
            selectinload(PlatformVendor.profile),
            selectinload(PlatformVendor.store),
            selectinload(PlatformVendor.app_config),
            selectinload(PlatformVendor.storage_usage),
        )
    )
    v = (await db.execute(stmt)).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    u = v.user
    p = v.profile
    s = v.store

    dump = payload.model_dump(exclude_unset=True)

    # 1. Update Owner (Personal) Information
    if "owner_name" in dump and dump["owner_name"]:
        clean_name = dump["owner_name"].strip()
        if p:
            p.owner_name = clean_name
        if u:
            u.name = clean_name
    if "owner_email" in dump and dump["owner_email"]:
        new_email = dump["owner_email"].strip().lower()
        if u:
            u.email = new_email
        if p:
            p.email = new_email
    if "owner_phone" in dump and dump["owner_phone"]:
        clean_phone = dump["owner_phone"].strip()
        if p:
            p.phone = clean_phone

    # 2. Update Business Information
    if p:
        if "business_name" in dump and dump["business_name"] is not None:
            p.business_name = dump["business_name"].strip()
        if "brand_name" in dump and dump["brand_name"] is not None:
            p.brand_name = dump["brand_name"].strip()
        if "category" in dump and dump["category"] is not None:
            p.category = dump["category"].strip()
        if "gst_number" in dump:
            p.gst_number = dump["gst_number"].strip() if dump["gst_number"] else None
        if "business_phone" in dump:
            p.business_phone = dump["business_phone"].strip() if dump["business_phone"] else None
        if "whatsapp_number" in dump:
            p.whatsapp_number = dump["whatsapp_number"].strip() if dump["whatsapp_number"] else None
        if "address" in dump:
            p.address = dump["address"].strip() if dump["address"] else None
        if "description" in dump:
            p.description = dump["description"].strip() if dump["description"] else None

    # 3. Update Storefront Information
    if s:
        if "store_name" in dump and dump["store_name"] is not None:
            s.store_name = dump["store_name"].strip()
        if "store_slug" in dump and dump["store_slug"]:
            clean_slug = dump["store_slug"].strip().lower().replace(" ", "-")
            s.store_slug = clean_slug
            s.subdomain = f"{clean_slug}.digitalgrowthstudio.in"
        if "contact_email" in dump:
            s.contact_email = dump["contact_email"].strip() if dump["contact_email"] else None
        if "contact_phone" in dump:
            s.contact_phone = dump["contact_phone"].strip() if dump["contact_phone"] else None
        if "primary_color" in dump and dump["primary_color"]:
            s.primary_color = dump["primary_color"].strip()
        if "secondary_color" in dump and dump["secondary_color"]:
            s.secondary_color = dump["secondary_color"].strip()
        if "cod_enabled" in dump and dump["cod_enabled"] is not None:
            s.cod_enabled = bool(dump["cod_enabled"])
        if "razorpay_enabled" in dump and dump["razorpay_enabled"] is not None:
            s.razorpay_enabled = bool(dump["razorpay_enabled"])
        if "razorpay_key_id" in dump:
            s.razorpay_key_id = dump["razorpay_key_id"].strip() if dump["razorpay_key_id"] else None
        if "razorpay_key_secret" in dump:
            s.razorpay_key_secret = dump["razorpay_key_secret"].strip() if dump["razorpay_key_secret"] else None
        if "shipping_charge" in dump and dump["shipping_charge"] is not None:
            s.shipping_charge = float(dump["shipping_charge"])
        if "free_shipping_min_order" in dump:
            s.free_shipping_min_order = float(dump["free_shipping_min_order"]) if dump["free_shipping_min_order"] is not None else None
        if "estimated_delivery_days" in dump and dump["estimated_delivery_days"]:
            s.estimated_delivery_days = dump["estimated_delivery_days"].strip()

        # Policies
        if "terms_and_conditions" in dump:
            s.terms_and_conditions = dump["terms_and_conditions"]
        if "privacy_policy" in dump:
            s.privacy_policy = dump["privacy_policy"]
        if "shipping_policy" in dump:
            s.shipping_policy = dump["shipping_policy"]
        if "refund_policy" in dump:
            s.refund_policy = dump["refund_policy"]
        if "meta_pixel_id" in dump:
            s.meta_pixel_id = dump["meta_pixel_id"].strip() if dump["meta_pixel_id"] else None
        if "gtm_id" in dump:
            s.gtm_id = dump["gtm_id"].strip() if dump["gtm_id"] else None
        if "ga4_id" in dump:
            s.ga4_id = dump["ga4_id"].strip() if dump["ga4_id"] else None
        if "tracking_enabled" in dump and dump["tracking_enabled"] is not None:
            s.tracking_enabled = bool(dump["tracking_enabled"])
        if "custom_domain_enabled" in dump and dump["custom_domain_enabled"] is not None:
            s.custom_domain_enabled = bool(dump["custom_domain_enabled"])
        if "custom_domain" in dump:
            c_domain = dump["custom_domain"].strip().lower().replace("https://", "").replace("http://", "").split("/")[0] if dump["custom_domain"] else None
            s.custom_domain = c_domain
            if c_domain and s.custom_domain_status == "UNCONFIGURED":
                s.custom_domain_status = "ACTIVE"
                s.custom_domain_ssl_status = "ACTIVE"
            elif not c_domain:
                s.custom_domain_status = "UNCONFIGURED"
        if "custom_domain_status" in dump and dump["custom_domain_status"]:
            s.custom_domain_status = dump["custom_domain_status"].strip().upper()
        if "sms_gateway_enabled" in dump and dump["sms_gateway_enabled"] is not None:
            s.sms_gateway_enabled = bool(dump["sms_gateway_enabled"])
        if "sms_provider" in dump and dump["sms_provider"]:
            s.sms_provider = dump["sms_provider"].strip().upper()
        if "sms_api_key" in dump:
            s.sms_api_key = dump["sms_api_key"].strip() if dump["sms_api_key"] else None
        if "sms_sender_id" in dump:
            s.sms_sender_id = dump["sms_sender_id"].strip() if dump["sms_sender_id"] else None
        if "sms_custom_url" in dump:
            s.sms_custom_url = dump["sms_custom_url"].strip() if dump["sms_custom_url"] else None
        if "sms_order_placed_active" in dump and dump["sms_order_placed_active"] is not None:
            s.sms_order_placed_active = bool(dump["sms_order_placed_active"])
        if "sms_order_dispatched_active" in dump and dump["sms_order_dispatched_active"] is not None:
            s.sms_order_dispatched_active = bool(dump["sms_order_dispatched_active"])
        if "sms_welcome_active" in dump and dump["sms_welcome_active"] is not None:
            s.sms_welcome_active = bool(dump["sms_welcome_active"])
        if "sms_otp_active" in dump and dump["sms_otp_active"] is not None:
            s.sms_otp_active = bool(dump["sms_otp_active"])
        if "whatsapp_alerts_enabled" in dump and dump["whatsapp_alerts_enabled"] is not None:
            s.whatsapp_alerts_enabled = bool(dump["whatsapp_alerts_enabled"])
        if "shiprocket_enabled" in dump and dump["shiprocket_enabled"] is not None:
            s.shiprocket_enabled = bool(dump["shiprocket_enabled"])
        if "hyperlocal_enabled" in dump and dump["hyperlocal_enabled"] is not None:
            s.hyperlocal_enabled = bool(dump["hyperlocal_enabled"])

    # Also sync app config app_name if brand/store name was changed
    if v.app_config and ("brand_name" in dump or "store_name" in dump or "business_name" in dump):
        v.app_config.app_name = (
            dump.get("brand_name")
            or dump.get("store_name")
            or dump.get("business_name")
            or v.app_config.app_name
        )

    await db.commit()
    await db.refresh(v)

    return await get_vendor_full_detail(vendor_id=vendor_id, admin=admin, db=db)


@router.patch("/vendors/{vendor_id}/status")
async def update_vendor_status(
    vendor_id: str,
    payload: VendorStatusUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Activate, deactivate, or suspend a vendor."""
    target_uuid = None
    try:
        target_uuid = uuid.UUID(vendor_id)
    except (ValueError, AttributeError):
        pass

    stmt = select(PlatformVendor).where(
        or_(PlatformVendor.id == target_uuid, PlatformVendor.vendor_code == vendor_id)
        if target_uuid
        else PlatformVendor.vendor_code == vendor_id
    ).options(
        selectinload(PlatformVendor.app_config),
    )
    v = (await db.execute(stmt)).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    v.status = payload.status
    now = datetime.now(timezone.utc)

    # Synchronize subscription status and app auto debit with vendor status
    sub_stmt = select(PlatformSubscription).where(PlatformSubscription.vendor_id == v.id).order_by(desc(PlatformSubscription.created_at))
    sub = (await db.execute(sub_stmt)).scalars().first()

    if payload.status in ("inactive", "suspended"):
        if sub:
            sub.status = payload.status
            # Immediately expire subscription so dashboard blur activates
            sub.expires_at = now - timedelta(seconds=1)
        if v.app_config:
            v.app_config.subscription_auto_debit_active = False
            v.app_config.apk_user_approved = False
    elif payload.status == "active":
        if sub:
            sub.status = "active"
            sub_exp = sub.expires_at if sub.expires_at.tzinfo else sub.expires_at.replace(tzinfo=timezone.utc)
            if sub_exp < now:
                sub.expires_at = now + timedelta(days=30)
                sub.next_renewal_date = sub.expires_at
        if v.app_config:
            v.app_config.subscription_auto_debit_active = True
            v.app_config.apk_user_approved = True

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


@router.post("/vendors/{vendor_id}/grant-access")
async def grant_vendor_access_months(
    vendor_id: str,
    payload: AdminGrantAccessRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Super Admin grants a specific number of months of platform access to a vendor account."""
    target_uuid = None
    try:
        target_uuid = uuid.UUID(vendor_id)
    except (ValueError, AttributeError):
        pass

    stmt = select(PlatformVendor).where(
        or_(PlatformVendor.id == target_uuid, PlatformVendor.vendor_code == vendor_id)
        if target_uuid
        else PlatformVendor.vendor_code == vendor_id
    ).options(
        selectinload(PlatformVendor.app_config),
    )
    v = (await db.execute(stmt)).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    now = datetime.now(timezone.utc)
    sub_stmt = select(PlatformSubscription).where(PlatformSubscription.vendor_id == v.id).order_by(desc(PlatformSubscription.created_at))
    sub = (await db.execute(sub_stmt)).scalars().first()
    if not sub:
        plan_stmt = select(PlatformPlan).where(PlatformPlan.slug == "starter-store")
        plan = (await db.execute(plan_stmt)).scalar_one_or_none()
        if not plan:
            plan = PlatformPlan(name="Starter Store", slug="starter-store", monthly_price_inr=499.0)
            db.add(plan)
            await db.flush()
        new_expiry = now + timedelta(days=30 * payload.months)
        sub = PlatformSubscription(
            vendor_id=v.id,
            plan_id=plan.id,
            status="active",
            starts_at=now,
            expires_at=new_expiry,
            next_renewal_date=new_expiry,
            monthly_price_inr=499.0,
            setup_fee_paid=True,
        )
        db.add(sub)
    else:
        base_date = now
        if sub.expires_at:
            sub_exp = sub.expires_at if sub.expires_at.tzinfo else sub.expires_at.replace(tzinfo=timezone.utc)
            if sub_exp > now and sub.status == "active":
                base_date = sub_exp
        new_expiry = base_date + timedelta(days=30 * payload.months)
        sub.status = "active"
        sub.expires_at = new_expiry
        sub.next_renewal_date = new_expiry
        sub.setup_fee_paid = True

    v.status = "active"
    if v.app_config:
        v.app_config.apk_user_approved = True
        v.app_config.subscription_auto_debit_active = True

    # Audit Log
    db.add(PlatformAuditLog(
        actor_id=admin.id,
        actor_role="SUPER_ADMIN",
        vendor_id=v.id,
        action="GRANT_ACCESS",
        resource_type="SUBSCRIPTION",
        resource_id=f"{payload.months}_MONTHS",
    ))

    await db.commit()

    new_exp_str = sub.expires_at.strftime('%d %b %Y')
    return {
        "success": True,
        "message": f"Successfully granted {payload.months} month(s) of access to {v.vendor_code}. Valid until {new_exp_str}.",
        "status": "active",
        "expires_at": sub.expires_at.isoformat(),
        "next_renewal_date": sub.next_renewal_date.isoformat(),
    }


@router.patch("/vendors/{vendor_id}/subdomain")
async def update_vendor_subdomain(
    vendor_id: str,
    payload: VendorSubdomainUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Super Admin updates the dedicated store slug / subdomain of any vendor."""
    target_uuid = None
    try:
        target_uuid = uuid.UUID(vendor_id)
    except (ValueError, AttributeError):
        pass

    stmt = select(PlatformVendor).where(
        or_(PlatformVendor.id == target_uuid, PlatformVendor.vendor_code == vendor_id)
        if target_uuid
        else PlatformVendor.vendor_code == vendor_id
    ).options(
        selectinload(PlatformVendor.store),
        selectinload(PlatformVendor.profile),
        selectinload(PlatformVendor.app_config),
    )
    v = (await db.execute(stmt)).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    new_slug = re.sub(r"[^a-zA-Z0-9]+", "-", payload.store_slug.lower()).strip("-")
    if not new_slug:
        raise HTTPException(status_code=400, detail="Invalid store subdomain slug")

    # Check uniqueness against other stores
    existing_store_stmt = select(PlatformStore).where(
        PlatformStore.store_slug == new_slug,
        PlatformStore.vendor_id != v.id
    )
    existing_store = (await db.execute(existing_store_stmt)).scalar_one_or_none()
    if existing_store:
        raise HTTPException(status_code=400, detail=f"Subdomain '{new_slug}' is already taken by another store")

    new_subdomain = f"{new_slug}.digitalgrowthstudio.in"

    if v.store:
        v.store.store_slug = new_slug
        v.store.subdomain = new_subdomain
    else:
        v.store = PlatformStore(
            vendor_id=v.id,
            store_name=v.profile.business_name if v.profile else "Store",
            store_slug=new_slug,
            subdomain=new_subdomain,
            status="active",
        )
        db.add(v.store)

    if v.app_config:
        v.app_config.package_id = f"in.digitalgrowthstudio.{new_slug.replace('-', '_')}"

    audit = PlatformAuditLog(
        actor_id=admin.id,
        actor_role="SUPER_ADMIN",
        vendor_id=v.id,
        action="UPDATE_SUBDOMAIN",
        resource_type="STORE",
        resource_id=new_subdomain,
        changes=f"Changed subdomain to {new_subdomain}",
    )
    db.add(audit)
    await db.commit()

    return {
        "message": f"Subdomain successfully updated to {new_subdomain}",
        "store_slug": new_slug,
        "subdomain": new_subdomain,
    }


@router.delete("/vendors/{vendor_id}", status_code=status.HTTP_200_OK)
async def delete_vendor(
    vendor_id: str,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Permanently delete a vendor store and all associated resources.
    Cascade deletes: products, variants, images, categories, banners, orders, order items,
    customers, subscriptions, addons, payments, storage usage, app config, store, and profile.
    If the associated user has no other vendors and is not a SUPER_ADMIN, cleans up the user too.
    Accessible only to Super Admins.
    """
    target_uuid = None
    try:
        target_uuid = uuid.UUID(vendor_id)
    except (ValueError, AttributeError):
        pass

    stmt = select(PlatformVendor).where(
        or_(PlatformVendor.id == target_uuid, PlatformVendor.vendor_code == vendor_id)
        if target_uuid
        else PlatformVendor.vendor_code == vendor_id
    ).options(
        selectinload(PlatformVendor.profile),
        selectinload(PlatformVendor.store),
    )
    v = (await db.execute(stmt)).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    vendor_code = v.vendor_code
    business_name = (
        (v.profile.business_name if v.profile and v.profile.business_name else None)
        or (v.store.store_name if v.store and v.store.store_name else None)
        or vendor_code
    )
    user_id = v.user_id

    # Cascade delete in strict dependency order
    # 1. Order items & orders
    await db.execute(delete(PlatformOrderItem).where(PlatformOrderItem.vendor_id == v.id))
    await db.execute(delete(PlatformOrder).where(PlatformOrder.vendor_id == v.id))

    # 2. Variants, images, products, categories, banners
    await db.execute(delete(PlatformProductVariant).where(PlatformProductVariant.vendor_id == v.id))
    await db.execute(delete(PlatformProductImage).where(PlatformProductImage.vendor_id == v.id))
    await db.execute(delete(PlatformProduct).where(PlatformProduct.vendor_id == v.id))
    await db.execute(delete(PlatformCategory).where(PlatformCategory.vendor_id == v.id))
    await db.execute(delete(PlatformBanner).where(PlatformBanner.vendor_id == v.id))

    # 3. Customers
    await db.execute(delete(PlatformCustomer).where(PlatformCustomer.vendor_id == v.id))

    # 4. Addons, payments, subscriptions, coupons
    await db.execute(delete(PlatformVendorAddon).where(PlatformVendorAddon.vendor_id == v.id))
    await db.execute(delete(PlatformPayment).where(PlatformPayment.vendor_id == v.id))
    await db.execute(delete(PlatformSubscription).where(PlatformSubscription.vendor_id == v.id))
    await db.execute(delete(PlatformCoupon).where(PlatformCoupon.vendor_id == v.id))

    # 5. Notifications
    await db.execute(delete(PlatformNotification).where(PlatformNotification.vendor_id == v.id))

    # 6. Usage, App config, Store, Profile
    await db.execute(delete(PlatformStorageUsage).where(PlatformStorageUsage.vendor_id == v.id))
    await db.execute(delete(PlatformVendorAppConfig).where(PlatformVendorAppConfig.vendor_id == v.id))
    await db.execute(delete(PlatformStore).where(PlatformStore.vendor_id == v.id))
    await db.execute(delete(PlatformVendorProfile).where(PlatformVendorProfile.vendor_id == v.id))

    # 7. Unlink any existing audit logs referencing this vendor to prevent foreign key errors
    await db.execute(
        update(PlatformAuditLog)
        .where(PlatformAuditLog.vendor_id == v.id)
        .values(vendor_id=None)
    )

    # 8. Record audit log of deletion
    audit = PlatformAuditLog(
        actor_id=admin.id,
        actor_role="SUPER_ADMIN",
        vendor_id=None,
        action="DELETE_VENDOR",
        resource_type="VENDOR",
        resource_id=vendor_code,
        details_json=json.dumps({
            "vendor_code": vendor_code,
            "business_name": business_name,
            "deleted_by": admin.email,
        }),
    )
    db.add(audit)

    # 9. Delete the vendor
    await db.delete(v)
    await db.flush()

    # 10. Clean up user if they have no other vendors and are not SUPER_ADMIN
    if user_id:
        other_vendors = (await db.execute(
            select(func.count(PlatformVendor.id)).where(PlatformVendor.user_id == user_id)
        )).scalar() or 0
        if other_vendors == 0:
            target_user = (await db.execute(
                select(PlatformUser).where(PlatformUser.id == user_id)
            )).scalar_one_or_none()
            if target_user and target_user.role != "SUPER_ADMIN":
                await db.delete(target_user)

    await db.commit()
    return {
        "message": f"Store '{business_name}' ({vendor_code}) permanently deleted successfully",
        "vendor_code": vendor_code,
        "vendor_id": str(v.id),
    }


@router.patch("/vendors/{vendor_id}/app-config")
async def update_vendor_app_build_status(
    vendor_id: str,
    payload: VendorAppStatusUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update Android application build and publication status for developers (by UUID or vendor_code)."""
    target_uuid = None
    try:
        target_uuid = uuid.UUID(vendor_id)
    except (ValueError, AttributeError):
        pass

    v_stmt = select(PlatformVendor).where(
        or_(PlatformVendor.id == target_uuid, PlatformVendor.vendor_code == vendor_id)
        if target_uuid
        else PlatformVendor.vendor_code == vendor_id
    )
    v = (await db.execute(v_stmt)).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    app_cfg = (await db.execute(select(PlatformVendorAppConfig).where(PlatformVendorAppConfig.vendor_id == v.id))).scalar_one_or_none()
    if not app_cfg:
        default_pkg = f"in.digitalgrowthstudio.{v.store.store_slug.replace('-', '_')}" if v.store and v.store.store_slug else f"in.digitalgrowthstudio.{v.vendor_code.lower()}"
        app_cfg = PlatformVendorAppConfig(
            vendor_id=v.id,
            app_name=v.profile.business_name if v.profile else "App",
            package_id=default_pkg,
            app_build_status="NOT_REQUESTED",
            publication_status="UNPUBLISHED",
            app_version="1.0.0",
        )
        db.add(app_cfg)

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(app_cfg, field, val)

    now = datetime.now(timezone.utc)

    if payload.apk_download_url and not app_cfg.apk_submitted_at:
        app_cfg.apk_submitted_at = now

    # When marked as PUBLISHED or when admin marks APK as approved (confirmed via WhatsApp):
    if payload.apk_user_approved is True or payload.publication_status == "PUBLISHED":
        app_cfg.apk_user_approved = True
        if not app_cfg.apk_user_approved_at:
            app_cfg.apk_user_approved_at = now
        app_cfg.subscription_auto_debit_active = True

        # Activate the vendor's subscription immediately
        sub_stmt = (
            select(PlatformSubscription)
            .where(PlatformSubscription.vendor_id == v.id)
            .order_by(desc(PlatformSubscription.created_at))
        )
        sub = (await db.execute(sub_stmt)).scalars().first()
        if sub and sub.status != "active":
            sub.status = "active"
            sub.starts_at = now
            sub.next_renewal_date = now + timedelta(days=30)
            sub.expires_at = now + timedelta(days=30)

        if v.status in ("trial", "inactive", "pending"):
            v.status = "active"
    elif payload.apk_user_approved is False:
        app_cfg.apk_user_approved = False

    # Automatically enforce lock when development/build is set, unless explicitly unlocked by admin
    if payload.is_locked is None and app_cfg.app_build_status in {"QUEUED", "IN_DEVELOPMENT", "BUILT", "PUBLISHED"}:
        app_cfg.is_locked = True
    elif payload.is_locked is not None:
        app_cfg.is_locked = payload.is_locked

    audit = PlatformAuditLog(
        actor_id=admin.id,
        actor_role="SUPER_ADMIN",
        vendor_id=v.id,
        action="UPDATE_APP_CONFIG",
        resource_type="APP_CONFIG",
        resource_id=str(app_cfg.id) if hasattr(app_cfg, "id") and app_cfg.id else app_cfg.package_id,
        details_json=f"Updated app configuration for {v.vendor_code}",
    )
    db.add(audit)

    await db.commit()
    await db.refresh(app_cfg)
    return {
        "message": "Android Mobile App configuration successfully updated",
        "app_config": {
            "app_name": app_cfg.app_name,
            "package_id": app_cfg.package_id,
            "app_build_status": app_cfg.app_build_status,
            "publication_status": app_cfg.publication_status,
            "playstore_url": app_cfg.playstore_url,
            "app_version": app_cfg.app_version,
            "apk_download_url": app_cfg.apk_download_url,
            "apk_user_approved": app_cfg.apk_user_approved,
            "primary_color": app_cfg.primary_color,
            "secondary_color": app_cfg.secondary_color,
            "app_logo_url": app_cfg.app_logo_url,
            "splash_screen_url": app_cfg.splash_screen_url,
            "subscription_auto_debit_active": app_cfg.subscription_auto_debit_active,
            "is_locked": app_cfg.is_locked,
        },
    }


@router.patch("/vendors/{vendor_id}/setup-fee")
async def update_vendor_setup_fee(
    vendor_id: str,
    payload: AdminVendorSetupFeeUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Super Admin setup fee control (by UUID or vendor_code):
    - Waive setup fee for specific vendor (without public mention)
    - Set custom discounted price for specific vendor
    """
    target_uuid = None
    try:
        target_uuid = uuid.UUID(vendor_id)
    except (ValueError, AttributeError):
        pass

    v_stmt = select(PlatformVendor).where(
        or_(PlatformVendor.id == target_uuid, PlatformVendor.vendor_code == vendor_id)
        if target_uuid
        else PlatformVendor.vendor_code == vendor_id
    )
    v = (await db.execute(v_stmt)).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    sub_stmt = select(PlatformSubscription).where(PlatformSubscription.vendor_id == v.id).order_by(desc(PlatformSubscription.created_at))
    sub = (await db.execute(sub_stmt)).scalars().first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription record not found for vendor")

    if payload.waive_fee is not None:
        sub.setup_fee_waived = payload.waive_fee
        if payload.waive_fee:
            sub.setup_fee_paid = True
            sub.setup_fee_paid_at = datetime.now(timezone.utc)
            sub.status = "PENDING_APK_APPROVAL"

    if payload.custom_price_inr is not None:
        sub.setup_fee_custom_price_inr = payload.custom_price_inr

    await db.commit()
    return {
        "message": "Vendor setup fee configuration updated",
        "setup_fee_waived": sub.setup_fee_waived,
        "setup_fee_paid": sub.setup_fee_paid,
        "custom_price_inr": sub.setup_fee_custom_price_inr,
    }


class AdminCustomDomainAccessRequest(BaseModel):
    custom_domain_enabled: bool
    custom_domain: Optional[str] = None
    custom_domain_status: Optional[str] = "ACTIVE"


@router.patch("/vendors/{vendor_id}/custom-domain-access")
async def update_vendor_custom_domain_access(
    vendor_id: str,
    payload: AdminCustomDomainAccessRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Super Admin grants, revokes, or configures custom domain access for any vendor.
    """
    target_uuid = None
    try:
        target_uuid = uuid.UUID(vendor_id)
    except (ValueError, AttributeError):
        pass

    v_stmt = select(PlatformVendor).where(
        or_(PlatformVendor.id == target_uuid, PlatformVendor.vendor_code == vendor_id)
        if target_uuid
        else PlatformVendor.vendor_code == vendor_id
    )
    v = (await db.execute(v_stmt)).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    st_stmt = select(PlatformStore).where(PlatformStore.vendor_id == v.id)
    store = (await db.execute(st_stmt)).scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store record not found for vendor")

    store.custom_domain_enabled = payload.custom_domain_enabled

    from app.models.platform.subscription import PlatformAddon, PlatformVendorAddon
    addon = (await db.execute(select(PlatformAddon).where(PlatformAddon.code == "custom-domain"))).scalar_one_or_none()

    if not payload.custom_domain_enabled:
        # Super Admin revoked custom domain: deactivate any active vendor addon records
        if addon:
            await db.execute(
                update(PlatformVendorAddon)
                .where(
                    PlatformVendorAddon.vendor_id == v.id,
                    PlatformVendorAddon.addon_id == addon.id,
                )
                .values(status="cancelled")
            )
        store.custom_domain_status = "DISABLED"
    else:
        # Super Admin granted custom domain
        if store.custom_domain_status == "DISABLED":
            store.custom_domain_status = "ACTIVE" if store.custom_domain else "UNCONFIGURED"

    if payload.custom_domain is not None:
        clean = payload.custom_domain.strip().lower().replace("https://", "").replace("http://", "").split("/")[0] if payload.custom_domain else None
        store.custom_domain = clean
        if clean:
            store.custom_domain_status = payload.custom_domain_status or "ACTIVE"
            store.custom_domain_ssl_status = "ACTIVE"
        else:
            store.custom_domain_status = "UNCONFIGURED"
            store.custom_domain_ssl_status = "PENDING"

    await db.commit()
    await db.refresh(store)
    return {
        "success": True,
        "message": f"Custom domain access {'granted' if store.custom_domain_enabled else 'revoked'} successfully for vendor {v.vendor_code}.",
        "custom_domain_enabled": store.custom_domain_enabled,
        "custom_domain": store.custom_domain,
        "custom_domain_status": store.custom_domain_status,
    }


@router.post("/vendors/{vendor_id}/toggle-app")
async def toggle_vendor_app(
    vendor_id: str,
    payload: AdminAppToggleRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Super Admin toggles modular platform apps and integration entitlements for any vendor.
    Supported app_code: 'razorpay', 'sms_gateway', 'custom_domain', 'shiprocket', 'whatsapp'
    """
    target_uuid = None
    try:
        target_uuid = uuid.UUID(vendor_id)
    except (ValueError, AttributeError):
        pass

    v_stmt = select(PlatformVendor).where(
        or_(PlatformVendor.id == target_uuid, PlatformVendor.vendor_code == vendor_id)
        if target_uuid
        else PlatformVendor.vendor_code == vendor_id
    )
    v = (await db.execute(v_stmt)).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    st_stmt = select(PlatformStore).where(PlatformStore.vendor_id == v.id)
    store = (await db.execute(st_stmt)).scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store record not found for vendor")

    code = payload.app_code.lower().strip()
    status_text = "activated" if payload.enabled else "deactivated"
    app_display_name = ""

    if code == "razorpay":
        store.razorpay_enabled = payload.enabled
        app_display_name = "Razorpay Payments"
    elif code == "sms_gateway":
        store.sms_gateway_enabled = payload.enabled
        app_display_name = "SMS Gateway Engine"
    elif code == "custom_domain":
        store.custom_domain_enabled = payload.enabled
        app_display_name = "Custom Domain Connection"
        if not payload.enabled:
            store.custom_domain_status = "DISABLED"
        elif store.custom_domain_status == "DISABLED":
            store.custom_domain_status = "ACTIVE" if store.custom_domain else "UNCONFIGURED"
    elif code == "shiprocket":
        store.shiprocket_enabled = payload.enabled
        app_display_name = "Shiprocket Logistics"
    elif code == "whatsapp":
        store.whatsapp_alerts_enabled = payload.enabled
        app_display_name = "WhatsApp Alerts"
    elif code == "hyperlocal":
        store.hyperlocal_enabled = payload.enabled
        app_display_name = "Hyperlocal Quick-Commerce"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported app code: '{payload.app_code}'")

    log_entry = PlatformAuditLog(
        id=uuid.uuid4(),
        actor_id=admin.id,
        actor_role=admin.role,
        vendor_id=v.id,
        action="TOGGLE_APP_ENTITLEMENT",
        resource_type="store",
        resource_id=str(store.id),
        details_json=json.dumps({
            "vendor_code": v.vendor_code,
            "app_code": code,
            "app_name": app_display_name,
            "enabled": payload.enabled,
        }),
    )
    db.add(log_entry)

    await db.commit()
    await db.refresh(store)

    return {
        "success": True,
        "message": f"{app_display_name} {status_text} for vendor {v.vendor_code}.",
        "app_code": code,
        "enabled": payload.enabled,
        "store": {
            "razorpay_enabled": store.razorpay_enabled,
            "sms_gateway_enabled": store.sms_gateway_enabled,
            "custom_domain_enabled": store.custom_domain_enabled,
            "shiprocket_enabled": store.shiprocket_enabled,
            "whatsapp_alerts_enabled": store.whatsapp_alerts_enabled,
            "hyperlocal_enabled": store.hyperlocal_enabled,
        },
    }


@router.patch("/plans/{plan_id}/pricing")
async def update_plan_pricing(
    plan_id: uuid.UUID,
    payload: AdminPlanPricingUpdateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Super Admin update of base plan pricing, base setup fee MRP, and active sale price."""
    plan = (await db.execute(select(PlatformPlan).where(PlatformPlan.id == plan_id))).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if payload.monthly_price_inr is not None:
        plan.monthly_price_inr = payload.monthly_price_inr
    if payload.setup_fee_inr is not None:
        plan.setup_fee_inr = payload.setup_fee_inr
    if payload.setup_fee_sale_price_inr is not None:
        plan.setup_fee_sale_price_inr = payload.setup_fee_sale_price_inr

    await db.commit()
    return {"message": "Plan pricing updated successfully"}


# ──────────────────────────────────────────────
# Coupons Management
# ──────────────────────────────────────────────
@router.get("/coupons")
async def list_admin_coupons(
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all coupons generated by Super Admin."""
    stmt = (
        select(PlatformCoupon)
        .options(selectinload(PlatformCoupon.addon))
        .order_by(desc(PlatformCoupon.created_at))
    )
    coupons = (await db.execute(stmt)).scalars().all()
    results = []
    for c in coupons:
        results.append({
            "id": str(c.id),
            "code": c.code,
            "discount_type": c.discount_type,
            "discount_value": c.discount_value,
            "applicable_to": c.applicable_to,
            "addon_id": str(c.addon_id) if c.addon_id else None,
            "addon_name": c.addon.name if c.addon else None,
            "addon_code": c.addon.code if c.addon else None,
            "vendor_id": str(c.vendor_id) if c.vendor_id else None,
            "max_uses": c.max_uses,
            "used_count": c.used_count,
            "one_time_per_vendor": getattr(c, "one_time_per_vendor", True),
            "valid_until": c.valid_until.isoformat() if c.valid_until else None,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return results


@router.post("/coupons", status_code=status.HTTP_201_CREATED)
async def create_admin_coupon(
    payload: AdminCouponCreateRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Generate discount coupon valid for specific or general users."""
    code_clean = payload.code.upper().strip()
    existing = (await db.execute(select(PlatformCoupon).where(PlatformCoupon.code == code_clean))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail=f"Coupon code '{code_clean}' already exists.")

    now = datetime.now(timezone.utc)
    valid_until = now + timedelta(days=payload.valid_days)

    coupon = PlatformCoupon(
        code=code_clean,
        discount_type=payload.discount_type,
        discount_value=payload.discount_value,
        applicable_to=payload.applicable_to,
        addon_id=payload.addon_id,
        vendor_id=payload.vendor_id,
        max_uses=payload.max_uses,
        one_time_per_vendor=payload.one_time_per_vendor,
        valid_until=valid_until,
        is_active=True,
    )
    db.add(coupon)
    await db.commit()
    await db.refresh(coupon)
    return {
        "id": str(coupon.id),
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "applicable_to": coupon.applicable_to,
        "addon_id": str(coupon.addon_id) if coupon.addon_id else None,
        "vendor_id": str(coupon.vendor_id) if coupon.vendor_id else None,
        "max_uses": coupon.max_uses,
        "used_count": coupon.used_count,
        "one_time_per_vendor": coupon.one_time_per_vendor,
        "valid_until": coupon.valid_until.isoformat(),
        "is_active": coupon.is_active,
    }


@router.delete("/coupons/{coupon_id}")
async def delete_admin_coupon(
    coupon_id: uuid.UUID,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Revoke or delete coupon."""
    coupon = (await db.execute(select(PlatformCoupon).where(PlatformCoupon.id == coupon_id))).scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    await db.delete(coupon)
    await db.commit()
    return {"message": "Coupon deleted successfully"}


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
        setup_fee_sale_price_inr=payload.setup_fee_sale_price_inr if payload.setup_fee_sale_price_inr is not None else 999.0,
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


# ──────────────────────────────────────────────
# 6. AI Credits & Pricing Configuration
# ──────────────────────────────────────────────

DEFAULT_AI_CREDIT_CONFIG = {
    "welcome_credits": 5,
    "import_product_credit_cost": 3,
    "image_studio_credit_cost": 5,
    "credit_packs": [
        {
            "id": "pack_starter",
            "name": "Starter Pack",
            "credits": 25,
            "price_inr": 99.0,
            "tag": "Standard",
            "popular": False,
            "active": True
        },
        {
            "id": "pack_growth",
            "name": "Growth Pack",
            "credits": 75,
            "price_inr": 249.0,
            "tag": "Most Popular",
            "popular": True,
            "active": True
        },
        {
            "id": "pack_pro",
            "name": "Pro Merchant Pack",
            "credits": 250,
            "price_inr": 599.0,
            "tag": "Best Value",
            "popular": False,
            "active": True
        },
        {
            "id": "pack_scale",
            "name": "Scale Enterprise Pack",
            "credits": 1000,
            "price_inr": 1999.0,
            "tag": "Enterprise",
            "popular": False,
            "active": True
        }
    ]
}


@router.get("/credits/config")
async def get_admin_credit_config(
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve global AI credit pricing and package settings."""
    stmt = select(PlatformSetting).where(PlatformSetting.key == "ai_credit_settings")
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row and row.value:
        try:
            return json.loads(row.value)
        except Exception:
            pass
    return DEFAULT_AI_CREDIT_CONFIG


@router.put("/credits/config")
async def update_admin_credit_config(
    payload: AiAdminCreditConfigUpdate,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Super Admin sets the prices, credit quantities, and active status for packs,
    as well as the cost in credits for 1-Click Import and AI Image Studio.
    """
    stmt = select(PlatformSetting).where(PlatformSetting.key == "ai_credit_settings")
    row = (await db.execute(stmt)).scalar_one_or_none()

    current_config = dict(DEFAULT_AI_CREDIT_CONFIG)
    if row and row.value:
        try:
            current_config = json.loads(row.value)
        except Exception:
            pass

    if payload.welcome_credits is not None:
        current_config["welcome_credits"] = int(payload.welcome_credits)
    if payload.import_product_credit_cost is not None:
        current_config["import_product_credit_cost"] = int(payload.import_product_credit_cost)
    if payload.image_studio_credit_cost is not None:
        current_config["image_studio_credit_cost"] = int(payload.image_studio_credit_cost)
    if payload.credit_packs is not None:
        current_config["credit_packs"] = [p.model_dump() for p in payload.credit_packs]

    json_str = json.dumps(current_config, indent=2)

    if not row:
        row = PlatformSetting(
            key="ai_credit_settings",
            value=json_str,
            description="Global AI credit pricing and pack configuration"
        )
        db.add(row)
    else:
        row.value = json_str

    # Record audit log
    db.add(PlatformAuditLog(
        actor_id=admin.id,
        actor_role="SUPER_ADMIN",
        action="UPDATE_AI_CREDIT_CONFIG",
        resource_type="SETTING",
        resource_id="ai_credit_settings",
        details_json=json_str
    ))

    await db.commit()

    return current_config


@router.get("/credits/vendors")
async def list_vendor_credit_balances(
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lists vendor accounts with their current credit balances and total transactions."""
    query = (
        select(
            PlatformVendor,
            PlatformVendorProfile,
            PlatformStore,
            func.count(PlatformCreditTransaction.id).label("total_transactions")
        )
        .outerjoin(PlatformVendorProfile, PlatformVendorProfile.vendor_id == PlatformVendor.id)
        .outerjoin(PlatformStore, PlatformStore.vendor_id == PlatformVendor.id)
        .outerjoin(PlatformCreditTransaction, PlatformCreditTransaction.vendor_id == PlatformVendor.id)
        .group_by(PlatformVendor.id, PlatformVendorProfile.id, PlatformStore.id)
        .order_by(desc(PlatformVendor.created_at))
    )

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.where(
            or_(
                PlatformVendor.vendor_code.ilike(search_filter),
                PlatformVendorProfile.business_name.ilike(search_filter),
                PlatformVendorProfile.owner_name.ilike(search_filter),
                PlatformVendor.email.ilike(search_filter),
            )
        )

    query = query.offset(offset).limit(limit)
    rows = (await db.execute(query)).all()

    results = []
    for v, profile, store, tx_count in rows:
        results.append({
            "vendor_id": str(v.id),
            "vendor_code": v.vendor_code,
            "business_name": profile.business_name if profile else "Store",
            "owner_name": profile.owner_name if profile else "Merchant",
            "email": v.email,
            "ai_credits": v.ai_credits,
            "total_transactions": tx_count or 0,
            "store_name": store.store_name if store else None,
            "subdomain": store.subdomain if store else None,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        })

    return results


@router.post("/credits/grant")
async def grant_vendor_credits(
    payload: AiAdminGrantCreditsRequest,
    admin: PlatformUser = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Super Admin manually adds or deducts AI credits for any vendor account.
    """
    stmt = select(PlatformVendor).where(PlatformVendor.id == payload.vendor_id)
    vendor = (await db.execute(stmt)).scalar_one_or_none()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    vendor.ai_credits = max(0, vendor.ai_credits + payload.amount)

    action_name = "ADMIN_GRANT" if payload.amount >= 0 else "ADMIN_DEDUCT"
    db.add(PlatformCreditTransaction(
        vendor_id=vendor.id,
        amount=payload.amount,
        balance_after=vendor.ai_credits,
        action=action_name,
        description=f"Admin Adjustment: {payload.reason.strip()}",
        reference_id=str(admin.id)
    ))

    db.add(PlatformAuditLog(
        actor_id=admin.id,
        actor_role="SUPER_ADMIN",
        vendor_id=vendor.id,
        action=action_name,
        resource_type="VENDOR_CREDIT",
        resource_id=str(vendor.id),
        details_json=json.dumps({"amount": payload.amount, "reason": payload.reason, "new_balance": vendor.ai_credits})
    ))

    await db.commit()

    return {
        "success": True,
        "vendor_id": str(vendor.id),
        "vendor_code": vendor.vendor_code,
        "amount_adjusted": payload.amount,
        "new_balance": vendor.ai_credits,
        "message": f"Successfully updated credits for vendor {vendor.vendor_code}. New balance: {vendor.ai_credits} credits."
    }


