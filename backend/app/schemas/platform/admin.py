"""
Digital Growth Studio — Super Admin Schemas
"""
import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class SuperAdminOverviewResponse(BaseModel):
    total_vendors: int
    active_vendors: int
    inactive_vendors: int
    trial_vendors: int
    expired_subscriptions: int
    total_mrr_inr: float
    total_razorpay_funds_inr: float = 0.0
    total_payments_count: int = 0
    total_orders_all_vendors: int
    total_products_all_vendors: int
    new_registrations_this_month: int
    total_storage_used_mb: float


class VendorListItem(BaseModel):
    id: uuid.UUID
    vendor_code: str
    business_name: str
    owner_name: str
    email: str
    phone: str
    store_slug: str
    subdomain: str
    status: str
    plan_name: str
    subscription_status: str
    total_products: int
    total_orders: int
    app_build_status: str
    publication_status: str = "UNPUBLISHED"
    apk_user_approved: bool = False
    created_at: datetime


class VendorStatusUpdateRequest(BaseModel):
    status: str  # active, inactive, suspended, trial


class VendorSubdomainUpdateRequest(BaseModel):
    store_slug: str = Field(min_length=2, max_length=100)


class AdminGrantAccessRequest(BaseModel):
    months: int = Field(default=1, ge=1, le=120)
    reason: Optional[str] = "Admin granted access"


class VendorCreateByAdminRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    owner_name: str
    business_name: str
    phone: str
    category: str = "General"
    store_slug: str
    plan_slug: str = "starter-store"


class PlanCreateOrUpdateRequest(BaseModel):
    name: str
    slug: str
    monthly_price_inr: float
    setup_fee_inr: float
    setup_fee_sale_price_inr: Optional[float] = 999.0
    storage_limit_mb: int = 1024
    max_products: int = 100
    is_active: bool = True
    features_json: Optional[str] = "[]"


class PlanResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    monthly_price_inr: float
    setup_fee_inr: float
    setup_fee_sale_price_inr: Optional[float] = 999.0
    storage_limit_mb: int
    max_products: int
    is_active: bool
    features_json: str
    created_at: datetime


class AddonCreateOrUpdateRequest(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    price_inr: float
    billing_type: str = "ONE_TIME"  # ONE_TIME, MONTHLY
    is_active: bool = True


class AddonResponse(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    description: Optional[str] = None
    price_inr: float
    billing_type: str
    is_active: bool
    created_at: datetime


class VendorAppStatusUpdateRequest(BaseModel):
    app_build_status: Optional[str] = None  # NOT_REQUESTED, QUEUED, IN_DEVELOPMENT, BUILT, FAILED
    publication_status: Optional[str] = None  # UNPUBLISHED, PENDING_REVIEW, PUBLISHED
    playstore_url: Optional[str] = None
    app_version: Optional[str] = None
    is_locked: Optional[bool] = None
    apk_download_url: Optional[str] = None
    apk_user_approved: Optional[bool] = None


class VendorStorageLimitUpdateRequest(BaseModel):
    storage_limit_mb: int


class PlatformAuditLogItem(BaseModel):
    id: uuid.UUID
    actor_role: str
    vendor_id: Optional[uuid.UUID] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details_json: Optional[str] = None
    created_at: datetime

