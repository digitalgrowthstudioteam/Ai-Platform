"""
Digital Growth Studio — Platform Catalog Models (Categories, Products, Images, Banners)
"""
import uuid
from typing import Optional, List
from sqlalchemy import String, ForeignKey, Text, Boolean, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class PlatformCategory(BaseModel):
    """Vendor-specific product category."""
    __tablename__ = "platform_categories"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    products: Mapped[List["PlatformProduct"]] = relationship("PlatformProduct", back_populates="category")


class PlatformProduct(BaseModel):
    """Vendor product item."""
    __tablename__ = "platform_products"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("platform_categories.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    regular_price: Mapped[float] = mapped_column(Float, nullable=False)
    sale_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sku: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    stock_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")  # active, inactive, out_of_stock
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    category: Mapped[Optional["PlatformCategory"]] = relationship("PlatformCategory", back_populates="products")
    images: Mapped[List["PlatformProductImage"]] = relationship(
        "PlatformProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="PlatformProductImage.sort_order",
    )


class PlatformProductImage(BaseModel):
    """Product images stored in Cloud CDN Storage."""
    __tablename__ = "platform_product_images"

    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_products.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_thumbnail: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    product: Mapped["PlatformProduct"] = relationship("PlatformProduct", back_populates="images")


class PlatformBanner(BaseModel):
    """Vendor homepage and Android app promotional banners."""
    __tablename__ = "platform_banners"

    vendor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("platform_vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    promo_offer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    link_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

