"""
Digital Growth Studio — Platform Subscription, Plan, Add-on & Payment Models
"""
import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, Boolean, Integer, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class PlatformPlan(BaseModel):
    """Configurable subscription plans created by Super Admin (e.g. Starter Store)."""
    __tablename__ = "platform_plans"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    monthly_price_inr: Mapped[float] = mapped_column(Float, nullable=False, default=499.0)
    setup_fee_inr: Mapped[float] = mapped_column(Float, nullable=False, default=2000.0)
    storage_limit_mb: Mapped[int] = mapped_column(Integer, nullable=False, default=1024)
    max_products: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    features_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")


class PlatformSubscription(BaseModel):
    """Vendor's active membership and subscription lifecycle."""
    __tablename__ = "platform_subscriptions"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_plans.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")  # active, trial, suspended, expired, cancelled
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    next_renewal_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    monthly_price_inr: Mapped[float] = mapped_column(Float, nullable=False, default=499.0)
    setup_fee_paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    discount_inr: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    plan: Mapped["PlatformPlan"] = relationship("PlatformPlan")


class PlatformPayment(BaseModel):
    """Financial transactions recorded for subscriptions, setup fees, and add-ons."""
    __tablename__ = "platform_payments"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("platform_subscriptions.id", ondelete="SET NULL"), nullable=True)
    amount_inr: Mapped[float] = mapped_column(Float, nullable=False)
    payment_type: Mapped[str] = mapped_column(String(50), nullable=False)  # SETUP_FEE, SUBSCRIPTION, ADDON
    gateway: Mapped[str] = mapped_column(String(50), nullable=False, default="MANUAL")  # RAZORPAY, COD, MANUAL, BANK_TRANSFER
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="SUCCESS")  # SUCCESS, PENDING, FAILED


class PlatformAddon(BaseModel):
    """Optional add-on services managed by Super Admin."""
    __tablename__ = "platform_addons"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price_inr: Mapped[float] = mapped_column(Float, nullable=False)
    billing_type: Mapped[str] = mapped_column(String(50), nullable=False, default="ONE_TIME")  # ONE_TIME, MONTHLY
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class PlatformVendorAddon(BaseModel):
    """Vendor subscription to an add-on service."""
    __tablename__ = "platform_vendor_addons"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    addon_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_addons.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="requested")  # requested, active, cancelled
    price_paid: Mapped[float] = mapped_column(Float, nullable=False)
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    addon: Mapped["PlatformAddon"] = relationship("PlatformAddon")

