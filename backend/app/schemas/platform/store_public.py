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

    # Hyperlocal On-Demand Delivery
    hyperlocal_enabled: bool = False
    hyperlocal_mode: str = "radius"
    store_latitude: Optional[float] = None
    store_longitude: Optional[float] = None
    store_location_name: Optional[str] = None
    max_delivery_radius_km: float = 10.0
    min_order_value: float = 0.0
    base_delivery_fee: float = 30.0
    base_distance_km: float = 3.0
    per_km_fee: float = 10.0
    free_delivery_above: Optional[float] = 499.0
    estimated_delivery_mins: int = 45

    terms_and_conditions: Optional[str] = None
    privacy_policy: Optional[str] = None
    shipping_policy: Optional[str] = None
    refund_policy: Optional[str] = None
    meta_pixel_id: Optional[str] = None
    gtm_id: Optional[str] = None
    ga4_id: Optional[str] = None
    tracking_enabled: bool = True
    custom_domain: Optional[str] = None


class HyperlocalEligibilityRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    pincode: Optional[str] = None
    cart_total: float = 0.0


class HyperlocalEligibilityResponse(BaseModel):
    hyperlocal_enabled: bool
    is_deliverable: bool
    location_serviceable: bool = True
    distance_km: Optional[float] = None
    delivery_fee: float
    estimated_time_text: str
    store_location_name: Optional[str] = None
    min_order_value: float
    min_order_met: bool
    free_delivery_above: Optional[float] = None
    free_delivery_remaining: float = 0.0
    reason: Optional[str] = None
    mode: str = "radius"


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


class CustomerAuthRequest(BaseModel):
    action: str = "login"  # "login", "register", "otp_request", "otp_verify"
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    otp: Optional[str] = None


class CustomerProfileResponse(BaseModel):
    id: uuid.UUID
    vendor_id: uuid.UUID
    name: str
    phone: str
    email: Optional[str] = None
    total_orders: int = 0
    total_spent: float = 0.0


class CustomerAuthResponse(BaseModel):
    success: bool
    message: str
    customer: Optional[CustomerProfileResponse] = None
    token: Optional[str] = None
    requires_phone: Optional[bool] = False
    prefill_name: Optional[str] = None
    prefill_email: Optional[str] = None
    google_id: Optional[str] = None


class CustomerForgotPasswordRequest(BaseModel):
    identifier: str  # email or 10-digit mobile phone number


class CustomerResetPasswordRequest(BaseModel):
    identifier: str  # email or 10-digit mobile phone number
    otp: str  # 6-digit verification code
    new_password: str  # minimum 6 characters


class CustomerGoogleAuthRequest(BaseModel):
    email: str
    name: Optional[str] = None
    google_id: Optional[str] = None
    id_token: Optional[str] = None
    phone: Optional[str] = None  # optional initially, prompted if missing


class PublicBannerItem(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    promo_offer: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    sort_order: int


class SupplierInquiryCreate(BaseModel):
    business_name: str
    contact_person: str
    phone: str
    email: str
    whatsapp_number: Optional[str] = None
    business_type: str = "Manufacturer"
    category: str = "General"
    gstin: Optional[str] = None
    fssai_license: Optional[str] = None
    city: str
    state: str
    pincode: Optional[str] = None
    monthly_capacity: Optional[str] = None
    product_details: Optional[str] = None


class SupplierInquiryResponse(BaseModel):
    success: bool
    reference_id: str
    message: str

