"""
Digital Growth Studio — AI Brief Models
"""
import uuid
from datetime import date, datetime
from sqlalchemy import String, ForeignKey, Date, DateTime, JSON, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.models.base import BaseModel


class AIDailyBrief(BaseModel):
    """
    AIDailyBrief model.
    Stores daily summarized performance snapshots and priority actions.
    """
    __tablename__ = "ai_daily_briefs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    report_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    overall_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,  # e.g., Improving, Declining, Stable
    )
    spend: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    results: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    primary_kpi: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # e.g., CPL, CPA, ROAS
    )
    primary_kpi_value: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    primary_kpi_change: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    biggest_win: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    biggest_problem: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    positive_changes: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    negative_changes: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    watch_items: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    opportunities: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    experiments: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    dont_change_items: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    top_priorities: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="daily_briefs")
    ad_account: Mapped["MetaAdAccount"] = relationship("MetaAdAccount", back_populates="daily_briefs")


class AIWeeklyBrief(BaseModel):
    """
    AIWeeklyBrief model.
    Stores weekly summarized performance and strategic learnings.
    """
    __tablename__ = "ai_weekly_briefs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    overall_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )
    spend: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    results: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    primary_kpi: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    primary_kpi_value: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    primary_kpi_change: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    biggest_win: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    biggest_problem: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    winning_pattern: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    creative_fatigue_items: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    opportunities: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    dont_change_items: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    experiments: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    top_priorities: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="weekly_briefs")
    ad_account: Mapped["MetaAdAccount"] = relationship("MetaAdAccount", back_populates="weekly_briefs")
