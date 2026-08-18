"""
Digital Growth Studio — AI Recommendation Model
"""
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, Numeric, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.models.base import BaseModel


class AIRecommendation(BaseModel):
    """
    AIRecommendation model.
    Stores rule-based optimization suggestions for ads, creatives, campaigns, or placements.
    """
    __tablename__ = "ai_recommendations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # campaign, ad_set, ad, creative
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,  # UUID mapping the targeted entity (Campaign.id, Ad.id, etc.)
    )
    recommendation_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # UNDERPERFORMING_AD, BUDGET_OPPORTUNITY, etc.
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    confidence_score: Mapped[float] = mapped_column(
        Numeric(precision=5, scale=4),
        nullable=False,
        default=0.0000,  # e.g., 0.9100 = 91% confidence
    )
    priority: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="medium",  # high, medium, low
    )
    supporting_metrics: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,  # Store supportive statistics JSON data
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="new",  # new, viewed, accepted, dismissed, expired
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="recommendations",
    )
    ad_account: Mapped["MetaAdAccount"] = relationship(
        "MetaAdAccount",
        back_populates="recommendations",
    )
