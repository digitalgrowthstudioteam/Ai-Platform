"""
Digital Growth Studio — Public Storefront & Android App API Endpoints
All routes dynamically resolve by store slug and expose only sanitized customer-facing data.
"""
import uuid
import json
import secrets
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.core.platform_auth import hash_password, verify_password
from app.models.platform.vendor import PlatformStore, PlatformVendor, PlatformVendorAppConfig
from app.models.platform.catalog import PlatformCategory, PlatformProduct, PlatformProductVariant, PlatformBanner
from app.models.platform.order import PlatformCustomer, PlatformOrder, PlatformOrderItem
from app.schemas.platform.catalog import ProductVariantResponse
from app.schemas.platform.store_public import (
    PublicStoreConfigResponse,
    PublicStorePoliciesResponse,
    PublicProductItem,
    PublicCategoryItem,
    PublicBannerItem,
    PublicProductImage,
    PublicStoreEventCreate,
    CustomerAuthRequest,
    CustomerAuthResponse,
    CustomerProfileResponse,
)
from app.schemas.platform.order import PublicOrderCreateRequest, OrderResponse, OrderItemResponse

router = APIRouter(prefix="/store", tags=["Public Store & Android App"])


async def resolve_active_store(slug: str, db: AsyncSession) -> PlatformStore:
    """Helper to resolve active store by store_slug, custom_domain, or subdomain."""
    clean_identifier = slug.lower().strip().replace("https://", "").replace("http://", "").split("/")[0]
    clean_no_www = clean_identifier.replace("www.", "")

    stmt = (
        select(PlatformStore)
        .where(
            or_(
                PlatformStore.store_slug == clean_identifier,
                and_(PlatformStore.custom_domain == clean_identifier, PlatformStore.custom_domain_enabled == True),
                and_(PlatformStore.custom_domain == clean_no_www, PlatformStore.custom_domain_enabled == True),
                PlatformStore.subdomain == clean_identifier,
            )
        )
        .options(
            selectinload(PlatformStore.vendor).selectinload(PlatformVendor.app_config),
            selectinload(PlatformStore.vendor).selectinload(PlatformVendor.profile),
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
    """Fetch live store branding, policies, and payment options for the Android app and web storefront."""
    store = await resolve_active_store(slug, db)
    app_cfg = store.vendor.app_config
    vendor_profile = getattr(store.vendor, "profile", None)

    from app.services.platform.policies import get_store_policies
    policies = get_store_policies(store, vendor_profile)

    return PublicStoreConfigResponse(
        store_name=store.store_name,
        store_slug=store.store_slug,
        subdomain=store.subdomain,
        description=store.description,
        primary_color=store.primary_color,
        secondary_color=store.secondary_color,
        logo_url=store.logo_url,
        banner_url=store.banner_url,
        contact_email=store.contact_email or (vendor_profile.email if vendor_profile else None),
        contact_phone=store.contact_phone or (vendor_profile.business_phone or vendor_profile.phone if vendor_profile else None),
        whatsapp_number=(vendor_profile.whatsapp_number if vendor_profile else None) or store.contact_phone,
        business_phone=(vendor_profile.business_phone if vendor_profile else None) or store.contact_phone,
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
        terms_and_conditions=policies["terms_and_conditions"],
        privacy_policy=policies["privacy_policy"],
        shipping_policy=policies["shipping_policy"],
        refund_policy=policies["refund_policy"],
        meta_pixel_id=getattr(store, "meta_pixel_id", None),
        gtm_id=getattr(store, "gtm_id", None),
        ga4_id=getattr(store, "ga4_id", None),
        tracking_enabled=getattr(store, "tracking_enabled", True),
        custom_domain=getattr(store, "custom_domain", None),
    )


@router.post("/{slug}/events")
async def track_public_store_event(
    slug: str,
    payload: PublicStoreEventCreate,
    db: AsyncSession = Depends(get_db),
):
    """Log an analytics event (visit, product view, add to cart, checkout, whatsapp click)."""
    from app.models.platform.vendor import PlatformStoreEvent
    store = await resolve_active_store(slug, db)
    prod_uuid = None
    if payload.product_id:
        try:
            prod_uuid = uuid.UUID(payload.product_id)
        except Exception:
            prod_uuid = None

    event = PlatformStoreEvent(
        vendor_id=store.vendor_id,
        event_type=payload.event_type,
        product_id=prod_uuid,
        product_name=payload.product_name,
        value=payload.value or 0.0,
        source=payload.source or "Direct",
        device=payload.device or "Mobile",
        visitor_id=payload.visitor_id,
        city=payload.city,
        url_path=payload.url_path,
    )
    db.add(event)
    await db.commit()
    return {"status": "ok", "success": True, "event": payload.event_type}


@router.get("/{slug}/policies", response_model=PublicStorePoliciesResponse)
async def get_public_store_policies(slug: str, db: AsyncSession = Depends(get_db)):
    """Fetch complete legal policies for this vendor's store and mobile app."""
    store = await resolve_active_store(slug, db)
    vendor_profile = getattr(store.vendor, "profile", None)

    from app.services.platform.policies import get_store_policies
    policies = get_store_policies(store, vendor_profile)

    return PublicStorePoliciesResponse(
        store_name=store.store_name,
        store_slug=store.store_slug,
        terms_and_conditions=policies["terms_and_conditions"],
        privacy_policy=policies["privacy_policy"],
        shipping_policy=policies["shipping_policy"],
        refund_policy=policies["refund_policy"],
        meta_pixel_id=getattr(store, "meta_pixel_id", None),
        gtm_id=getattr(store, "gtm_id", None),
        ga4_id=getattr(store, "ga4_id", None),
        tracking_enabled=getattr(store, "tracking_enabled", True),
        custom_domain=getattr(store, "custom_domain", None),
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


def serialize_public_variants(variants: List[PlatformProductVariant]) -> List[ProductVariantResponse]:
    out = []
    for v in sorted(variants, key=lambda x: x.sort_order):
        if not v.is_active:
            continue
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


@router.get("/{slug}/products", response_model=List[PublicProductItem])
async def get_store_products(
    slug: str,
    category_id: Optional[uuid.UUID] = None,
    featured_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Fetch active products for this vendor."""
    store = await resolve_active_store(slug, db)

    # Subscription Enforcement:
    # If recurring monthly subscription is not paid / expired / suspended,
    # stop showing up products on their app and storefront!
    from app.models.platform.subscription import PlatformSubscription
    sub_stmt = (
        select(PlatformSubscription)
        .where(PlatformSubscription.vendor_id == store.vendor_id)
        .order_by(desc(PlatformSubscription.created_at))
    )
    sub = (await db.execute(sub_stmt)).scalars().first()
    if sub and sub.status.upper() in ["EXPIRED", "PAST_DUE", "CANCELLED", "SUSPENDED", "UNPAID"]:
        return []

    stmt = (
        select(PlatformProduct)
        .where(
            PlatformProduct.vendor_id == store.vendor_id,
            PlatformProduct.status.in_(["active", "published", "out_of_stock"]),
        )
        .options(
            selectinload(PlatformProduct.category),
            selectinload(PlatformProduct.images),
            selectinload(PlatformProduct.variants),
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
            has_variants=p.has_variants,
            variants=serialize_public_variants(p.variants or []),
            is_featured=p.is_featured,
        ))
    return output


@router.get("/{slug}/products/{product_id}", response_model=PublicProductItem)
async def get_store_product_detail(
    slug: str,
    product_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Fetch details of a single product by UUID or slug."""
    store = await resolve_active_store(slug, db)

    from app.models.platform.subscription import PlatformSubscription
    sub_stmt = (
        select(PlatformSubscription)
        .where(PlatformSubscription.vendor_id == store.vendor_id)
        .order_by(desc(PlatformSubscription.created_at))
    )
    sub = (await db.execute(sub_stmt)).scalars().first()
    if sub and sub.status.upper() in ["EXPIRED", "PAST_DUE", "CANCELLED", "SUSPENDED", "UNPAID"]:
        raise HTTPException(status_code=403, detail="Store catalog is paused due to inactive subscription.")

    prod_uuid = None
    try:
        prod_uuid = uuid.UUID(product_id)
    except Exception:
        pass

    if prod_uuid:
        condition = (PlatformProduct.id == prod_uuid)
    else:
        condition = (PlatformProduct.slug == product_id)

    stmt = (
        select(PlatformProduct)
        .where(
            condition,
            PlatformProduct.vendor_id == store.vendor_id,
        )
        .options(
            selectinload(PlatformProduct.category),
            selectinload(PlatformProduct.images),
            selectinload(PlatformProduct.variants),
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
        has_variants=p.has_variants,
        variants=serialize_public_variants(p.variants or []),
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
    else:
        if payload.customer_email and not customer.email:
            customer.email = payload.customer_email.strip()

    # 2. Validate products and calculate prices strictly from database
    calculated_total = 0.0
    order_items_to_create = []

    for item in payload.items:
        p_stmt = (
            select(PlatformProduct)
            .where(
                PlatformProduct.id == item.product_id,
                PlatformProduct.vendor_id == vid,
            )
            .options(selectinload(PlatformProduct.variants))
        )
        product = (await db.execute(p_stmt)).scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=400,
                detail=f"Product '{item.product_id}' is not available in this store"
            )
        if product.status != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Product '{product.name}' is inactive or unavailable"
            )

        unit_price = product.sale_price if (product.sale_price and product.sale_price > 0) else product.regular_price
        item_variant_name = item.variant_name
        item_sku = product.sku

        # If a specific variant was ordered, validate and deduct variant stock
        if item.variant_id:
            v_stmt = select(PlatformProductVariant).where(
                PlatformProductVariant.id == item.variant_id,
                PlatformProductVariant.product_id == product.id,
            )
            variant = (await db.execute(v_stmt)).scalar_one_or_none()
            if not variant:
                raise HTTPException(status_code=400, detail=f"Variant not found for product '{product.name}'")
            if variant.stock_quantity < item.quantity:
                raise HTTPException(status_code=400, detail=f"Variant '{variant.name}' of '{product.name}' has insufficient stock ({variant.stock_quantity} remaining)")
            
            variant.stock_quantity -= item.quantity
            item_variant_name = variant.name
            if variant.sku:
                item_sku = variant.sku
            if variant.price and variant.price > 0:
                unit_price = variant.price
        else:
            if product.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Product '{product.name}' is out of stock or insufficient quantity"
                )

        # Deduct total product stock
        product.stock_quantity = max(0, product.stock_quantity - item.quantity)
        if product.stock_quantity <= 0:
            product.status = "out_of_stock"

        line_total = unit_price * item.quantity
        calculated_total += line_total

        order_items_to_create.append({
            "product_id": product.id,
            "variant_id": item.variant_id,
            "variant_name": item_variant_name,
            "product_name": f"{product.name} ({item_variant_name})" if item_variant_name else product.name,
            "product_sku": item_sku,
            "price": unit_price,
            "quantity": item.quantity,
            "total": line_total,
        })

    # Apply vendor shipping policy and COD fees
    shipping_fee = 0.0
    if getattr(store, "shipping_enabled", True):
        free_min = getattr(store, "free_shipping_min_order", 0.0) or 0.0
        if free_min > 0 and calculated_total >= free_min:
            shipping_fee = 0.0
        else:
            shipping_fee = getattr(store, "shipping_charge", 0.0) or 0.0

    cod_fee = 0.0
    if payload.payment_method.upper() == "COD":
        cod_fee = getattr(store, "cod_charge", 0.0) or 0.0

    order_final_total = round(calculated_total + shipping_fee + cod_fee, 2)

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
        total_amount=order_final_total,
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
            variant_id=it_data.get("variant_id"),
            variant_name=it_data.get("variant_name"),
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
    customer.total_spent += order_final_total
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
        courier_name=order.courier_name,
        tracking_number=order.tracking_number,
        tracking_url=order.tracking_url,
        shipped_at=order.shipped_at,
        delivered_at=order.delivered_at,
        notes=order.notes,
        created_at=order.created_at,
        items=[
            OrderItemResponse(
                id=it.id,
                product_id=it.product_id,
                variant_id=it.variant_id,
                variant_name=it.variant_name,
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
    order_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Check order status for customers / Android app by UUID or Order Number."""
    store = await resolve_active_store(slug, db)
    parsed_uuid = None
    try:
        parsed_uuid = uuid.UUID(order_id)
    except ValueError:
        pass

    stmt = select(PlatformOrder).where(PlatformOrder.vendor_id == store.vendor_id)
    if parsed_uuid:
        stmt = stmt.where(or_(PlatformOrder.id == parsed_uuid, PlatformOrder.order_number == order_id))
    else:
        stmt = stmt.where(PlatformOrder.order_number == order_id)
    stmt = stmt.options(selectinload(PlatformOrder.items))
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
        courier_name=order.courier_name,
        tracking_number=order.tracking_number,
        tracking_url=order.tracking_url,
        shipped_at=order.shipped_at,
        delivered_at=order.delivered_at,
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


class ConfirmStorePaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


@router.post("/{slug}/orders/{order_id}/confirm-payment")
async def confirm_store_order_payment(
    slug: str,
    order_id: str,
    payload: ConfirmStorePaymentRequest,
    db: AsyncSession = Depends(get_db),
):
    """Confirm online payment for a customer order via Razorpay."""
    store = await resolve_active_store(slug, db)
    parsed_uuid = None
    try:
        parsed_uuid = uuid.UUID(order_id)
    except (ValueError, AttributeError):
        pass

    stmt = select(PlatformOrder).where(PlatformOrder.vendor_id == store.vendor_id)
    if parsed_uuid:
        stmt = stmt.where(or_(PlatformOrder.id == parsed_uuid, PlatformOrder.order_number == order_id))
    else:
        stmt = stmt.where(PlatformOrder.order_number == order_id)

    order = (await db.execute(stmt)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.payment_status = "PAID"
    existing_notes = order.notes or ""
    order.notes = f"{existing_notes} [Razorpay Paid: {payload.razorpay_payment_id}]".strip()
    await db.commit()
    await db.refresh(order)

    return {
        "status": "success",
        "payment_status": "PAID",
        "razorpay_payment_id": payload.razorpay_payment_id,
        "message": "Payment confirmed successfully"
    }


@router.get("/{slug}/customer-orders", response_model=List[OrderResponse])
async def get_customer_orders(
    slug: str,
    phone: str = Query(..., description="Customer mobile phone number"),
    db: AsyncSession = Depends(get_db),
):
    """Fetch all orders placed by a specific customer phone number under this vendor."""
    store = await resolve_active_store(slug, db)
    clean_phone = phone.strip()
    stmt = (
        select(PlatformOrder)
        .where(
            PlatformOrder.vendor_id == store.vendor_id,
            PlatformOrder.customer_phone == clean_phone,
        )
        .options(selectinload(PlatformOrder.items))
        .order_by(desc(PlatformOrder.created_at))
    )
    orders = (await db.execute(stmt)).scalars().all()
    output = []
    for order in orders:
        output.append(OrderResponse(
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
            courier_name=order.courier_name,
            tracking_number=order.tracking_number,
            tracking_url=order.tracking_url,
            shipped_at=order.shipped_at,
            delivered_at=order.delivered_at,
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
        ))
    return output


@router.post("/{slug}/customer/auth", response_model=CustomerAuthResponse)
async def customer_auth(
    slug: str,
    payload: CustomerAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """Customer authentication for store storefront: registration & sign in with mandatory email, phone, and password."""
    store = await resolve_active_store(slug, db)
    clean_phone = payload.phone.strip().replace(" ", "").replace("-", "")
    if len(clean_phone) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile phone number.")

    clean_email = payload.email.strip().lower() if payload.email else None
    clean_name = payload.name.strip() if payload.name else None
    provided_password = payload.password.strip() if payload.password else None

    # Check for existing customer record under this vendor
    stmt = select(PlatformCustomer).where(
        PlatformCustomer.vendor_id == store.vendor_id,
        PlatformCustomer.phone == clean_phone,
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()

    if payload.action == "register":
        # Mandatory fields validation
        if not clean_name or len(clean_name) < 2:
            raise HTTPException(status_code=400, detail="Your full name is mandatory to create an account.")

        if not clean_email or "@" not in clean_email or "." not in clean_email:
            raise HTTPException(status_code=400, detail="A valid email address is mandatory to create an account.")

        if not provided_password or len(provided_password) < 6:
            raise HTTPException(status_code=400, detail="Password creation is mandatory (minimum 6 characters).")

        hashed_pwd = hash_password(provided_password)

        if customer and customer.password_hash:
            raise HTTPException(
                status_code=400,
                detail="An account with this phone number already exists. Please switch to 'Sign In' and enter your password."
            )

        if not customer:
            customer = PlatformCustomer(
                vendor_id=store.vendor_id,
                name=clean_name,
                phone=clean_phone,
                email=clean_email,
                password_hash=hashed_pwd,
                total_orders=0,
                total_spent=0.0,
            )
            db.add(customer)
        else:
            # Upgrade existing customer record
            customer.name = clean_name
            customer.email = clean_email
            customer.password_hash = hashed_pwd

        await db.commit()
        await db.refresh(customer)

        token = secrets.token_urlsafe(24)
        return CustomerAuthResponse(
            success=True,
            message="Account created successfully!",
            customer=CustomerProfileResponse(
                id=customer.id,
                vendor_id=customer.vendor_id,
                name=customer.name,
                phone=customer.phone,
                email=customer.email,
                total_orders=customer.total_orders,
                total_spent=customer.total_spent,
            ),
            token=token,
        )

    elif payload.action in ("login", "otp_verify"):
        if not provided_password:
            raise HTTPException(status_code=400, detail="Password is mandatory to sign in.")

        if not customer:
            raise HTTPException(
                status_code=404,
                detail="No account found with this phone number. Please click 'Create Account' to sign up."
            )

        if customer.password_hash:
            if not verify_password(provided_password, customer.password_hash):
                raise HTTPException(
                    status_code=401,
                    detail="Incorrect password. Please verify your password and try again."
                )
        else:
            # If customer profile existed without password (e.g. from previous checkout), establish password on first login
            customer.password_hash = hash_password(provided_password)
            if clean_name and customer.name == "Valued Customer":
                customer.name = clean_name
            if clean_email and not customer.email:
                customer.email = clean_email
            await db.commit()
            await db.refresh(customer)

        token = secrets.token_urlsafe(24)
        return CustomerAuthResponse(
            success=True,
            message="Logged in successfully!",
            customer=CustomerProfileResponse(
                id=customer.id,
                vendor_id=customer.vendor_id,
                name=customer.name,
                phone=customer.phone,
                email=customer.email,
                total_orders=customer.total_orders,
                total_spent=customer.total_spent,
            ),
            token=token,
        )

    elif payload.action == "otp_request":
        return CustomerAuthResponse(
            success=True,
            message="Verification OTP sent to your phone number.",
            token=None,
        )

    raise HTTPException(status_code=400, detail="Invalid action requested.")

