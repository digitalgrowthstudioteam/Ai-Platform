"""
Digital Growth Studio — Platform Vendor, Profile, Store & App Models
"""
import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, Boolean, Integer, BigInteger, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class PlatformUser(BaseModel):
    """Platform credentials for Super Admins and Vendor Admins."""
    __tablename__ = "platform_users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="VENDOR_ADMIN")  # SUPER_ADMIN, VENDOR_ADMIN
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")  # active, inactive, suspended

    vendors: Mapped[List["PlatformVendor"]] = relationship("PlatformVendor", back_populates="user", cascade="all, delete-orphan")


class PlatformVendor(BaseModel):
    """Vendor account entity with unique Vendor ID (e.g. VND0001)."""
    __tablename__ = "platform_vendors"

    vendor_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="trial")  # active, inactive, trial, suspended

    user: Mapped["PlatformUser"] = relationship("PlatformUser", back_populates="vendors")
    profile: Mapped[Optional["PlatformVendorProfile"]] = relationship("PlatformVendorProfile", back_populates="vendor", uselist=False, cascade="all, delete-orphan")
    store: Mapped[Optional["PlatformStore"]] = relationship("PlatformStore", back_populates="vendor", uselist=False, cascade="all, delete-orphan")
    app_config: Mapped[Optional["PlatformVendorAppConfig"]] = relationship("PlatformVendorAppConfig", back_populates="vendor", uselist=False, cascade="all, delete-orphan")
    storage_usage: Mapped[Optional["PlatformStorageUsage"]] = relationship("PlatformStorageUsage", back_populates="vendor", uselist=False, cascade="all, delete-orphan")


class PlatformVendorProfile(BaseModel):
    """Detailed business and ownership information for a vendor."""
    __tablename__ = "platform_vendor_profiles"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), unique=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="General")
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gst_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    brand_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    brand_name_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    whatsapp_business_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    business_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    has_payment_gateway: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="No")
    needs_delivery_help: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="No")

    vendor: Mapped["PlatformVendor"] = relationship("PlatformVendor", back_populates="profile")


class PlatformStore(BaseModel):
    """Online store configuration, slug, and subdomain."""
    __tablename__ = "platform_stores"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), unique=True, nullable=False)
    store_name: Mapped[str] = mapped_column(String(255), nullable=False)
    store_slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    subdomain: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")  # active, inactive, maintenance
    primary_color: Mapped[str] = mapped_column(String(50), nullable=False, default="#2563EB")
    secondary_color: Mapped[str] = mapped_column(String(50), nullable=False, default="#1E293B")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    banner_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    business_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    opening_hours: Mapped[str] = mapped_column(String(255), nullable=False, default="Mon - Sat: 9:00 AM - 9:00 PM")
    cod_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    razorpay_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    razorpay_key_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    razorpay_key_secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    razorpay_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Shipping & Logistics Settings
    shipping_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    shipping_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    free_shipping_min_order: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=999.0)
    cod_charge: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    estimated_delivery_days: Mapped[str] = mapped_column(String(100), nullable=False, default="3-5 Business Days")
    allowed_countries: Mapped[str] = mapped_column(String(500), nullable=False, default="India")
    serviceable_pincodes_type: Mapped[str] = mapped_column(String(50), nullable=False, default="all")
    serviceable_pincodes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    shiprocket_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    shiprocket_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    shiprocket_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    shiprocket_auto_fulfill: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Brand Legal Policies
    terms_and_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    privacy_policy: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    shipping_policy: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refund_policy: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Analytics & Tracking Pixels (Meta Pixel, Google Tag Manager, Google Analytics 4)
    meta_pixel_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    gtm_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ga4_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tracking_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Custom Domain Mapping (Cloudflare for SaaS)
    custom_domain: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    custom_domain_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    custom_domain_status: Mapped[str] = mapped_column(String(50), nullable=False, default="UNCONFIGURED")  # UNCONFIGURED, PENDING_DNS, ACTIVE, FAILED
    custom_domain_ssl_status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")   # PENDING, ACTIVE, ERROR
    custom_domain_dns_target: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default="cname.digitalgrowthstudio.in")

    # Transactional Email Notification System (Platform Brevo vs Custom SMTP)
    email_notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="PLATFORM")  # PLATFORM, CUSTOM_SMTP
    smtp_host: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=587)
    smtp_user: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_from_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_from_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    vendor: Mapped["PlatformVendor"] = relationship("PlatformVendor", back_populates="store")


class PlatformVendorAppConfig(BaseModel):
    """Vendor's Android App configuration and build tracking."""
    __tablename__ = "platform_vendor_app_configs"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), unique=True, nullable=False)
    app_name: Mapped[str] = mapped_column(String(255), nullable=False)
    app_logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    splash_screen_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_color: Mapped[str] = mapped_column(String(50), nullable=False, default="#2563EB")
    secondary_color: Mapped[str] = mapped_column(String(50), nullable=False, default="#1E293B")
    package_id: Mapped[str] = mapped_column(String(255), nullable=False, default="in.digitalgrowthstudio.store")
    app_build_status: Mapped[str] = mapped_column(String(50), nullable=False, default="NOT_REQUESTED")  # NOT_REQUESTED, QUEUED, IN_DEVELOPMENT, BUILT, FAILED
    app_version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0.0")
    playstore_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    publication_status: Mapped[str] = mapped_column(String(50), nullable=False, default="UNPUBLISHED")  # UNPUBLISHED, PENDING_REVIEW, PUBLISHED
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    apk_download_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    apk_submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    apk_user_approved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    apk_user_approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    subscription_auto_debit_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    vendor: Mapped["PlatformVendor"] = relationship("PlatformVendor", back_populates="app_config")


class PlatformStorageUsage(BaseModel):
    """Storage consumption per vendor (for media assets and product images)."""
    __tablename__ = "platform_storage_usage"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_bytes_used: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    image_bytes_used: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    product_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    limit_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=1073741824)  # 1GB default
    last_calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    vendor: Mapped["PlatformVendor"] = relationship("PlatformVendor", back_populates="storage_usage")


class PlatformStoreEvent(BaseModel):
    """Storefront tracking event (page views, products viewed, cart additions, checkouts, purchases, whatsapp clicks)."""
    __tablename__ = "platform_store_events"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # page_view, view_content, add_to_cart, initiate_checkout, purchase, whatsapp_click, add_to_wishlist
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("platform_products.id", ondelete="SET NULL"), nullable=True)
    product_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    value: Mapped[Optional[float]] = mapped_column(Float, nullable=True, default=0.0)
    source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="Direct")  # Direct, WhatsApp, Instagram, Google, Meta Ads
    device: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="Mobile")  # Mobile, Desktop, Tablet
    visitor_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    url_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

