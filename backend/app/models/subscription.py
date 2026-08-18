"""
Digital Growth Studio — Subscription Model
"""
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.models.base import BaseModel


class Subscription(BaseModel):
    """
    Subscription model.
    Tracks plans and billing status (managed via Razorpay).
    """
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    plan: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="starter",  # starter, growth, scale
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",  # trial, active, past_due, cancelled, expired
    )
    razorpay_customer_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    razorpay_subscription_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="subscriptions",
    )
