"""
Digital Growth Studio — User Model
"""
from datetime import datetime
from sqlalchemy import String, DateTime, Integer
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
    credits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",  # active, inactive, suspended
    )
    deletion_scheduled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    trial_started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    trial_ends_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    trial_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="not_started",
    )
    trial_used: Mapped[bool] = mapped_column(
        nullable=False,
        default=False,
    )
    trial_meta_account_id: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
    )
    trial_credits_remaining: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    monthly_credits_remaining: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    purchased_credits_remaining: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    admin_assigned_optimization_slots: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    last_credits_reset_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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
    daily_briefs: Mapped[List["AIDailyBrief"]] = relationship(
        "AIDailyBrief",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    weekly_briefs: Mapped[List["AIWeeklyBrief"]] = relationship(
        "AIWeeklyBrief",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    team_members: Mapped[List["TeamMember"]] = relationship(
        "TeamMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    support_tickets: Mapped[List["SupportTicket"]] = relationship(
        "SupportTicket",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )
