"""
Digital Growth Studio — Vendor Cloud Storage & Space Accounting Service
Accurately accounts for and deducts every byte consumed by a vendor:
1. Media & Image Storage: Product photos, variant images, promotional banners, and CDN files.
2. Database Records Storage: Products, HTML descriptions, variants, customer profiles,
   orders, line items, store analytics events, categories, and policies.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform.vendor import (
    PlatformVendor,
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

# Constants for standard asset and database record sizing (bytes)
DEFAULT_PRODUCT_IMAGE_BYTES = 358400   # ~350 KB per high-resolution product image
DEFAULT_BANNER_IMAGE_BYTES = 512000    # ~500 KB per desktop/mobile banner image
PRODUCT_ROW_OVERHEAD_BYTES = 350       # PostgreSQL row overhead + indexes
VARIANT_ROW_OVERHEAD_BYTES = 180       # PostgreSQL row overhead + indexes
CUSTOMER_ROW_OVERHEAD_BYTES = 320      # Customer record & shipping address overhead
ORDER_ROW_OVERHEAD_BYTES = 600         # Order headers, transaction & status history
ORDER_ITEM_ROW_OVERHEAD_BYTES = 220    # Order line items
STORE_EVENT_ROW_OVERHEAD_BYTES = 120   # Tracking analytics log event
CATEGORY_ROW_OVERHEAD_BYTES = 200      # Category name & slug overhead


async def calculate_vendor_storage_metrics(db: AsyncSession, vendor_id: uuid.UUID) -> Dict[str, Any]:
    """
    Computes real-time byte breakdown of media assets and database table rows
    accumulated by the specified vendor.
    """
    vid = vendor_id

    # 1. Product Images
    imgs = (await db.execute(
        select(PlatformProductImage).where(PlatformProductImage.vendor_id == vid)
    )).scalars().all()
    img_bytes = sum(img.file_size_bytes if (img.file_size_bytes and img.file_size_bytes > 0) else DEFAULT_PRODUCT_IMAGE_BYTES for img in imgs)

    # 2. Promotional Banners
    banners = (await db.execute(
        select(PlatformBanner).where(PlatformBanner.vendor_id == vid)
    )).scalars().all()
    banner_bytes = len(banners) * DEFAULT_BANNER_IMAGE_BYTES

    # 3. Product Catalog DB Footprint
    p_count = (await db.execute(
        select(func.count(PlatformProduct.id)).where(PlatformProduct.vendor_id == vid)
    )).scalar() or 0

    p_content_bytes = (await db.execute(select(func.sum(
        func.length(func.coalesce(PlatformProduct.name, '')) +
        func.length(func.coalesce(PlatformProduct.description, '')) +
        func.length(func.coalesce(PlatformProduct.slug, '')) +
        func.length(func.coalesce(PlatformProduct.sku, '')) +
        PRODUCT_ROW_OVERHEAD_BYTES
    )).where(PlatformProduct.vendor_id == vid))).scalar() or 0

    var_count = (await db.execute(
        select(func.count(PlatformProductVariant.id)).where(PlatformProductVariant.vendor_id == vid)
    )).scalar() or 0

    var_content_bytes = (await db.execute(select(func.sum(
        func.length(func.coalesce(PlatformProductVariant.name, '')) +
        func.length(func.coalesce(PlatformProductVariant.sku, '')) +
        func.length(func.coalesce(PlatformProductVariant.images_json, '')) +
        VARIANT_ROW_OVERHEAD_BYTES
    )).where(PlatformProductVariant.vendor_id == vid))).scalar() or 0

    cat_count = (await db.execute(
        select(func.count(PlatformCategory.id)).where(PlatformCategory.vendor_id == vid)
    )).scalar() or 0
    cat_bytes = cat_count * CATEGORY_ROW_OVERHEAD_BYTES

    # 4. Customer Directory DB Footprint
    c_count = (await db.execute(
        select(func.count(PlatformCustomer.id)).where(PlatformCustomer.vendor_id == vid)
    )).scalar() or 0

    cust_content_bytes = (await db.execute(select(func.sum(
        func.length(func.coalesce(PlatformCustomer.name, '')) +
        func.length(func.coalesce(PlatformCustomer.email, '')) +
        func.length(func.coalesce(PlatformCustomer.phone, '')) +
        CUSTOMER_ROW_OVERHEAD_BYTES
    )).where(PlatformCustomer.vendor_id == vid))).scalar() or 0

    # 5. Orders & Transactions DB Footprint
    o_count = (await db.execute(
        select(func.count(PlatformOrder.id)).where(PlatformOrder.vendor_id == vid)
    )).scalar() or 0

    order_content_bytes = (await db.execute(select(func.sum(
        func.length(func.coalesce(PlatformOrder.order_number, '')) +
        func.length(func.coalesce(PlatformOrder.customer_name, '')) +
        func.length(func.coalesce(PlatformOrder.customer_email, '')) +
        func.length(func.coalesce(PlatformOrder.shipping_address, '')) +
        func.length(func.coalesce(PlatformOrder.notes, '')) +
        ORDER_ROW_OVERHEAD_BYTES
    )).where(PlatformOrder.vendor_id == vid))).scalar() or 0

    order_items_count = (await db.execute(select(func.count(PlatformOrderItem.id)).where(
        PlatformOrderItem.order_id.in_(
            select(PlatformOrder.id).where(PlatformOrder.vendor_id == vid)
        )
    ))).scalar() or 0
    order_items_bytes = order_items_count * ORDER_ITEM_ROW_OVERHEAD_BYTES

    # 6. Store Tracking Events Footprint
    events_bytes = (await db.execute(select(func.sum(
        func.length(func.coalesce(PlatformStoreEvent.event_type, '')) +
        func.length(func.coalesce(PlatformStoreEvent.product_name, '')) +
        func.length(func.coalesce(PlatformStoreEvent.url_path, '')) +
        STORE_EVENT_ROW_OVERHEAD_BYTES
    )).where(PlatformStoreEvent.vendor_id == vid))).scalar() or 0

    # Aggregate
    media_bytes = int(img_bytes + banner_bytes)
    database_bytes = int(
        p_content_bytes +
        var_content_bytes +
        cat_bytes +
        cust_content_bytes +
        order_content_bytes +
        order_items_bytes +
        events_bytes
    )
    total_bytes = media_bytes + database_bytes

    return {
        "media_bytes": media_bytes,
        "database_bytes": database_bytes,
        "total_bytes": total_bytes,
        "product_count": p_count,
        "variant_count": var_count,
        "image_count": len(imgs),
        "banner_count": len(banners),
        "customer_count": c_count,
        "order_count": o_count,
    }


async def recalculate_and_save_vendor_storage(
    db: AsyncSession,
    vendor_id: uuid.UUID,
    commit: bool = True
) -> PlatformStorageUsage:
    """
    Recalculates vendor storage usage across all data and media,
    persists the result to platform_storage_usage, and returns the updated model.
    """
    metrics = await calculate_vendor_storage_metrics(db, vendor_id)

    st_stmt = select(PlatformStorageUsage).where(PlatformStorageUsage.vendor_id == vendor_id)
    storage = (await db.execute(st_stmt)).scalar_one_or_none()

    if not storage:
        storage = PlatformStorageUsage(
            vendor_id=vendor_id,
            total_bytes_used=metrics["total_bytes"],
            image_bytes_used=metrics["media_bytes"],
            product_count=metrics["product_count"],
            limit_bytes=1073741824,  # Default 1 GB (1024 MB)
            last_calculated_at=datetime.now(timezone.utc)
        )
        db.add(storage)
    else:
        storage.total_bytes_used = metrics["total_bytes"]
        storage.image_bytes_used = metrics["media_bytes"]
        storage.product_count = metrics["product_count"]
        storage.last_calculated_at = datetime.now(timezone.utc)

    if commit:
        await db.commit()
        await db.refresh(storage)

    return storage


async def recalculate_all_vendors_storage(db: AsyncSession) -> Dict[str, Any]:
    """
    Batch recalculates storage footprint for all vendors in the system.
    """
    vendors = (await db.execute(select(PlatformVendor))).scalars().all()
    results = {}
    for v in vendors:
        st = await recalculate_and_save_vendor_storage(db, v.id, commit=False)
        results[v.vendor_code] = {
            "total_bytes": st.total_bytes_used,
            "total_mb": round(st.total_bytes_used / (1024 * 1024), 2),
            "limit_mb": round(st.limit_bytes / (1024 * 1024), 2),
            "product_count": st.product_count
        }
    await db.commit()
    return results

