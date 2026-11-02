"""
Digital Growth Studio — Platform Catalog Schemas
"""
import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class CategoryCreatePayload(BaseModel):
    name: str = Field(min_length=1)
    slug: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class CategoryUpdatePayload(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    vendor_id: uuid.UUID
    name: str
    slug: str
    image_url: Optional[str] = None
    sort_order: int
    is_active: bool
    created_at: datetime


class ProductImageItem(BaseModel):
    id: uuid.UUID
    image_url: str
    sort_order: int
    is_thumbnail: bool


class ProductCreatePayload(BaseModel):
    name: str = Field(min_length=1)
    description: Optional[str] = None
    regular_price: float = Field(ge=0)
    sale_price: Optional[float] = Field(default=None, ge=0)
    sku: Optional[str] = ""
    stock_quantity: int = Field(default=0, ge=0)
    category_id: Optional[uuid.UUID] = None
    status: str = "active"  # active, inactive, out_of_stock
    is_featured: bool = False
    thumbnail_url: Optional[str] = None
    image_urls: Optional[List[str]] = []


class ProductUpdatePayload(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    regular_price: Optional[float] = None
    sale_price: Optional[float] = None
    sku: Optional[str] = None
    stock_quantity: Optional[int] = None
    category_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    thumbnail_url: Optional[str] = None
    image_urls: Optional[List[str]] = None


class ProductResponse(BaseModel):
    id: uuid.UUID
    vendor_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    category_name: Optional[str] = None
    name: str
    slug: str
    description: Optional[str] = None
    regular_price: float
    sale_price: Optional[float] = None
    sku: str
    stock_quantity: int
    status: str
    is_featured: bool
    thumbnail_url: Optional[str] = None
    images: List[ProductImageItem] = []
    created_at: datetime


class BannerCreatePayload(BaseModel):
    title: str = Field(min_length=1)
    description: Optional[str] = None
    promo_offer: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class BannerUpdatePayload(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    promo_offer: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class BannerResponse(BaseModel):
    id: uuid.UUID
    vendor_id: uuid.UUID
    title: str
    description: Optional[str] = None
    promo_offer: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    sort_order: int
    is_active: bool
    created_at: datetime

