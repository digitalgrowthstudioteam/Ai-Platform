"""
Digital Growth Studio — User Model
"""
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional

from app.models.base import BaseModel


class User(BaseModel):
    """
    User model.
    External identity is managed by Firebase Auth (firebase_uid).
    """
    __tablename__ = "users"

    firebase_uid: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )
    name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    plan_id: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default="starter",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",  # active, inactive, suspended
    )

    # Relationships
    subscriptions: Mapped[List["Subscription"]] = relationship(
        "Subscription",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    subscription_addons: Mapped[List["SubscriptionAddOn"]] = relationship(
        "SubscriptionAddOn",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    meta_connections: Mapped[List["MetaConnection"]] = relationship(
        "MetaConnection",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    meta_ad_accounts: Mapped[List["MetaAdAccount"]] = relationship(
        "MetaAdAccount",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    recommendations: Mapped[List["AIRecommendation"]] = relationship(
        "AIRecommendation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
