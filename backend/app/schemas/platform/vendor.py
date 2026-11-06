"""
Digital Growth Studio — Platform Vendor, Store & App Config Schemas
"""
import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class VerifyRazorpayRequest(BaseModel):
    key_id: str = Field(..., description="Razorpay Key ID (rzp_live_... or rzp_test_...)")
    key_secret: Optional[str] = Field(None, description="Razorpay Key Secret")


class StoreUpdateRequest(BaseModel):
    store_name: Optional[str] = None
    description: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    business_address: Optional[str] = None
    opening_hours: Optional[str] = None
    cod_enabled: Optional[bool] = None
    razorpay_enabled: Optional[bool] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    razorpay_verified: Optional[bool] = None
    shipping_enabled: Optional[bool] = None
    shipping_charge: Optional[float] = None
    free_shipping_min_order: Optional[float] = None
    cod_charge: Optional[float] = None
    estimated_delivery_days: Optional[str] = None
    allowed_countries: Optional[str] = None
    serviceable_pincodes_type: Optional[str] = None
    serviceable_pincodes: Optional[str] = None

    # Hyperlocal On-Demand Settings
    hyperlocal_enabled: Optional[bool] = None
    hyperlocal_mode: Optional[str] = None  # "radius", "pincode", "both"
    store_latitude: Optional[float] = None
    store_longitude: Optional[float] = None
    store_location_name: Optional[str] = None
    max_delivery_radius_km: Optional[float] = None
    min_order_value: Optional[float] = None
    base_delivery_fee: Optional[float] = None
    base_distance_km: Optional[float] = None
    per_km_fee: Optional[float] = None
    free_delivery_above: Optional[float] = None
    estimated_delivery_mins: Optional[int] = None

    shiprocket_enabled: Optional[bool] = None
    shiprocket_email: Optional[str] = None
    shiprocket_password: Optional[str] = None
    shiprocket_auto_fulfill: Optional[bool] = None
    terms_and_conditions: Optional[str] = None
    privacy_policy: Optional[str] = None
    shipping_policy: Optional[str] = None
    refund_policy: Optional[str] = None

    # Custom Domain Mapping (Cloudflare for SaaS)
    custom_domain: Optional[str] = None
    custom_domain_enabled: Optional[bool] = None
    custom_domain_status: Optional[str] = None

    # Transactional Email Notification System (Platform Brevo vs Custom SMTP)
    email_notifications_enabled: Optional[bool] = None
    email_provider: Optional[str] = None  # "PLATFORM" or "CUSTOM_SMTP"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None


class StoreEmailSettingsUpdateRequest(BaseModel):
    email_notifications_enabled: Optional[bool] = True
    email_provider: str = "PLATFORM"  # "PLATFORM" or "CUSTOM_SMTP"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None


class StoreEmailSettingsResponse(BaseModel):
    email_notifications_enabled: bool = True
    email_provider: str = "PLATFORM"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    has_custom_password: bool = False
    default_platform_sender: str
    default_reply_to: Optional[str] = None


class StoreEmailTestRequest(BaseModel):
    test_email: Optional[str] = None


class HyperlocalSettingsUpdate(BaseModel):
    hyperlocal_enabled: bool = False
    hyperlocal_mode: str = "radius"  # "radius", "pincode", "both"
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
    serviceable_pincodes_type: str = "all"  # "all", "specific"
    serviceable_pincodes: Optional[str] = None


class HyperlocalSettingsResponse(BaseModel):
    hyperlocal_enabled: bool
    hyperlocal_mode: str
    store_latitude: Optional[float]
    store_longitude: Optional[float]
    store_location_name: Optional[str]
    max_delivery_radius_km: float
    min_order_value: float
    base_delivery_fee: float
    base_distance_km: float
    per_km_fee: float
    free_delivery_above: Optional[float]
    estimated_delivery_mins: int
    serviceable_pincodes_type: str
    serviceable_pincodes: Optional[str]


class VendorPoliciesUpdateRequest(BaseModel):
    terms_and_conditions: Optional[str] = None
    privacy_policy: Optional[str] = None
    shipping_policy: Optional[str] = None
    refund_policy: Optional[str] = None

    # Custom Domain Mapping (Cloudflare for SaaS)
    custom_domain: Optional[str] = None
    custom_domain_enabled: Optional[bool] = None
    custom_domain_status: Optional[str] = None

    # Transactional Email Notification System (Platform Brevo vs Custom SMTP)
    email_notifications_enabled: Optional[bool] = None
    email_provider: Optional[str] = None  # "PLATFORM" or "CUSTOM_SMTP"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None


class StoreEmailSettingsUpdateRequest(BaseModel):
    email_notifications_enabled: Optional[bool] = True
    email_provider: str = "PLATFORM"  # "PLATFORM" or "CUSTOM_SMTP"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None


class StoreEmailSettingsResponse(BaseModel):
    email_notifications_enabled: bool = True
    email_provider: str = "PLATFORM"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    has_custom_password: bool = False
    default_platform_sender: str
    default_reply_to: Optional[str] = None


class StoreEmailTestRequest(BaseModel):
    test_email: Optional[str] = None


class VendorPoliciesResponse(BaseModel):
    store_name: str
    store_slug: str
    terms_and_conditions: str
    privacy_policy: str
    shipping_policy: str
    refund_policy: str
    is_custom_terms: bool
    is_custom_privacy: bool
    is_custom_shipping: bool
    is_custom_refund: bool


class VendorProfileUpdateRequest(BaseModel):
    business_name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    gst_number: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    brand_name: Optional[str] = None
    whatsapp_number: Optional[str] = None
    whatsapp_business_name: Optional[str] = None
    business_phone: Optional[str] = None
    has_payment_gateway: Optional[str] = None
    needs_delivery_help: Optional[str] = None


class VendorAppConfigUpdateRequest(BaseModel):
    app_name: Optional[str] = None
    app_logo_url: Optional[str] = None
    splash_screen_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    package_id: Optional[str] = None
    app_version: Optional[str] = None
    is_locked: Optional[bool] = None
    submit_for_development: Optional[bool] = None
    sync_with_personal_data: Optional[bool] = True


class VendorDashboardOverviewResponse(BaseModel):
    vendor_code: str
    store_name: str
    store_slug: str
    subdomain: str
    status: str
    total_products: int
    active_products: int
    out_of_stock_products: int
    total_orders: int
    pending_orders: int
    processing_orders: int
    completed_orders: int
    cancelled_orders: int
    total_sales_inr: float
    total_customers: int
    storage_used_bytes: int
    storage_limit_bytes: int
    storage_percentage: float
    subscription_plan: str
    subscription_status: str
    subscription_renewal_date: Optional[datetime] = None


class VendorDetailFullResponse(BaseModel):
    id: uuid.UUID
    vendor_code: str
    status: str
    created_at: datetime

    # Owner (Personal) info
    owner_name: str
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None

    # Legacy alias fields for backward compatibility
    email: str
    phone: str

    # Business info
    business_name: str
    brand_name: Optional[str] = None
    category: str
    business_email: Optional[str] = None
    business_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    gst_number: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None

    # Store info
    store_name: Optional[str] = None
    store_slug: str
    subdomain: str
    store_status: str
    store_created_at: datetime
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    primary_color: str
    secondary_color: str
    cod_enabled: bool
    razorpay_enabled: bool
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    razorpay_verified: bool = False
    shipping_charge: Optional[float] = 0.0
    free_shipping_min_order: Optional[float] = 999.0
    estimated_delivery_days: Optional[str] = "3-5 Business Days"

    # Policies
    terms_and_conditions: Optional[str] = None
    privacy_policy: Optional[str] = None
    shipping_policy: Optional[str] = None
    refund_policy: Optional[str] = None

    # Custom Domain Mapping (Cloudflare for SaaS)
    custom_domain: Optional[str] = None
    custom_domain_enabled: Optional[bool] = None
    custom_domain_status: Optional[str] = None
    custom_domain_ssl_status: Optional[str] = None
    custom_domain_dns_target: Optional[str] = None

    # Transactional Email Notification System (Platform Brevo vs Custom SMTP)
    email_notifications_enabled: Optional[bool] = None
    email_provider: Optional[str] = None  # "PLATFORM" or "CUSTOM_SMTP"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None

    # Tracking & Pixels
    meta_pixel_id: Optional[str] = None
    gtm_id: Optional[str] = None
    ga4_id: Optional[str] = None
    tracking_enabled: Optional[bool] = True

    # SMS Gateway Integration (Fast2SMS, MSG91, Way2SMS / Custom HTTP)
    sms_gateway_enabled: Optional[bool] = False
    sms_provider: Optional[str] = "FAST2SMS"
    sms_api_key: Optional[str] = None
    sms_sender_id: Optional[str] = None
    sms_custom_url: Optional[str] = None
    sms_order_placed_active: Optional[bool] = True
    sms_order_dispatched_active: Optional[bool] = True
    sms_welcome_active: Optional[bool] = True
    sms_otp_active: Optional[bool] = True

    # WhatsApp Business & Shiprocket
    whatsapp_alerts_enabled: Optional[bool] = False
    shiprocket_enabled: Optional[bool] = False
    hyperlocal_enabled: Optional[bool] = False

    # Mobile App Configuration
    app_name: Optional[str] = None
    app_logo_url: Optional[str] = None
    splash_screen_url: Optional[str] = None
    app_primary_color: Optional[str] = "#2563EB"
    app_secondary_color: Optional[str] = "#1E293B"
    package_id: Optional[str] = "in.digitalgrowthstudio.store"
    app_build_status: Optional[str] = "NOT_REQUESTED"
    app_version: Optional[str] = "1.0.0"
    playstore_url: Optional[str] = None
    publication_status: Optional[str] = "UNPUBLISHED"
    apk_user_approved: Optional[bool] = False
    apk_download_url: Optional[str] = None
    subscription_auto_debit_active: Optional[bool] = False
    is_locked: Optional[bool] = False

    # Catalog & Storage Stats
    total_products: Optional[int] = 0
    total_orders: Optional[int] = 0
    storage_used_mb: Optional[float] = 0.0
    storage_limit_mb: Optional[float] = 1024.0

    # Subscription & Setup Fee
    plan_name: Optional[str] = "Starter Store"
    subscription_status: Optional[str] = "active"
    renewal_date: Optional[datetime] = None
    setup_fee_paid: Optional[bool] = False
    setup_fee_waived: Optional[bool] = False
    setup_fee_custom_price_inr: Optional[float] = None


class StoreEmailSettingsUpdateRequest(BaseModel):
    email_notifications_enabled: Optional[bool] = True
    email_provider: str = "PLATFORM"  # "PLATFORM" or "CUSTOM_SMTP"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None


class StoreEmailSettingsResponse(BaseModel):
    email_notifications_enabled: bool = True
    email_provider: str = "PLATFORM"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    has_custom_password: bool = False
    default_platform_sender: str
    default_reply_to: Optional[str] = None


class StoreEmailTestRequest(BaseModel):
    test_email: Optional[str] = None


class VendorPixelConfigResponse(BaseModel):
    meta_pixel_id: Optional[str] = None
    gtm_id: Optional[str] = None
    ga4_id: Optional[str] = None
    tracking_enabled: bool = True


class VendorPixelConfigUpdateRequest(BaseModel):
    meta_pixel_id: Optional[str] = None
    gtm_id: Optional[str] = None
    ga4_id: Optional[str] = None
    tracking_enabled: Optional[bool] = None


class VendorAnalyticsSummaryResponse(BaseModel):
    date_range: str = "30d"
    gross_revenue: float = 0.0
    net_revenue: float = 0.0
    total_orders: int = 0
    total_units_sold: int = 0
    average_order_value: float = 0.0


class VendorAnalyticsOverviewResponse(BaseModel):
    store_visits: int = 0
    unique_visitors: int = 0
    product_views: int = 0
    add_to_cart_count: int = 0
    checkout_count: int = 0
    whatsapp_clicks: int = 0
    conversion_rate: float = 0.0
    add_to_cart_rate: float = 0.0
    checkout_rate: float = 0.0
    sales_trend: List[dict] = []
    funnel_steps: List[dict] = []
    top_products: List[dict] = []
    traffic_sources: List[dict] = []
    device_breakdown: List[dict] = []
    customer_locations: List[dict] = []
    pixel_status: dict = {}


class AdminVendorFullUpdateRequest(BaseModel):
    # Owner (Personal) Information
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None

    # Business Information
    business_name: Optional[str] = None
    brand_name: Optional[str] = None
    category: Optional[str] = None
    gst_number: Optional[str] = None
    business_email: Optional[str] = None
    business_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None

    # Storefront & Quota
    store_name: Optional[str] = None
    store_slug: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    cod_enabled: Optional[bool] = None
    razorpay_enabled: Optional[bool] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    shipping_charge: Optional[float] = None
    free_shipping_min_order: Optional[float] = None
    estimated_delivery_days: Optional[str] = None

    # Policies
    terms_and_conditions: Optional[str] = None
    privacy_policy: Optional[str] = None
    shipping_policy: Optional[str] = None
    refund_policy: Optional[str] = None

    # Custom Domain Mapping (Cloudflare for SaaS)
    custom_domain: Optional[str] = None
    custom_domain_enabled: Optional[bool] = None
    custom_domain_status: Optional[str] = None
    custom_domain_ssl_status: Optional[str] = None
    custom_domain_dns_target: Optional[str] = None

    # Transactional Email Notification System (Platform Brevo vs Custom SMTP)
    email_notifications_enabled: Optional[bool] = None
    email_provider: Optional[str] = None  # "PLATFORM" or "CUSTOM_SMTP"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None

    # Tracking & Pixels
    meta_pixel_id: Optional[str] = None
    gtm_id: Optional[str] = None
    ga4_id: Optional[str] = None
    tracking_enabled: Optional[bool] = True

    # SMS Gateway Integration (Fast2SMS, MSG91, Way2SMS / Custom HTTP)
    sms_gateway_enabled: Optional[bool] = False
    sms_provider: Optional[str] = "FAST2SMS"
    sms_api_key: Optional[str] = None
    sms_sender_id: Optional[str] = None
    sms_custom_url: Optional[str] = None
    sms_order_placed_active: Optional[bool] = True
    sms_order_dispatched_active: Optional[bool] = True
    sms_welcome_active: Optional[bool] = True
    sms_otp_active: Optional[bool] = True

    # WhatsApp Business & Shiprocket
    whatsapp_alerts_enabled: Optional[bool] = False
    shiprocket_enabled: Optional[bool] = False
    hyperlocal_enabled: Optional[bool] = False

    # Mobile App Configuration
    app_name: Optional[str] = None
    app_logo_url: Optional[str] = None
    splash_screen_url: Optional[str] = None
    app_primary_color: Optional[str] = "#2563EB"
    app_secondary_color: Optional[str] = "#1E293B"
    package_id: Optional[str] = "in.digitalgrowthstudio.store"
    app_build_status: Optional[str] = "NOT_REQUESTED"
    app_version: Optional[str] = "1.0.0"
    playstore_url: Optional[str] = None
    publication_status: Optional[str] = "UNPUBLISHED"
    apk_user_approved: Optional[bool] = False
    apk_download_url: Optional[str] = None
    subscription_auto_debit_active: Optional[bool] = False
    is_locked: Optional[bool] = False

    # Catalog & Storage Stats
    total_products: Optional[int] = 0
    total_orders: Optional[int] = 0
    storage_used_mb: Optional[float] = 0.0
    storage_limit_mb: Optional[float] = 1024.0

    # Subscription & Setup Fee
    plan_name: Optional[str] = "Starter Store"
    subscription_status: Optional[str] = "active"
    renewal_date: Optional[datetime] = None
    setup_fee_paid: Optional[bool] = False
    setup_fee_waived: Optional[bool] = False
    setup_fee_custom_price_inr: Optional[float] = None


class StoreEmailSettingsUpdateRequest(BaseModel):
    email_notifications_enabled: Optional[bool] = True
    email_provider: str = "PLATFORM"  # "PLATFORM" or "CUSTOM_SMTP"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None


class StoreEmailSettingsResponse(BaseModel):
    email_notifications_enabled: bool = True
    email_provider: str = "PLATFORM"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    has_custom_password: bool = False
    default_platform_sender: str
    default_reply_to: Optional[str] = None


class StoreEmailTestRequest(BaseModel):
    test_email: Optional[str] = None


class VendorPixelConfigResponse(BaseModel):
    meta_pixel_id: Optional[str] = None
    gtm_id: Optional[str] = None
    ga4_id: Optional[str] = None
    tracking_enabled: bool = True


class VendorPixelConfigUpdateRequest(BaseModel):
    meta_pixel_id: Optional[str] = None
    gtm_id: Optional[str] = None
    ga4_id: Optional[str] = None
    tracking_enabled: Optional[bool] = None


class VendorAnalyticsSummaryResponse(BaseModel):
    date_range: str = "30d"
    gross_revenue: float = 0.0
    net_revenue: float = 0.0
    total_orders: int = 0
    total_units_sold: int = 0
    average_order_value: float = 0.0


class VendorCustomDomainInfoResponse(BaseModel):
    custom_domain: Optional[str] = None
    custom_domain_enabled: bool = False
    custom_domain_status: str = "UNCONFIGURED"  # UNCONFIGURED, PENDING_DNS, ACTIVE, FAILED
    custom_domain_ssl_status: str = "PENDING"
    custom_domain_dns_target: str = "cname.digitalgrowthstudio.in"
    addon_id: Optional[uuid.UUID] = None
    addon_price_inr: float = 999.0
    has_paid_addon: bool = False


class VendorCustomDomainUpdateRequest(BaseModel):
    custom_domain: Optional[str] = None


class VendorSmsSettingsResponse(BaseModel):
    sms_gateway_enabled: bool = False
    sms_provider: str = "FAST2SMS"
    sms_api_key: Optional[str] = None
    sms_sender_id: Optional[str] = None
    sms_custom_url: Optional[str] = None
    sms_order_placed_active: bool = True
    sms_order_dispatched_active: bool = True
    sms_welcome_active: bool = True
    sms_otp_active: bool = True
    has_api_key: bool = False


class VendorSmsSettingsUpdateRequest(BaseModel):
    sms_provider: Optional[str] = "FAST2SMS"
    sms_api_key: Optional[str] = None
    sms_sender_id: Optional[str] = None
    sms_custom_url: Optional[str] = None
    sms_order_placed_active: Optional[bool] = True
    sms_order_dispatched_active: Optional[bool] = True
    sms_welcome_active: Optional[bool] = True
    sms_otp_active: Optional[bool] = True


class VendorTestSmsRequest(BaseModel):
    test_phone: str


class AdminAppToggleRequest(BaseModel):
    app_code: str  # "razorpay", "sms_gateway", "custom_domain", "shiprocket", "whatsapp"
    enabled: bool


# ──────────────────────────────────────────────
# AI Product Importer & Credit System Schemas
# ──────────────────────────────────────────────

class AiProductImportPreviewRequest(BaseModel):
    url: str


class AiProductImportPreviewResponse(BaseModel):
    source_url: str
    title: str
    category: str
    description_html: str
    short_description: str
    selling_price: float
    mrp: float
    variants: List[dict] = []
    tags: List[str] = []
    images: List[str] = []


class AiProductImportConfirmRequest(BaseModel):
    source_url: Optional[str] = None
    title: str
    category_name: Optional[str] = "General"
    description_html: Optional[str] = ""
    short_description: Optional[str] = ""
    selling_price: float
    mrp: Optional[float] = None
    images: List[str] = []
    variants: List[dict] = []
    tags: List[str] = []


class AiProductImportConfirmResponse(BaseModel):
    success: bool
    product_id: str
    title: str
    credits_used: int
    remaining_credits: int
    message: str


class AiImageStudioRequest(BaseModel):
    image_url: str
    style: str = "studio-white"  # "studio-white", "minimal-marble", "modern-pastel", "luxury-dark"
    badge_text: Optional[str] = None
    product_id: Optional[str] = None


class AiImageStudioResponse(BaseModel):
    enhanced_image_url: str
    style: str
    width: int
    height: int
    credits_used: int
    remaining_credits: int


class AiCreditPackItem(BaseModel):
    id: str
    name: str
    credits: int
    price_inr: float
    tag: Optional[str] = None
    popular: bool = False
    active: bool = True


class AiCreditBalanceResponse(BaseModel):
    credits: int
    import_product_credit_cost: int
    image_studio_credit_cost: int
    credit_packs: List[AiCreditPackItem]
    recent_transactions: List[dict] = []


class AiCreditPurchaseOrderRequest(BaseModel):
    pack_id: str


class AiCreditPurchaseOrderResponse(BaseModel):
    order_id: str
    amount_inr: float
    amount_paise: int
    key_id: Optional[str] = None
    pack_id: str
    credits_to_add: int


class AiCreditVerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    pack_id: str


class AiAdminCreditConfigUpdate(BaseModel):
    welcome_credits: Optional[int] = None
    import_product_credit_cost: Optional[int] = None
    image_studio_credit_cost: Optional[int] = None
    credit_packs: Optional[List[AiCreditPackItem]] = None


class AiAdminGrantCreditsRequest(BaseModel):
    vendor_id: uuid.UUID
    amount: int
    reason: str



