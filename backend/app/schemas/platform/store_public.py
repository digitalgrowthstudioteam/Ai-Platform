"""
Digital Growth Studio — Public Store Schemas for Android App & Web Storefront
"""
import uuid
from typing import Optional, List
from pydantic import BaseModel


class PublicStoreConfigResponse(BaseModel):
    store_name: str
    store_slug: str
    subdomain: str
    description: Optional[str] = None
    primary_color: str
    secondary_color: str
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    business_phone: Optional[str] = None
    business_address: Optional[str] = None
    opening_hours: str
    cod_enabled: bool
    razorpay_enabled: bool
    razorpay_key_id: Optional[str] = None
    app_version: Optional[str] = "1.0.0"
    shipping_enabled: bool = True
    shipping_charge: float = 0.0
    free_shipping_min_order: Optional[float] = 999.0
    cod_charge: float = 0.0
    estimated_delivery_days: str = "3-5 Business Days"
    allowed_countries: str = "India"
    serviceable_pincodes_type: str = "all"
    serviceable_pincodes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    privacy_policy: Optional[str] = None
    shipping_policy: Optional[str] = None
    refund_policy: Optional[str] = None
    meta_pixel_id: Optional[str] = None
    gtm_id: Optional[str] = None
    ga4_id: Optional[str] = None
    tracking_enabled: bool = True


class PublicStoreEventCreate(BaseModel):
    event_type: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    value: Optional[float] = 0.0
    source: Optional[str] = "Direct"
    device: Optional[str] = "Mobile"
    visitor_id: Optional[str] = None
    city: Optional[str] = None
    url_path: Optional[str] = None


class PublicStorePoliciesResponse(BaseModel):
    store_name: str
    store_slug: str
    terms_and_conditions: str
    privacy_policy: str
    shipping_policy: str
    refund_policy: str


from app.schemas.platform.catalog import ProductVariantResponse


class PublicProductImage(BaseModel):
    image_url: str
    sort_order: int
    is_thumbnail: bool


class PublicProductItem(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    regular_price: float
    sale_price: Optional[float] = None
    effective_price: float
    sku: str
    stock_quantity: int
    in_stock: bool
    category_id: Optional[uuid.UUID] = None
    category_name: Optional[str] = None
    thumbnail_url: Optional[str] = None
    images: List[PublicProductImage] = []
    has_variants: bool = False
    variants: List[ProductVariantResponse] = []
    is_featured: bool


class PublicCategoryItem(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    image_url: Optional[str] = None
    sort_order: int


class PublicBannerItem(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    promo_offer: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    sort_order: int

