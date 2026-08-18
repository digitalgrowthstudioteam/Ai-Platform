"""
Digital Growth Studio — Meta Connections & Ad Accounts Models
"""
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from app.models.base import BaseModel
from app.core.security import encrypt_token, decrypt_token


class MetaConnection(BaseModel):
    """
    MetaConnection model.
    Stores encrypted OAuth access tokens for connecting to Meta Marketing API.
    """
    __tablename__ = "meta_connections"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    meta_user_id: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="connected",  # connected, expired, error, disconnected
    )
    access_token_encrypted: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_sync_status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,  # success, failed, in_progress
    )
    last_sync_error: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Cryptographic access properties
    @property
    def access_token(self) -> str:
        """Decrypt token when reading from model."""
        return decrypt_token(self.access_token_encrypted)

    @access_token.setter
    def access_token(self, token: str) -> None:
        """Encrypt token when writing to model."""
        self.access_token_encrypted = encrypt_token(token)

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="meta_connections",
    )
    ad_accounts: Mapped[List["MetaAdAccount"]] = relationship(
        "MetaAdAccount",
        back_populates="connection",
        cascade="all, delete-orphan",
    )


class MetaAdAccount(BaseModel):
    """
    MetaAdAccount model.
    Access-controlled Meta Ad Account links.
    """
    __tablename__ = "meta_ad_accounts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    meta_connection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_connections.id", ondelete="CASCADE"),
        nullable=False,
    )
    meta_account_id: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
    )
    account_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="INR",
    )
    timezone: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Asia/Kolkata",
    )
    account_status: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,  # 1 = ACTIVE, 2 = DISABLED, etc.
    )
    industry: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="meta_ad_accounts",
    )
    connection: Mapped["MetaConnection"] = relationship(
        "MetaConnection",
        back_populates="ad_accounts",
    )
    campaigns: Mapped[List["Campaign"]] = relationship(
        "Campaign",
        back_populates="ad_account",
        cascade="all, delete-orphan",
    )
    recommendations: Mapped[List["AIRecommendation"]] = relationship(
        "AIRecommendation",
        back_populates="ad_account",
        cascade="all, delete-orphan",
    )
