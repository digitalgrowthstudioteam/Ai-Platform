"""
Digital Growth Studio — Platform Auth Schemas
"""
import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class PlatformRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    owner_name: str
    business_name: str
    phone: str
    category: str = "General"
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

