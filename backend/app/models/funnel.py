"""
Digital Growth Studio — Funnel Database Models
"""
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.models.base import BaseModel


class FunnelRecommendation(BaseModel):
    """
    FunnelRecommendation model.
    Stores the campaign recommendation answers, computed Strategy Readiness Score, and top priorities.
    """
    __tablename__ = "funnel_recommendations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    answers: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )
    score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    priorities: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
    )


class FunnelAudit(BaseModel):
    """
    FunnelAudit model.
    Stores metadata and computed results for Free Ads Health Check audits.
    """
    __tablename__ = "funnel_audits"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    period_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=30,
    )
    health_score: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    metrics: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )
    campaigns: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )
    findings: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )
    pdf_path: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
    )
    ad_account: Mapped["MetaAdAccount"] = relationship(
        "MetaAdAccount",
        foreign_keys=[ad_account_id],
    )


class FunnelEvent(BaseModel):
    """
    FunnelEvent model.
    Tracks funnel conversion progression and drop-off analytics.
    """
    __tablename__ = "funnel_events"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    payload: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[user_id],
    )
