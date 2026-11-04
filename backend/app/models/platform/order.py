"""
Digital Growth Studio — Platform Order & Customer Models
"""
import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, Integer, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class PlatformCustomer(BaseModel):
    """Customer associated with a specific vendor's store/Android app."""
    __tablename__ = "platform_customers"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    google_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    reset_token: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reset_token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_orders: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_spent: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    last_order_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    orders: Mapped[List["PlatformOrder"]] = relationship("PlatformOrder", back_populates="customer")


class PlatformOrder(BaseModel):
    """Order placed through Android app or online store."""
    __tablename__ = "platform_orders"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("platform_customers.id", ondelete="SET NULL"), nullable=True)
    order_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    customer_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    shipping_address: Mapped[str] = mapped_column(Text, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False, default="COD")  # COD, ONLINE
    payment_status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING")  # PENDING, PAID, FAILED
    order_status: Mapped[str] = mapped_column(String(50), nullable=False, default="NEW")  # NEW, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
    courier_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tracking_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tracking_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    shipped_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    customer: Mapped[Optional["PlatformCustomer"]] = relationship("PlatformCustomer", back_populates="orders")
    items: Mapped[List["PlatformOrderItem"]] = relationship("PlatformOrderItem", back_populates="order", cascade="all, delete-orphan")


class PlatformOrderItem(BaseModel):
    """Individual line item within a vendor's order."""
    __tablename__ = "platform_order_items"

    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("platform_products.id", ondelete="SET NULL"), nullable=True)
    variant_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("platform_product_variants.id", ondelete="SET NULL"), nullable=True)
    variant_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    total: Mapped[float] = mapped_column(Float, nullable=False)

    order: Mapped["PlatformOrder"] = relationship("PlatformOrder", back_populates="items")

