"""
Digital Growth Studio — Platform Order & Customer Schemas
"""
import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class OrderItemCreate(BaseModel):
    product_id: uuid.UUID
    variant_id: Optional[uuid.UUID] = None
    variant_name: Optional[str] = None
    quantity: int = Field(gt=0)


class PublicOrderCreateRequest(BaseModel):
    customer_name: str = Field(min_length=1)
    customer_phone: str = Field(min_length=6)
    customer_email: Optional[str] = None
    shipping_address: str = Field(min_length=5)
    payment_method: str = "COD"  # COD, ONLINE
    items: List[OrderItemCreate] = Field(min_length=1)
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    variant_id: Optional[uuid.UUID] = None
    variant_name: Optional[str] = None
    product_name: str
    product_sku: Optional[str] = None
    price: float
    quantity: int
    total: float


class OrderResponse(BaseModel):
    id: uuid.UUID
    vendor_id: uuid.UUID
    order_number: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    shipping_address: str
    total_amount: float
    payment_method: str
    payment_status: str
    order_status: str
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse] = []


class OrderStatusUpdateRequest(BaseModel):
    order_status: Optional[str] = None  # NEW, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
    payment_status: Optional[str] = None  # PENDING, PAID, FAILED
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    notes: Optional[str] = None


class CustomerResponse(BaseModel):
    id: uuid.UUID
    vendor_id: uuid.UUID
    name: str
    phone: str
    email: Optional[str] = None
    total_orders: int
    total_spent: float
    last_order_at: Optional[datetime] = None
    created_at: datetime

