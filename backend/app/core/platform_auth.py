"""
Digital Growth Studio — Platform Authentication & Access Control
Provides JWT token creation/verification, password hashing, and role dependencies.
"""
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import get_db
from app.models.platform.vendor import PlatformUser, PlatformVendor

settings = get_settings()
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with a unique random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}:{key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against salt:key hash."""
    try:
        salt, key_hex = hashed_password.split(":", 1)
        key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False


def create_platform_access_token(payload: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token for platform users."""
    to_encode = payload.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=settings.PLATFORM_JWT_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.PLATFORM_JWT_SECRET, algorithm=settings.PLATFORM_JWT_ALGORITHM)


def decode_platform_access_token(token: str) -> dict:
    """Decode and validate a platform JWT access token."""
    try:
        return jwt.decode(token, settings.PLATFORM_JWT_SECRET, algorithms=[settings.PLATFORM_JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired platform token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_platform_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> PlatformUser:
    """Extract and authenticate platform user from JWT Bearer token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    claims = decode_platform_access_token(credentials.credentials)
    user_id_str = claims.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")

    stmt = select(PlatformUser).where(PlatformUser.id == user_id_str)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled or suspended")

    return user


async def require_super_admin(
    user: PlatformUser = Depends(get_current_platform_user),
) -> PlatformUser:
    """Ensure current platform user is a Super Admin."""
    if user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin privileges required"
        )
    return user


class CurrentVendor:
    """Vendor session container carrying user and vendor entity."""
    def __init__(self, user: PlatformUser, vendor: PlatformVendor):
        self.user = user
        self.vendor = vendor


async def require_vendor_admin(
    user: PlatformUser = Depends(get_current_platform_user),
    db: AsyncSession = Depends(get_db),
) -> CurrentVendor:
    """Ensure current platform user is a Vendor Admin and fetch their vendor record."""
    if user.role != "VENDOR_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor privileges required"
        )

    stmt = (
        select(PlatformVendor)
        .where(PlatformVendor.user_id == user.id)
        .options(
            selectinload(PlatformVendor.profile),
            selectinload(PlatformVendor.store),
            selectinload(PlatformVendor.app_config),
            selectinload(PlatformVendor.storage_usage),
        )
    )
    result = await db.execute(stmt)
    vendor = result.scalar_one_or_none()

    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor account not found for this user"
        )
    if vendor.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your vendor account is suspended. Please contact Digital Growth Studio."
        )

    return CurrentVendor(user=user, vendor=vendor)

