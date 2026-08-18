"""
Digital Growth Studio — Auth Pydantic Schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional


class UserMeResponse(BaseModel):
    """Schema for current authenticated user profile."""
    uid: str
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None
