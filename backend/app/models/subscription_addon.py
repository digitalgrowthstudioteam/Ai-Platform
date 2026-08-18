"""
Digital Growth Studio — Subscription Add-On Model
"""
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class SubscriptionAddOn(BaseModel):
    """
    Subscription Add-On model.
    Tracks individual purchased SaaS add-ons (Faster Sync, Ad Account limit scale, etc.).
    """
    __tablename__ = "subscription_addons"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    addon_id: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )  # e.g., additional_account, faster_sync, lifetime_history_monthly, lifetime_history_annual, ai_deep_analysis, additional_team_member
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",  # active, cancelled, expired
    )
    razorpay_payment_id: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="subscription_addons",
    )
