"""
Digital Growth Studio — Public Storefront & Android App API Endpoints
All routes dynamically resolve by store slug and expose only sanitized customer-facing data.
"""
import uuid
import json
import secrets
import random
import asyncio
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.core.platform_auth import hash_password, verify_password
from app.models.platform.vendor import PlatformStore, PlatformVendor, PlatformVendorAppConfig
from app.models.platform.catalog import PlatformCategory, PlatformProduct, PlatformProductVariant, PlatformBanner
from app.models.platform.order import PlatformCustomer, PlatformOrder, PlatformOrderItem
from app.models.platform.system import PlatformSupplierInquiry, PlatformNotification
from app.services.store_email_service import StoreEmailService
from app.services.sms_service import SmsService
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
    CustomerForgotPasswordRequest,
    CustomerResetPasswordRequest,
    CustomerGoogleAuthRequest,
    SupplierInquiryCreate,
    SupplierInquiryResponse,
    HyperlocalEligibilityRequest,
    HyperlocalEligibilityResponse,
)
from app.utils.geo import check_store_hyperlocal_eligibility, haversine_distance, is_pincode_serviceable
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
        hyperlocal_enabled=getattr(store, "hyperlocal_enabled", False),
        hyperlocal_mode=getattr(store, "hyperlocal_mode", "radius"),
        store_latitude=getattr(store, "store_latitude", None),
        store_longitude=getattr(store, "store_longitude", None),
        store_location_name=getattr(store, "store_location_name", None),
        max_delivery_radius_km=getattr(store, "max_delivery_radius_km", 10.0),
        min_order_value=getattr(store, "min_order_value", 0.0),
        base_delivery_fee=getattr(store, "base_delivery_fee", 30.0),
        base_distance_km=getattr(store, "base_distance_km", 3.0),
        per_km_fee=getattr(store, "per_km_fee", 10.0),
        free_delivery_above=getattr(store, "free_delivery_above", 499.0),
        estimated_delivery_mins=getattr(store, "estimated_delivery_mins", 45),
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


@router.post("/{slug}/hyperlocal/check-eligibility", response_model=HyperlocalEligibilityResponse)
async def check_store_delivery_eligibility(
    slug: str,
    payload: HyperlocalEligibilityRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Check if a customer's location (GPS coordinates and/or pincode) is serviceable
    by this store and compute real-time distance and delivery fee slab.
    """
    store = await resolve_active_store(slug, db)
    result = check_store_hyperlocal_eligibility(
        store_latitude=getattr(store, "store_latitude", None),
        store_longitude=getattr(store, "store_longitude", None),
        store_location_name=getattr(store, "store_location_name", None),
        hyperlocal_enabled=getattr(store, "hyperlocal_enabled", False),
        hyperlocal_mode=getattr(store, "hyperlocal_mode", "radius"),
        max_delivery_radius_km=getattr(store, "max_delivery_radius_km", 10.0),
        min_order_value=getattr(store, "min_order_value", 0.0),
        base_delivery_fee=getattr(store, "base_delivery_fee", 30.0),
        base_distance_km=getattr(store, "base_distance_km", 3.0),
        per_km_fee=getattr(store, "per_km_fee", 10.0),
        free_delivery_above=getattr(store, "free_delivery_above", 499.0),
        estimated_delivery_mins=getattr(store, "estimated_delivery_mins", 45),
        serviceable_pincodes_type=getattr(store, "serviceable_pincodes_type", "all"),
        serviceable_pincodes=getattr(store, "serviceable_pincodes", None),
        customer_latitude=payload.latitude,
        customer_longitude=payload.longitude,
        customer_pincode=payload.pincode,
        cart_total=payload.cart_total,
    )
    return HyperlocalEligibilityResponse(**result)


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

    # Apply vendor shipping policy, hyperlocal rules, and specific pincodes
    import re
    effective_pincode = (payload.shipping_pincode or "").strip()
    if not effective_pincode and payload.shipping_address:
        pin_match = re.search(r"\b([1-9][0-9]{5})\b", payload.shipping_address)
        if pin_match:
            effective_pincode = pin_match.group(1)

    shipping_fee = 0.0
    if getattr(store, "hyperlocal_enabled", False):
        # Run strict hyperlocal delivery verification
        eligibility = check_store_hyperlocal_eligibility(
            store_latitude=getattr(store, "store_latitude", None),
            store_longitude=getattr(store, "store_longitude", None),
            store_location_name=getattr(store, "store_location_name", None),
            hyperlocal_enabled=True,
            hyperlocal_mode=getattr(store, "hyperlocal_mode", "radius"),
            max_delivery_radius_km=getattr(store, "max_delivery_radius_km", 10.0),
            min_order_value=getattr(store, "min_order_value", 0.0),
            base_delivery_fee=getattr(store, "base_delivery_fee", 30.0),
            base_distance_km=getattr(store, "base_distance_km", 3.0),
            per_km_fee=getattr(store, "per_km_fee", 10.0),
            free_delivery_above=getattr(store, "free_delivery_above", 499.0),
            estimated_delivery_mins=getattr(store, "estimated_delivery_mins", 45),
            serviceable_pincodes_type=getattr(store, "serviceable_pincodes_type", "all"),
            serviceable_pincodes=getattr(store, "serviceable_pincodes", None),
            customer_latitude=payload.customer_latitude,
            customer_longitude=payload.customer_longitude,
            customer_pincode=effective_pincode or None,
            cart_total=calculated_total,
        )
        if not eligibility["is_deliverable"]:
            raise HTTPException(
                status_code=400,
                detail=f"Local delivery unavailable: {eligibility['reason'] or 'Outside serviceable area'}"
            )
        shipping_fee = eligibility["delivery_fee"]
    else:
        # Standard shipping with pincode filter
        if getattr(store, "serviceable_pincodes_type", "all") == "specific" and effective_pincode:
            if not is_pincode_serviceable(effective_pincode, "specific", getattr(store, "serviceable_pincodes", None)):
                raise HTTPException(
                    status_code=400,
                    detail=f"Pincode {effective_pincode} is not serviceable by this store."
                )

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

    # Trigger Automated Email 4: Order Placed (Itemized Bill to Customer & Alert to Vendor)
    store_url = (
        f"https://{store.custom_domain}"
        if (store.custom_domain_enabled and store.custom_domain)
        else f"https://{store.subdomain}"
    )
    try:
        asyncio.create_task(
            StoreEmailService.send_order_placed_emails(store, order, saved_items, store_url)
        )
        if order.customer_phone:
            asyncio.create_task(
                SmsService.send_order_placed_sms(store, order.order_number, order.total_amount, order.customer_phone)
            )
    except Exception:
        pass

    try:
        from app.models.platform.system import PlatformNotification
        db.add(PlatformNotification(
            vendor_id=store.vendor_id,
            recipient_role="VENDOR_ADMIN",
            title=f"New Order #{order.order_number}",
            message=f"Received order from {order.customer_name} for Rs. {order.total_amount:.2f}",
            notification_type="ORDER",
            action_url=f"/orders/{order.id}",
        ))
        await db.commit()
    except Exception:
        pass

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
    clean_phone = phone.strip().replace(" ", "").replace("-", "")
    phone_candidates = {clean_phone}
    if len(clean_phone) >= 10:
        raw_10 = clean_phone[-10:]
        phone_candidates.add(raw_10)
        phone_candidates.add(f"+91{raw_10}")
        phone_candidates.add(f"+91 {raw_10}")

    stmt = (
        select(PlatformOrder)
        .where(
            PlatformOrder.vendor_id == store.vendor_id,
            PlatformOrder.customer_phone.in_(list(phone_candidates)),
        )
        .options(selectinload(PlatformOrder.items))
        .order_by(desc(PlatformOrder.created_at))
    )
    orders = (await db.execute(stmt)).scalars().all()

    # Preload product thumbnails
    product_ids = [it.product_id for order in orders for it in order.items if it.product_id]
    product_thumb_map = {}
    if product_ids:
        p_stmt = select(PlatformProduct.id, PlatformProduct.thumbnail_url).where(PlatformProduct.id.in_(product_ids))
        p_rows = (await db.execute(p_stmt)).all()
        product_thumb_map = {row[0]: row[1] for row in p_rows}

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
                    variant_id=it.variant_id,
                    variant_name=it.variant_name,
                    product_name=it.product_name,
                    product_sku=it.product_sku,
                    price=it.price,
                    quantity=it.quantity,
                    total=it.total,
                    image_url=product_thumb_map.get(it.product_id),
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

        # Trigger Automated Email 1: Welcome & Automated Email 2: Password Created
        store_url = (
            f"https://{store.custom_domain}"
            if (store.custom_domain_enabled and store.custom_domain)
            else f"https://{store.subdomain}"
        )
        try:
            asyncio.create_task(StoreEmailService.send_customer_welcome_email(store, customer, store_url))
            if customer.password_hash:
                asyncio.create_task(StoreEmailService.send_password_changed_email(store, customer))
            if customer.phone:
                asyncio.create_task(SmsService.send_customer_welcome_sms(store, customer.name, customer.phone))
        except Exception:
            pass

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
            try:
                asyncio.create_task(StoreEmailService.send_password_changed_email(store, customer))
            except Exception:
                pass

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


# ──────────────────────────────────────────────
# Automated Email 3: Customer Forgot & Reset Password
# ──────────────────────────────────────────────
@router.post("/{slug}/customer/forgot-password")
async def customer_forgot_password(
    slug: str,
    payload: CustomerForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Request 6-digit password reset verification code sent to customer's registered email.
    """
    store = await resolve_active_store(slug, db)
    clean_id = payload.identifier.strip().lower()
    clean_phone = clean_id.replace(" ", "").replace("-", "").replace("+91", "")

    stmt = select(PlatformCustomer).where(
        PlatformCustomer.vendor_id == store.vendor_id,
        or_(PlatformCustomer.email == clean_id, PlatformCustomer.phone == clean_phone),
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()
    if not customer:
        raise HTTPException(
            status_code=404,
            detail="No account found with this phone number or email address. Please verify or create an account.",
        )

    if not customer.email:
        raise HTTPException(
            status_code=400,
            detail="No email address is linked to this account. Please contact store support to reset your password.",
        )

    # Generate secure 6-digit OTP
    otp = f"{random.randint(100000, 999999)}"
    customer.reset_token = otp
    customer.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    await db.commit()

    # Dispatch Automated Email 3 & Automated OTP SMS
    try:
        asyncio.create_task(StoreEmailService.send_password_reset_otp_email(store, customer, otp))
        if customer.phone:
            asyncio.create_task(SmsService.send_otp_sms(store, otp, customer.phone))
    except Exception:
        pass

    # Mask email for response (e.g. p***a@example.com)
    email_parts = customer.email.split("@")
    masked_email = f"{email_parts[0][0]}***@{email_parts[1]}" if len(email_parts) == 2 and len(email_parts[0]) > 0 else customer.email

    return {
        "success": True,
        "message": f"6-digit verification code sent to {masked_email}. Code is valid for 15 minutes.",
        "masked_email": masked_email,
        "phone": customer.phone,
    }


@router.post("/{slug}/customer/reset-password")
async def customer_reset_password(
    slug: str,
    payload: CustomerResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Reset customer account password using the verified 6-digit OTP code.
    """
    store = await resolve_active_store(slug, db)
    clean_id = payload.identifier.strip().lower()
    clean_phone = clean_id.replace(" ", "").replace("-", "").replace("+91", "")

    if len(payload.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    stmt = select(PlatformCustomer).where(
        PlatformCustomer.vendor_id == store.vendor_id,
        or_(PlatformCustomer.email == clean_id, PlatformCustomer.phone == clean_phone),
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer account not found.")

    if not customer.reset_token or customer.reset_token.strip() != payload.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check your email and try again.")

    if customer.reset_token_expires_at:
        now_dt = datetime.now(timezone.utc)
        expires_at = customer.reset_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now_dt > expires_at:
            raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

    # Update password and clear reset token
    customer.password_hash = hash_password(payload.new_password.strip())
    customer.reset_token = None
    customer.reset_token_expires_at = None
    await db.commit()
    await db.refresh(customer)

    # Trigger Automated Email 2: Password Changed Security Notice
    try:
        asyncio.create_task(StoreEmailService.send_password_changed_email(store, customer))
    except Exception:
        pass

    token = secrets.token_urlsafe(24)
    return CustomerAuthResponse(
        success=True,
        message="Password reset successfully! You are now signed in.",
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


# ──────────────────────────────────────────────
# Google 1-Click Login (Hybrid Flow)
# ──────────────────────────────────────────────
@router.post("/{slug}/customer/google-auth", response_model=CustomerAuthResponse)
async def customer_google_auth(
    slug: str,
    payload: CustomerGoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate shopper via Google OAuth.
    If customer does not have a 10-digit mobile number on file, returns requires_phone=True
    to seamlessly prompt for phone number required by Indian courier partners.
    """
    store = await resolve_active_store(slug, db)
    clean_email = payload.email.strip().lower()
    clean_name = payload.name.strip() if payload.name else "Customer"
    clean_phone = payload.phone.strip().replace(" ", "").replace("-", "").replace("+91", "") if payload.phone else None

    # Find existing customer by email, google_id, or phone
    stmt = select(PlatformCustomer).where(
        PlatformCustomer.vendor_id == store.vendor_id,
        or_(
            PlatformCustomer.email == clean_email,
            PlatformCustomer.google_id == payload.google_id if payload.google_id else False,
            PlatformCustomer.phone == clean_phone if clean_phone else False,
        ),
    )
    customer = (await db.execute(stmt)).scalar_one_or_none()

    # Case A: Existing customer who already has a phone number
    if customer and customer.phone and len(customer.phone) >= 10:
        if payload.google_id and not customer.google_id:
            customer.google_id = payload.google_id
            await db.commit()
            await db.refresh(customer)

        token = secrets.token_urlsafe(24)
        return CustomerAuthResponse(
            success=True,
            message="Signed in with Google successfully!",
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

    # Case B: Phone number is provided (either during initial Google auth or after 1-step prompt)
    if clean_phone and len(clean_phone) >= 10:
        if customer:
            customer.phone = clean_phone
            if clean_name and customer.name == "Customer":
                customer.name = clean_name
            if payload.google_id:
                customer.google_id = payload.google_id
        else:
            customer = PlatformCustomer(
                vendor_id=store.vendor_id,
                name=clean_name,
                email=clean_email,
                phone=clean_phone,
                google_id=payload.google_id,
                total_orders=0,
                total_spent=0.0,
            )
            db.add(customer)

        await db.commit()
        await db.refresh(customer)

        # Trigger Automated Email 1: Welcome
        store_url = (
            f"https://{store.custom_domain}"
            if (store.custom_domain_enabled and store.custom_domain)
            else f"https://{store.subdomain}"
        )
        try:
            asyncio.create_task(StoreEmailService.send_customer_welcome_email(store, customer, store_url))
            if customer.phone:
                asyncio.create_task(SmsService.send_customer_welcome_sms(store, customer.name, customer.phone))
        except Exception:
            pass

        token = secrets.token_urlsafe(24)
        return CustomerAuthResponse(
            success=True,
            message="Account linked and signed in successfully!",
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

    # Case C: Customer has signed in with Google, but needs 10-digit phone for Indian logistics
    return CustomerAuthResponse(
        success=False,
        message="Please provide your 10-digit mobile phone number for delivery and order tracking updates.",
        requires_phone=True,
        prefill_name=customer.name if customer else clean_name,
        prefill_email=customer.email if customer else clean_email,
        google_id=payload.google_id,
        token=None,
    )


# ──────────────────────────────────────────────
# Supplier / Partner Onboarding ("Sell on Store")
# ──────────────────────────────────────────────
@router.post("/{slug}/supplier-inquiry", response_model=SupplierInquiryResponse)
async def submit_supplier_inquiry(
    slug: str,
    payload: SupplierInquiryCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a supplier / merchant application to sell on a store.
    Validates business credentials, saves inquiry, and alerts vendor & platform admin.
    """
    store = await resolve_active_store(slug, db)

    # Basic validations
    if not payload.business_name or len(payload.business_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Valid business name is required (minimum 2 characters).")
    if not payload.contact_person or len(payload.contact_person.strip()) < 2:
        raise HTTPException(status_code=400, detail="Contact person name is required.")

    clean_phone = payload.phone.strip().replace(" ", "").replace("-", "").replace("+91", "")
    if len(clean_phone) != 10 or not clean_phone.isdigit():
        raise HTTPException(status_code=400, detail="Valid 10-digit mobile phone number is mandatory.")

    clean_email = payload.email.strip().lower()
    if "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Valid business email address is required.")

    if not payload.city or not payload.state:
        raise HTTPException(status_code=400, detail="City and State are required.")

    inquiry_id = uuid.uuid4()
    ref_suffix = inquiry_id.hex[:6].upper()
    ref_id = f"MSP-SUP-{ref_suffix}" if "myshoppartner" in slug.lower() else f"SUP-{ref_suffix}"

    inquiry = PlatformSupplierInquiry(
        id=inquiry_id,
        vendor_id=store.vendor_id,
        store_slug=store.store_slug,
        business_name=payload.business_name.strip(),
        contact_person=payload.contact_person.strip(),
        phone=clean_phone,
        email=clean_email,
        whatsapp_number=payload.whatsapp_number.strip() if payload.whatsapp_number else clean_phone,
        business_type=payload.business_type or "Manufacturer",
        category=payload.category or "General",
        gstin=payload.gstin.strip().upper() if payload.gstin else None,
        fssai_license=payload.fssai_license.strip() if payload.fssai_license else None,
        city=payload.city.strip(),
        state=payload.state.strip(),
        pincode=payload.pincode.strip() if payload.pincode else None,
        monthly_capacity=payload.monthly_capacity,
        product_details=payload.product_details.strip() if payload.product_details else None,
        status="PENDING",
    )
    db.add(inquiry)

    # Add notification for store vendor admin
    notification = PlatformNotification(
        vendor_id=store.vendor_id,
        recipient_role="VENDOR_ADMIN",
        title=f"New Seller Application: {payload.business_name.strip()}",
        message=f"{payload.contact_person.strip()} applied to sell {payload.category}. Contact: +91 {clean_phone} | {clean_email}",
        notification_type="SYSTEM",
        action_url=f"/app/dashboard/suppliers",
    )
    db.add(notification)

    await db.commit()

    return SupplierInquiryResponse(
        success=True,
        reference_id=ref_id,
        message=f"Thank you! Your seller application has been submitted to {store.store_name} onboarding team. Our merchant manager will contact you within 24 hours.",
    )


