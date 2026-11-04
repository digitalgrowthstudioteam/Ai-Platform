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

    # App info
    app_name: str
    app_logo_url: Optional[str] = None
    splash_screen_url: Optional[str] = None
    app_primary_color: str
    app_secondary_color: str
    package_id: str
    app_build_status: str
    app_version: str
    playstore_url: Optional[str] = None
    publication_status: str
    # Stats
    total_products: int
    total_orders: int
    storage_used_mb: float
    storage_limit_mb: float
    # Custom Domain info
    custom_domain: Optional[str] = None
    custom_domain_enabled: bool = False
    custom_domain_status: str = "UNCONFIGURED"
    custom_domain_ssl_status: str = "PENDING"
    custom_domain_dns_target: Optional[str] = "cname.digitalgrowthstudio.in"
    # Subscription info
    plan_name: Optional[str] = None
    subscription_status: Optional[str] = None
    renewal_date: Optional[datetime] = None
    setup_fee_paid: bool = False
    setup_fee_waived: bool = False
    setup_fee_custom_price_inr: Optional[float] = None
    apk_user_approved: bool = False
    apk_download_url: Optional[str] = None


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

