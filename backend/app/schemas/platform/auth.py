"""
Digital Growth Studio — Platform Auth Schemas
"""
import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class PlatformRegisterRequest(BaseModel):
    # Slide 1: Owner Details
    owner_name: str
    email: EmailStr
    password: Optional[str] = None
    google_id_token: Optional[str] = None
    whatsapp_number: Optional[str] = None
    phone: Optional[str] = None

    # Slide 2: Business Details
    business_name: str
    business_phone: Optional[str] = None
    category: str = "General"
    whatsapp_business_name: Optional[str] = None
    brand_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    has_payment_gateway: Optional[str] = "No"
    needs_delivery_help: Optional[str] = "No"
    store_slug: Optional[str] = None


class PlatformLoginRequest(BaseModel):
    email: EmailStr
    password: str


class PlatformGoogleLoginRequest(BaseModel):
    id_token: str


class PlatformTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: uuid.UUID
    email: str
    name: str
    role: str
    vendor_id: Optional[uuid.UUID] = None
    vendor_code: Optional[str] = None
    store_slug: Optional[str] = None


class PlatformUserMeResponse(BaseModel):
    user_id: uuid.UUID
    email: str
    name: str
    role: str
    vendor_id: Optional[uuid.UUID] = None
    vendor_code: Optional[str] = None
    store_slug: Optional[str] = None
    store_name: Optional[str] = None
    status: str
    setup_fee_cleared: bool = True
    setup_fee_paid: bool = True
    setup_fee_waived: bool = False
    subscription_status: Optional[str] = None
    apk_user_approved: bool = False

