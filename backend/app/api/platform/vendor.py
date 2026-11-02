"""
Digital Growth Studio — Vendor Dashboard API Endpoints
All operations strictly enforce vendor isolation.
"""
import uuid
import re
import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select, func, desc, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.core.platform_auth import require_vendor_admin, CurrentVendor
from app.services.bunny_storage import bunny_storage
from app.models.platform.vendor import (
    PlatformVendor,
    PlatformVendorProfile,
    PlatformStore,
    PlatformVendorAppConfig,
    PlatformStorageUsage,
)
from app.models.platform.catalog import (
    PlatformCategory,
    PlatformProduct,
    PlatformProductImage,
    PlatformProductVariant,
    PlatformBanner,
)
from app.models.platform.order import (
    PlatformCustomer,
    PlatformOrder,
    PlatformOrderItem,
)
from app.models.platform.subscription import (
    PlatformSubscription,
    PlatformPlan,
    PlatformAddon,
    PlatformVendorAddon,
)
from app.schemas.platform.catalog import (
    CategoryCreatePayload,
    CategoryUpdatePayload,
    CategoryResponse,
    ProductCreatePayload,
    ProductUpdatePayload,
    ProductResponse,
    BannerCreatePayload,
    BannerUpdatePayload,
    BannerResponse,
    ProductImageItem,
    ProductVariantPayload,
    ProductVariantResponse,
)
from app.schemas.platform.order import (
    OrderResponse,
    OrderItemResponse,
    OrderStatusUpdateRequest,
    CustomerResponse,
)
from app.schemas.platform.vendor import (
    StoreUpdateRequest,
    VendorProfileUpdateRequest,
    VendorAppConfigUpdateRequest,
    VendorDashboardOverviewResponse,
)

router = APIRouter(prefix="/platform/vendor", tags=["Vendor Dashboard"])


def slugify(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return cleaned or "item"


# ──────────────────────────────────────────────
# 1. Overview Metrics
# ──────────────────────────────────────────────
@router.get("/overview", response_model=VendorDashboardOverviewResponse)
async def get_vendor_overview(
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate dashboard metrics for the authenticated vendor only."""
    vid = current.vendor.id

    # Products count
    p_total = (await db.execute(select(func.count(PlatformProduct.id)).where(PlatformProduct.vendor_id == vid))).scalar() or 0
    p_active = (await db.execute(select(func.count(PlatformProduct.id)).where(PlatformProduct.vendor_id == vid, PlatformProduct.status == "active"))).scalar() or 0
    p_out_of_stock = (await db.execute(select(func.count(PlatformProduct.id)).where(PlatformProduct.vendor_id == vid, PlatformProduct.status == "out_of_stock"))).scalar() or 0

    # Orders count & revenue
    o_total = (await db.execute(select(func.count(PlatformOrder.id)).where(PlatformOrder.vendor_id == vid))).scalar() or 0
    o_pending = (await db.execute(select(func.count(PlatformOrder.id)).where(PlatformOrder.vendor_id == vid, PlatformOrder.order_status.in_(["NEW", "CONFIRMED"])))).scalar() or 0
    o_processing = (await db.execute(select(func.count(PlatformOrder.id)).where(PlatformOrder.vendor_id == vid, PlatformOrder.order_status == "PROCESSING"))).scalar() or 0
    o_completed = (await db.execute(select(func.count(PlatformOrder.id)).where(PlatformOrder.vendor_id == vid, PlatformOrder.order_status == "DELIVERED"))).scalar() or 0
    o_cancelled = (await db.execute(select(func.count(PlatformOrder.id)).where(PlatformOrder.vendor_id == vid, PlatformOrder.order_status == "CANCELLED"))).scalar() or 0

    revenue = (await db.execute(select(func.sum(PlatformOrder.total_amount)).where(PlatformOrder.vendor_id == vid, PlatformOrder.order_status != "CANCELLED"))).scalar() or 0.0

    # Customers count
    c_total = (await db.execute(select(func.count(PlatformCustomer.id)).where(PlatformCustomer.vendor_id == vid))).scalar() or 0

    # Storage
    storage = current.vendor.storage_usage
    used_bytes = storage.total_bytes_used if storage else 0
    limit_bytes = storage.limit_bytes if storage else 1073741824
    storage_pct = round((used_bytes / limit_bytes) * 100, 2) if limit_bytes > 0 else 0.0

    # Subscription
    sub_stmt = (
        select(PlatformSubscription)
        .where(PlatformSubscription.vendor_id == vid)
        .options(selectinload(PlatformSubscription.plan))
        .order_by(PlatformSubscription.expires_at.desc())
    )
    sub = (await db.execute(sub_stmt)).scalar_one_or_none()

    plan_name = sub.plan.name if sub and sub.plan else "Starter Store"
    sub_status = sub.status if sub else current.vendor.status
    renewal = sub.next_renewal_date if sub else None

    store = current.vendor.store

    return VendorDashboardOverviewResponse(
        vendor_code=current.vendor.vendor_code,
        store_name=store.store_name if store else "My Store",
        store_slug=store.store_slug if store else "store",
        subdomain=store.subdomain if store else "store.digitalgrowthstudio.in",
        status=current.vendor.status,
        total_products=p_total,
        active_products=p_active,
        out_of_stock_products=p_out_of_stock,
        total_orders=o_total,
        pending_orders=o_pending,
        processing_orders=o_processing,
        completed_orders=o_completed,
        cancelled_orders=o_cancelled,
        total_sales_inr=float(revenue),
        total_customers=c_total,
        storage_used_bytes=used_bytes,
        storage_limit_bytes=limit_bytes,
        storage_percentage=storage_pct,
        subscription_plan=plan_name,
        subscription_status=sub_status,
        subscription_renewal_date=renewal,
    )


# ──────────────────────────────────────────────
# 2. Store & Business Profile Management
# ──────────────────────────────────────────────
@router.get("/store")
async def get_vendor_store(current: CurrentVendor = Depends(require_vendor_admin)):
    """Fetch current vendor store settings."""
    return current.vendor.store


@router.put("/store")
async def update_vendor_store(
    payload: StoreUpdateRequest,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update store theme colors, contacts, address, and payment options."""
    store = current.vendor.store
    if not store:
        raise HTTPException(status_code=404, detail="Store record not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(store, field, value)

    await db.commit()
    await db.refresh(store)
    return store


@router.get("/profile")
async def get_vendor_profile(current: CurrentVendor = Depends(require_vendor_admin)):
    """Fetch vendor business profile."""
    return current.vendor.profile


@router.put("/profile")
async def update_vendor_profile(
    payload: VendorProfileUpdateRequest,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update business profile details."""
    profile = current.vendor.profile
    if not profile:
        raise HTTPException(status_code=404, detail="Profile record not found")

    dump = payload.model_dump(exclude_unset=True)
    if profile.brand_name and "brand_name" in dump and dump["brand_name"] != profile.brand_name:
        raise HTTPException(
            status_code=400,
            detail="Brand Name is permanent and cannot be changed once selected."
        )

    for field, value in dump.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile


@router.get("/app-config")
async def get_vendor_app_config(current: CurrentVendor = Depends(require_vendor_admin)):
    """Fetch Android application branding & publication tracking information."""
    return current.vendor.app_config


@router.put("/app-config")
async def update_vendor_app_config(
    payload: VendorAppConfigUpdateRequest,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update vendor Android app branding assets (logo, splash screen, colors)."""
    cfg = current.vendor.app_config
    if not cfg:
        raise HTTPException(status_code=404, detail="App config record not found")

    # If build is set / development is underway / locked, disallow changes
    development_active_statuses = {"QUEUED", "IN_DEVELOPMENT", "BUILT", "PUBLISHED"}
    is_already_set = getattr(cfg, "is_locked", False) or (cfg.app_build_status in development_active_statuses)

    dump = payload.model_dump(exclude_unset=True)
    submit_dev = dump.pop("submit_for_development", False)
    sync_personal = dump.pop("sync_with_personal_data", True)

    # Reject if already set and attempting to modify branding assets
    branding_fields = {"app_name", "app_logo_url", "splash_screen_url", "primary_color", "secondary_color"}
    if is_already_set and any(f in dump for f in branding_fields):
        raise HTTPException(
            status_code=400,
            detail="App branding and assets cannot be changed once submitted and development is set."
        )

    for field, value in dump.items():
        if hasattr(cfg, field):
            setattr(cfg, field, value)

    if submit_dev:
        cfg.is_locked = True
        if cfg.app_build_status in ["NOT_REQUESTED", "FAILED"]:
            cfg.app_build_status = "QUEUED"

    # Make sure this is used in their personal data (Vendor Profile & Store Logo)
    if sync_personal and cfg.app_logo_url:
        if current.vendor.profile:
            current.vendor.profile.logo_url = cfg.app_logo_url
        if current.vendor.store:
            current.vendor.store.logo_url = cfg.app_logo_url

    await db.commit()
    await db.refresh(cfg)
    return cfg


@router.post("/app-config/submit")
async def submit_vendor_app_for_development(
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Submit app branding assets to queue Android build development. Locks assets permanently."""
    cfg = current.vendor.app_config
    if not cfg:
        raise HTTPException(status_code=404, detail="App config record not found")

    if not cfg.app_name:
        raise HTTPException(status_code=400, detail="App Display Name is required before submitting.")
    if not cfg.app_logo_url:
        raise HTTPException(status_code=400, detail="App Launcher Icon is required before submitting.")

    cfg.is_locked = True
    if cfg.app_build_status in ["NOT_REQUESTED", "FAILED"]:
        cfg.app_build_status = "QUEUED"

    # Sync with personal data (Profile & Store)
    if cfg.app_logo_url:
        if current.vendor.profile:
            current.vendor.profile.logo_url = cfg.app_logo_url
        if current.vendor.store:
            current.vendor.store.logo_url = cfg.app_logo_url

    await db.commit()
    await db.refresh(cfg)
    return cfg


# ──────────────────────────────────────────────
# 3. Category Management
# ──────────────────────────────────────────────
@router.get("/categories", response_model=List[CategoryResponse])
async def list_vendor_categories(
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all categories belonging to the authenticated vendor."""
    stmt = (
        select(PlatformCategory)
        .where(PlatformCategory.vendor_id == current.vendor.id)
        .order_by(PlatformCategory.sort_order.asc(), PlatformCategory.name.asc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor_category(
    payload: CategoryCreatePayload,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new vendor-specific category."""
    cat_slug = slugify(payload.slug or payload.name)
    category = PlatformCategory(
        vendor_id=current.vendor.id,
        name=payload.name.strip(),
        slug=cat_slug,
        image_url=payload.image_url,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.put("/categories/{cat_id}", response_model=CategoryResponse)
async def update_vendor_category(
    cat_id: uuid.UUID,
    payload: CategoryUpdatePayload,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a category owned by the authenticated vendor."""
    stmt = select(PlatformCategory).where(PlatformCategory.id == cat_id, PlatformCategory.vendor_id == current.vendor.id)
    category = (await db.execute(stmt)).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found or access denied")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "slug" and value:
            value = slugify(value)
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/categories/{cat_id}")
async def delete_vendor_category(
    cat_id: uuid.UUID,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a vendor's category."""
    stmt = select(PlatformCategory).where(PlatformCategory.id == cat_id, PlatformCategory.vendor_id == current.vendor.id)
    category = (await db.execute(stmt)).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found or access denied")

    await db.delete(category)
    await db.commit()
    return {"message": "Category deleted successfully"}


# ──────────────────────────────────────────────
# 4. Product Management
# ──────────────────────────────────────────────
def serialize_variants(variants: List[PlatformProductVariant]) -> List[ProductVariantResponse]:
    out = []
    for v in sorted(variants, key=lambda x: x.sort_order):
        imgs = []
        if v.images_json:
            try:
                imgs = json.loads(v.images_json)
            except Exception:
                imgs = []
        out.append(ProductVariantResponse(
            id=v.id,
            name=v.name,
            sku=v.sku,
            price=v.price,
            stock_quantity=v.stock_quantity,
            images=imgs,
            sort_order=v.sort_order,
            is_active=v.is_active,
        ))
    return out


@router.get("/products", response_model=List[ProductResponse])
async def list_vendor_products(
    category_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = None,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """List products belonging to the authenticated vendor only."""
    stmt = (
        select(PlatformProduct)
        .where(PlatformProduct.vendor_id == current.vendor.id)
        .options(
            selectinload(PlatformProduct.category),
            selectinload(PlatformProduct.images),
            selectinload(PlatformProduct.variants),
        )
        .order_by(desc(PlatformProduct.created_at))
    )
    if category_id:
        stmt = stmt.where(PlatformProduct.category_id == category_id)
    if status_filter:
        stmt = stmt.where(PlatformProduct.status == status_filter)

    products = (await db.execute(stmt)).scalars().all()

    output = []
    for p in products:
        output.append(ProductResponse(
            id=p.id,
            vendor_id=p.vendor_id,
            category_id=p.category_id,
            category_name=p.category.name if p.category else None,
            name=p.name,
            slug=p.slug,
            description=p.description,
            regular_price=p.regular_price,
            sale_price=p.sale_price,
            sku=p.sku,
            stock_quantity=p.stock_quantity,
            status=p.status,
            is_featured=p.is_featured,
            has_variants=p.has_variants,
            thumbnail_url=p.thumbnail_url,
            images=[
                ProductImageItem(
                    id=img.id,
                    image_url=img.image_url,
                    sort_order=img.sort_order,
                    is_thumbnail=img.is_thumbnail,
                ) for img in sorted(p.images, key=lambda x: x.sort_order)
            ],
            variants=serialize_variants(p.variants or []),
            created_at=p.created_at,
        ))
    return output


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor_product(
    payload: ProductCreatePayload,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new product under the authenticated vendor."""
    vid = current.vendor.id
    prod_slug = slugify(payload.name)

    # Verify category belongs to vendor if provided
    if payload.category_id:
        c_stmt = select(PlatformCategory).where(PlatformCategory.id == payload.category_id, PlatformCategory.vendor_id == vid)
        if not (await db.execute(c_stmt)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid category ID")

    has_variants = bool(payload.variants and len(payload.variants) > 0)
    stock_qty = sum(v.stock_quantity for v in payload.variants) if has_variants else payload.stock_quantity

    product = PlatformProduct(
        vendor_id=vid,
        category_id=payload.category_id,
        name=payload.name.strip(),
        slug=prod_slug,
        description=payload.description,
        regular_price=payload.regular_price,
        sale_price=payload.sale_price,
        sku=payload.sku or f"SKU-{uuid.uuid4().hex[:6].upper()}",
        stock_quantity=stock_qty,
        status=payload.status,
        is_featured=payload.is_featured,
        has_variants=has_variants,
        thumbnail_url=payload.thumbnail_url or (payload.image_urls[0] if payload.image_urls else None),
    )
    db.add(product)
    await db.flush()

    # Add images
    if payload.image_urls:
        for idx, url in enumerate(payload.image_urls):
            img = PlatformProductImage(
                product_id=product.id,
                vendor_id=vid,
                image_url=url,
                sort_order=idx,
                is_thumbnail=(idx == 0),
            )
            db.add(img)

    # Add variants
    if payload.variants:
        for idx, v in enumerate(payload.variants):
            var_sku = v.sku.strip() if (v.sku and v.sku.strip()) else f"{product.sku}-{idx+1}"
            var_record = PlatformProductVariant(
                product_id=product.id,
                vendor_id=vid,
                name=v.name.strip(),
                sku=var_sku,
                price=v.price,
                stock_quantity=v.stock_quantity,
                images_json=json.dumps(v.images or []),
                sort_order=v.sort_order if v.sort_order else idx,
                is_active=v.is_active,
            )
            db.add(var_record)

    # Update vendor product count in storage record
    await db.execute(
        update(PlatformStorageUsage)
        .where(PlatformStorageUsage.vendor_id == vid)
        .values(product_count=PlatformStorageUsage.product_count + 1)
    )

    await db.commit()

    # Reload with relationships
    stmt = (
        select(PlatformProduct)
        .where(PlatformProduct.id == product.id)
        .options(
            selectinload(PlatformProduct.category),
            selectinload(PlatformProduct.images),
            selectinload(PlatformProduct.variants),
        )
    )
    saved = (await db.execute(stmt)).scalar_one()

    return ProductResponse(
        id=saved.id,
        vendor_id=saved.vendor_id,
        category_id=saved.category_id,
        category_name=saved.category.name if saved.category else None,
        name=saved.name,
        slug=saved.slug,
        description=saved.description,
        regular_price=saved.regular_price,
        sale_price=saved.sale_price,
        sku=saved.sku,
        stock_quantity=saved.stock_quantity,
        status=saved.status,
        is_featured=saved.is_featured,
        has_variants=saved.has_variants,
        thumbnail_url=saved.thumbnail_url,
        images=[
            ProductImageItem(
                id=img.id,
                image_url=img.image_url,
                sort_order=img.sort_order,
                is_thumbnail=img.is_thumbnail,
            ) for img in sorted(saved.images, key=lambda x: x.sort_order)
        ],
        variants=serialize_variants(saved.variants or []),
        created_at=saved.created_at,
    )


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_vendor_product(
    product_id: uuid.UUID,
    payload: ProductUpdatePayload,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update product information."""
    vid = current.vendor.id
    stmt = (
        select(PlatformProduct)
        .where(PlatformProduct.id == product_id, PlatformProduct.vendor_id == vid)
        .options(
            selectinload(PlatformProduct.category),
            selectinload(PlatformProduct.images),
            selectinload(PlatformProduct.variants),
        )
    )
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or access denied")

    data = payload.model_dump(exclude_unset=True)
    image_urls = data.pop("image_urls", None)
    variants_payload = data.pop("variants", None)
    has_variants_payload = data.pop("has_variants", None)

    for field, value in data.items():
        if field == "name" and value:
            product.slug = slugify(value)
        setattr(product, field, value)

    if image_urls is not None:
        product.images.clear()
        for idx, url in enumerate(image_urls):
            img = PlatformProductImage(
                product_id=product.id,
                vendor_id=vid,
                image_url=url,
                sort_order=idx,
                is_thumbnail=(idx == 0),
            )
            product.images.append(img)
        if image_urls:
            product.thumbnail_url = image_urls[0]
        else:
            product.thumbnail_url = None

    if variants_payload is not None:
        # Delete existing variants and re-insert
        await db.execute(delete(PlatformProductVariant).where(PlatformProductVariant.product_id == product.id))
        has_vars = len(variants_payload) > 0
        product.has_variants = has_vars
        if has_vars:
            product.stock_quantity = sum(v.stock_quantity for v in variants_payload)
            for idx, v in enumerate(variants_payload):
                var_sku = v.sku.strip() if (v.sku and v.sku.strip()) else f"{product.sku}-{idx+1}"
                var_record = PlatformProductVariant(
                    product_id=product.id,
                    vendor_id=vid,
                    name=v.name.strip(),
                    sku=var_sku,
                    price=v.price,
                    stock_quantity=v.stock_quantity,
                    images_json=json.dumps(v.images or []),
                    sort_order=v.sort_order if v.sort_order else idx,
                    is_active=v.is_active,
                )
                db.add(var_record)
    elif has_variants_payload is not None:
        product.has_variants = has_variants_payload

    await db.commit()

    # Reload product with variants
    stmt = (
        select(PlatformProduct)
        .where(PlatformProduct.id == product.id)
        .options(
            selectinload(PlatformProduct.category),
            selectinload(PlatformProduct.images),
            selectinload(PlatformProduct.variants),
        )
    )
    product = (await db.execute(stmt)).scalar_one()

    return ProductResponse(
        id=product.id,
        vendor_id=product.vendor_id,
        category_id=product.category_id,
        category_name=product.category.name if product.category else None,
        name=product.name,
        slug=product.slug,
        description=product.description,
        regular_price=product.regular_price,
        sale_price=product.sale_price,
        sku=product.sku,
        stock_quantity=product.stock_quantity,
        status=product.status,
        is_featured=product.is_featured,
        has_variants=product.has_variants,
        thumbnail_url=product.thumbnail_url,
        images=[
            ProductImageItem(
                id=img.id,
                image_url=img.image_url,
                sort_order=img.sort_order,
                is_thumbnail=img.is_thumbnail,
            ) for img in sorted(product.images, key=lambda x: x.sort_order)
        ],
        variants=serialize_variants(product.variants or []),
        created_at=product.created_at,
    )


@router.delete("/products/{product_id}")
async def delete_vendor_product(
    product_id: uuid.UUID,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete product owned by the authenticated vendor."""
    vid = current.vendor.id
    stmt = select(PlatformProduct).where(PlatformProduct.id == product_id, PlatformProduct.vendor_id == vid)
    product = (await db.execute(stmt)).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or access denied")

    await db.delete(product)
    storage_stmt = select(PlatformStorageUsage).where(PlatformStorageUsage.vendor_id == vid)
    storage = (await db.execute(storage_stmt)).scalar_one_or_none()
    if storage and storage.product_count > 0:
        storage.product_count -= 1
    await db.commit()
    return {"message": "Product deleted successfully"}


# ──────────────────────────────────────────────
# 5. Banner Management
# ──────────────────────────────────────────────
@router.get("/banners", response_model=List[BannerResponse])
async def list_vendor_banners(
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """List promotional banners for the authenticated vendor's store and Android app."""
    stmt = (
        select(PlatformBanner)
        .where(PlatformBanner.vendor_id == current.vendor.id)
        .order_by(PlatformBanner.sort_order.asc())
    )
    return (await db.execute(stmt)).scalars().all()


@router.post("/banners", response_model=BannerResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor_banner(
    payload: BannerCreatePayload,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new promotional banner."""
    banner = PlatformBanner(
        vendor_id=current.vendor.id,
        title=payload.title.strip(),
        description=payload.description,
        promo_offer=payload.promo_offer,
        image_url=payload.image_url,
        link_url=payload.link_url,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return banner


@router.put("/banners/{banner_id}", response_model=BannerResponse)
async def update_vendor_banner(
    banner_id: uuid.UUID,
    payload: BannerUpdatePayload,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing banner."""
    stmt = select(PlatformBanner).where(PlatformBanner.id == banner_id, PlatformBanner.vendor_id == current.vendor.id)
    banner = (await db.execute(stmt)).scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found or access denied")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(banner, field, value)

    await db.commit()
    await db.refresh(banner)
    return banner


@router.delete("/banners/{banner_id}")
async def delete_vendor_banner(
    banner_id: uuid.UUID,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a banner."""
    stmt = select(PlatformBanner).where(PlatformBanner.id == banner_id, PlatformBanner.vendor_id == current.vendor.id)
    banner = (await db.execute(stmt)).scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found or access denied")

    await db.delete(banner)
    await db.commit()
    return {"message": "Banner deleted successfully"}


# ──────────────────────────────────────────────
# 6. Order Management
# ──────────────────────────────────────────────
@router.get("/orders", response_model=List[OrderResponse])
async def list_vendor_orders(
    status_filter: Optional[str] = None,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """List orders belonging only to this vendor."""
    stmt = (
        select(PlatformOrder)
        .where(PlatformOrder.vendor_id == current.vendor.id)
        .options(selectinload(PlatformOrder.items))
        .order_by(desc(PlatformOrder.created_at))
    )
    if status_filter:
        stmt = stmt.where(PlatformOrder.order_status == status_filter)

    orders = (await db.execute(stmt)).scalars().all()
    output = []
    for o in orders:
        output.append(OrderResponse(
            id=o.id,
            vendor_id=o.vendor_id,
            order_number=o.order_number,
            customer_name=o.customer_name,
            customer_phone=o.customer_phone,
            customer_email=o.customer_email,
            shipping_address=o.shipping_address,
            total_amount=o.total_amount,
            payment_method=o.payment_method,
            payment_status=o.payment_status,
            order_status=o.order_status,
            notes=o.notes,
            created_at=o.created_at,
            items=[
                OrderItemResponse(
                    id=it.id,
                    product_id=it.product_id,
                    product_name=it.product_name,
                    product_sku=it.product_sku,
                    price=it.price,
                    quantity=it.quantity,
                    total=it.total,
                ) for it in o.items
            ]
        ))
    return output


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_vendor_order_detail(
    order_id: uuid.UUID,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """View details of a specific order belonging to this vendor."""
    stmt = (
        select(PlatformOrder)
        .where(PlatformOrder.id == order_id, PlatformOrder.vendor_id == current.vendor.id)
        .options(selectinload(PlatformOrder.items))
    )
    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or access denied")

    return OrderResponse(
        id=order.id,
        vendor_id=order.vendor_id,
        order_number=order.order_number,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        customer_email=order.customer_email,
        shipping_address=order.shipping_address,
        total_amount=order.total_amount,
        payment_method=order.payment_method,
        payment_status=order.payment_status,
        order_status=order.order_status,
        notes=order.notes,
        created_at=order.created_at,
        items=[
            OrderItemResponse(
                id=it.id,
                product_id=it.product_id,
                product_name=it.product_name,
                product_sku=it.product_sku,
                price=it.price,
                quantity=it.quantity,
                total=it.total,
            ) for it in order.items
        ]
    )


@router.patch("/orders/{order_id}/status")
async def update_vendor_order_status(
    order_id: uuid.UUID,
    payload: OrderStatusUpdateRequest,
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update fulfillment or payment status of vendor's order."""
    stmt = select(PlatformOrder).where(PlatformOrder.id == order_id, PlatformOrder.vendor_id == current.vendor.id)
    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found or access denied")

    if payload.order_status:
        order.order_status = payload.order_status
    if payload.payment_status:
        order.payment_status = payload.payment_status

    await db.commit()
    return {"message": "Order status updated", "order_status": order.order_status, "payment_status": order.payment_status}


# ──────────────────────────────────────────────
# 7. Customer Directory
# ──────────────────────────────────────────────
@router.get("/customers", response_model=List[CustomerResponse])
async def list_vendor_customers(
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """List customer directory for the authenticated vendor."""
    stmt = (
        select(PlatformCustomer)
        .where(PlatformCustomer.vendor_id == current.vendor.id)
        .order_by(desc(PlatformCustomer.total_orders))
    )
    return (await db.execute(stmt)).scalars().all()


# ──────────────────────────────────────────────
# 8. Media Upload & Quota Tracking
# ──────────────────────────────────────────────
@router.post("/upload")
async def upload_vendor_asset(
    file: UploadFile = File(...),
    folder: str = Form("products"),
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Upload media file to Cloud CDN storage and track vendor storage usage."""
    vid = current.vendor.id
    contents = await file.read()
    file_size = len(contents)

    # Check quota
    storage_stmt = select(PlatformStorageUsage).where(PlatformStorageUsage.vendor_id == vid)
    storage = (await db.execute(storage_stmt)).scalar_one_or_none()
    if storage and (storage.total_bytes_used + file_size) > storage.limit_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Storage quota exceeded. Your current limit is {round(storage.limit_bytes / (1024*1024), 2)} MB. Please upgrade or request extra storage."
        )

    # Upload to Bunny Storage
    result = await bunny_storage.upload_file(
        vendor_id=str(vid),
        file_bytes=contents,
        filename=file.filename or "image.jpg",
        folder=folder,
    )

    # Update storage usage in Supabase
    if storage:
        storage.total_bytes_used += file_size
        storage.image_bytes_used += file_size
        storage.last_calculated_at = datetime.now(timezone.utc)
        await db.commit()

    return {
        "url": result["url"],
        "size_bytes": file_size,
        "filename": result["filename"],
    }


# ──────────────────────────────────────────────
# 9. Subscription & Add-ons
# ──────────────────────────────────────────────
@router.get("/subscription")
async def get_vendor_subscription_info(
    current: CurrentVendor = Depends(require_vendor_admin),
    db: AsyncSession = Depends(get_db),
):
    """Fetch current membership tier and available add-on services."""
    vid = current.vendor.id

    sub_stmt = (
        select(PlatformSubscription)
        .where(PlatformSubscription.vendor_id == vid)
        .options(selectinload(PlatformSubscription.plan))
        .order_by(PlatformSubscription.expires_at.desc())
    )
    sub = (await db.execute(sub_stmt)).scalar_one_or_none()

    addons_stmt = select(PlatformAddon).where(PlatformAddon.is_active == True)
    addons = (await db.execute(addons_stmt)).scalars().all()

    my_addons_stmt = (
        select(PlatformVendorAddon)
        .where(PlatformVendorAddon.vendor_id == vid)
        .options(selectinload(PlatformVendorAddon.addon))
    )
    my_addons = (await db.execute(my_addons_stmt)).scalars().all()

    return {
        "subscription": sub,
        "available_addons": addons,
        "active_addons": my_addons,
        "storage": current.vendor.storage_usage,
    }

