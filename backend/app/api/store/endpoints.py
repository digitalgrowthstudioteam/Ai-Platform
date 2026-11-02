"""
Digital Growth Studio — Public Storefront & Android App API Endpoints
All routes dynamically resolve by store slug and expose only sanitized customer-facing data.
"""
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.platform.vendor import PlatformStore, PlatformVendor, PlatformVendorAppConfig
from app.models.platform.catalog import PlatformCategory, PlatformProduct, PlatformBanner
from app.models.platform.order import PlatformCustomer, PlatformOrder, PlatformOrderItem
from app.schemas.platform.store_public import (
    PublicStoreConfigResponse,
    PublicProductItem,
    PublicCategoryItem,
    PublicBannerItem,
    PublicProductImage,
)
from app.schemas.platform.order import PublicOrderCreateRequest, OrderResponse, OrderItemResponse

router = APIRouter(prefix="/store", tags=["Public Store & Android App"])


async def resolve_active_store(slug: str, db: AsyncSession) -> PlatformStore:
    """Helper to resolve active store and verify vendor is eligible/active."""
    stmt = (
        select(PlatformStore)
        .where(PlatformStore.store_slug == slug.lower().strip())
        .options(
            selectinload(PlatformStore.vendor).selectinload(PlatformVendor.app_config)
        )
    )
    store = (await db.execute(stmt)).scalar_one_or_none()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Store '{slug}' not found"
        )
    if store.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This store is currently unavailable"
        )
    if store.vendor.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Store operations are currently suspended"
        )
    return store


@router.get("/{slug}/config", response_model=PublicStoreConfigResponse)
async def get_store_config(slug: str, db: AsyncSession = Depends(get_db)):
    """Fetch live store branding and payment options for the Android app and web storefront."""
    store = await resolve_active_store(slug, db)
    app_cfg = store.vendor.app_config

    return PublicStoreConfigResponse(
        store_name=store.store_name,
        store_slug=store.store_slug,
        subdomain=store.subdomain,
        description=store.description,
        primary_color=store.primary_color,
        secondary_color=store.secondary_color,
        logo_url=store.logo_url,
        banner_url=store.banner_url,
        contact_email=store.contact_email,
        contact_phone=store.contact_phone,
        business_address=store.business_address,
        opening_hours=store.opening_hours,
        cod_enabled=store.cod_enabled,
        razorpay_enabled=store.razorpay_enabled,
        razorpay_key_id=store.razorpay_key_id if store.razorpay_enabled else None,
        app_version=app_cfg.app_version if app_cfg else "1.0.0",
        shipping_enabled=getattr(store, "shipping_enabled", True),
        shipping_charge=getattr(store, "shipping_charge", 0.0),
        free_shipping_min_order=getattr(store, "free_shipping_min_order", 999.0),
        cod_charge=getattr(store, "cod_charge", 0.0),
        estimated_delivery_days=getattr(store, "estimated_delivery_days", "3-5 Business Days"),
        allowed_countries=getattr(store, "allowed_countries", "India"),
        serviceable_pincodes_type=getattr(store, "serviceable_pincodes_type", "all"),
        serviceable_pincodes=getattr(store, "serviceable_pincodes", None),
    )


@router.get("/{slug}/categories", response_model=List[PublicCategoryItem])
async def get_store_categories(slug: str, db: AsyncSession = Depends(get_db)):
    """Fetch active categories for this vendor's store/app."""
    store = await resolve_active_store(slug, db)
    stmt = (
        select(PlatformCategory)
        .where(
            PlatformCategory.vendor_id == store.vendor_id,
            PlatformCategory.is_active == True,
        )
        .order_by(PlatformCategory.sort_order.asc(), PlatformCategory.name.asc())
    )
    categories = (await db.execute(stmt)).scalars().all()
    return [
        PublicCategoryItem(
            id=c.id,
            name=c.name,
            slug=c.slug,
            image_url=c.image_url,
            sort_order=c.sort_order,
        ) for c in categories
    ]


@router.get("/{slug}/banners", response_model=List[PublicBannerItem])
async def get_store_banners(slug: str, db: AsyncSession = Depends(get_db)):
    """Fetch active banners for this vendor's store/app."""
    store = await resolve_active_store(slug, db)
    stmt = (
        select(PlatformBanner)
        .where(
            PlatformBanner.vendor_id == store.vendor_id,
            PlatformBanner.is_active == True,
        )
        .order_by(PlatformBanner.sort_order.asc())
    )
    banners = (await db.execute(stmt)).scalars().all()
    return [
        PublicBannerItem(
            id=b.id,
            title=b.title,
            description=b.description,
            promo_offer=b.promo_offer,
            image_url=b.image_url,
            link_url=b.link_url,
            sort_order=b.sort_order,
        ) for b in banners
    ]


@router.get("/{slug}/products", response_model=List[PublicProductItem])
async def get_store_products(
    slug: str,
    category_id: Optional[uuid.UUID] = None,
    featured_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Fetch active products for this vendor."""
    store = await resolve_active_store(slug, db)
    stmt = (
        select(PlatformProduct)
        .where(
            PlatformProduct.vendor_id == store.vendor_id,
            PlatformProduct.status.in_(["active", "out_of_stock"]),
        )
        .options(
            selectinload(PlatformProduct.category),
            selectinload(PlatformProduct.images),
        )
        .order_by(desc(PlatformProduct.is_featured), desc(PlatformProduct.created_at))
    )
    if category_id:
        stmt = stmt.where(PlatformProduct.category_id == category_id)
    if featured_only:
        stmt = stmt.where(PlatformProduct.is_featured == True)

    products = (await db.execute(stmt)).scalars().all()
    output = []
    for p in products:
        effective_price = p.sale_price if (p.sale_price and p.sale_price > 0) else p.regular_price
        output.append(PublicProductItem(
            id=p.id,
            name=p.name,
            slug=p.slug,
            description=p.description,
            regular_price=p.regular_price,
            sale_price=p.sale_price,
            effective_price=effective_price,
            sku=p.sku,
            stock_quantity=p.stock_quantity,
            in_stock=(p.stock_quantity > 0 and p.status == "active"),
            category_id=p.category_id,
            category_name=p.category.name if p.category else None,
            thumbnail_url=p.thumbnail_url,
            images=[
                PublicProductImage(
                    image_url=img.image_url,
                    sort_order=img.sort_order,
                    is_thumbnail=img.is_thumbnail,
                ) for img in sorted(p.images, key=lambda x: x.sort_order)
            ],
            is_featured=p.is_featured,
        ))
    return output


@router.get("/{slug}/products/{product_id}", response_model=PublicProductItem)
async def get_store_product_detail(
    slug: str,
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Fetch details of a single product."""
    store = await resolve_active_store(slug, db)
    stmt = (
        select(PlatformProduct)
        .where(
            PlatformProduct.id == product_id,
            PlatformProduct.vendor_id == store.vendor_id,
        )
        .options(
            selectinload(PlatformProduct.category),
            selectinload(PlatformProduct.images),
        )
    )
    p = (await db.execute(stmt)).scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    effective_price = p.sale_price if (p.sale_price and p.sale_price > 0) else p.regular_price
    return PublicProductItem(
        id=p.id,
        name=p.name,
        slug=p.slug,
        description=p.description,
        regular_price=p.regular_price,
        sale_price=p.sale_price,
        effective_price=effective_price,
        sku=p.sku,
        stock_quantity=p.stock_quantity,
        in_stock=(p.stock_quantity > 0 and p.status == "active"),
        category_id=p.category_id,
        category_name=p.category.name if p.category else None,
        thumbnail_url=p.thumbnail_url,
        images=[
            PublicProductImage(
                image_url=img.image_url,
                sort_order=img.sort_order,
                is_thumbnail=img.is_thumbnail,
            ) for img in sorted(p.images, key=lambda x: x.sort_order)
        ],
        is_featured=p.is_featured,
    )


@router.post("/{slug}/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_store_order(
    slug: str,
    payload: PublicOrderCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Place customer order via Android App or Web Storefront.
    Prices are securely calculated from the database, NEVER trusted from client input.
    """
    store = await resolve_active_store(slug, db)
    vid = store.vendor_id

    # 1. Resolve or create customer under this vendor
    phone = payload.customer_phone.strip()
    cust_stmt = select(PlatformCustomer).where(
        PlatformCustomer.vendor_id == vid,
        PlatformCustomer.phone == phone,
    )
    customer = (await db.execute(cust_stmt)).scalar_one_or_none()
    if not customer:
        customer = PlatformCustomer(
            vendor_id=vid,
            name=payload.customer_name.strip(),
            phone=phone,
            email=payload.customer_email.strip() if payload.customer_email else None,
            total_orders=0,
            total_spent=0.0,
        )
        db.add(customer)
        await db.flush()

    # 2. Validate products and calculate prices strictly from database
    calculated_total = 0.0
    order_items_to_create = []

    for item in payload.items:
        p_stmt = select(PlatformProduct).where(
            PlatformProduct.id == item.product_id,
            PlatformProduct.vendor_id == vid,
        )
        product = (await db.execute(p_stmt)).scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=400,
                detail=f"Product '{item.product_id}' is not available in this store"
            )
        if product.status != "active" or product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Product '{product.name}' is out of stock or insufficient quantity"
            )

        unit_price = product.sale_price if (product.sale_price and product.sale_price > 0) else product.regular_price
        line_total = unit_price * item.quantity
        calculated_total += line_total

        # Deduct stock
        product.stock_quantity -= item.quantity
        if product.stock_quantity <= 0:
            product.status = "out_of_stock"

        order_items_to_create.append({
            "product_id": product.id,
            "product_name": product.name,
            "product_sku": product.sku,
            "price": unit_price,
            "quantity": item.quantity,
            "total": line_total,
        })

    # 3. Generate unique order number: ORD-{VENDOR_CODE}-{RANDOM}
    order_number = f"ORD-{store.vendor.vendor_code}-{uuid.uuid4().hex[:6].upper()}"

    order = PlatformOrder(
        vendor_id=vid,
        customer_id=customer.id,
        order_number=order_number,
        customer_name=payload.customer_name.strip(),
        customer_phone=phone,
        customer_email=payload.customer_email.strip() if payload.customer_email else None,
        shipping_address=payload.shipping_address.strip(),
        total_amount=calculated_total,
        payment_method=payload.payment_method.upper(),
        payment_status="PENDING",
        order_status="NEW",
        notes=payload.notes,
    )
    db.add(order)
    await db.flush()

    saved_items = []
    for it_data in order_items_to_create:
        line_item = PlatformOrderItem(
            order_id=order.id,
            vendor_id=vid,
            product_id=it_data["product_id"],
            product_name=it_data["product_name"],
            product_sku=it_data["product_sku"],
            price=it_data["price"],
            quantity=it_data["quantity"],
            total=it_data["total"],
        )
        db.add(line_item)
        saved_items.append(line_item)

    # 4. Update customer stats
    customer.total_orders += 1
    customer.total_spent += calculated_total
    customer.last_order_at = datetime.now(timezone.utc)

    await db.commit()

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
            ) for it in saved_items
        ]
    )


@router.get("/{slug}/orders/{order_id}", response_model=OrderResponse)
async def get_store_order_status(
    slug: str,
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Check order status for customers / Android app."""
    store = await resolve_active_store(slug, db)
    stmt = (
        select(PlatformOrder)
        .where(
            PlatformOrder.id == order_id,
            PlatformOrder.vendor_id == store.vendor_id,
        )
        .options(selectinload(PlatformOrder.items))
    )
    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

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

