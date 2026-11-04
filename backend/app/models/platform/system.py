"""
Digital Growth Studio — Platform System, Notifications & Audit Log Models
"""
import uuid
from typing import Optional
from sqlalchemy import String, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class PlatformNotification(BaseModel):
    """Platform alerts and notices for Vendors and Admins."""
    __tablename__ = "platform_notifications"

    vendor_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=True, index=True)
    recipient_role: Mapped[str] = mapped_column(String(50), nullable=False, default="VENDOR_ADMIN")  # SUPER_ADMIN, VENDOR_ADMIN
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notification_type: Mapped[str] = mapped_column(String(50), nullable=False, default="SYSTEM")  # ORDER, SUBSCRIPTION, APP, SYSTEM
    action_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class PlatformAuditLog(BaseModel):
    """Security audit log for sensitive operations and vendor state changes."""
    __tablename__ = "platform_audit_logs"

    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    actor_role: Mapped[str] = mapped_column(String(50), nullable=False)  # SUPER_ADMIN, VENDOR_ADMIN, SYSTEM
    vendor_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("platform_vendors.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    details_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class PlatformSetting(BaseModel):
    """Global multi-vendor platform configuration managed by Super Admin."""
    __tablename__ = "platform_settings"

    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class PlatformSupplierInquiry(BaseModel):
    """Supplier / Partner application to sell on a merchant store or platform."""
    __tablename__ = "platform_supplier_inquiries"

    vendor_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=True, index=True)
    store_slug: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    business_type: Mapped[str] = mapped_column(String(100), nullable=False, default="Manufacturer")  # Manufacturer, Distributor, Importer, Brand
    category: Mapped[str] = mapped_column(String(255), nullable=False, default="General")
    gstin: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    fssai_license: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    monthly_capacity: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    product_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")  # PENDING, CONTACTED, APPROVED, REJECTED


