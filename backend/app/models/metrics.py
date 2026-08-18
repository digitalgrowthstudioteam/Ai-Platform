"""
Digital Growth Studio — Metrics Models
Daily, breakdown, and aggregated performance statistics.
"""
import uuid
from datetime import date
from sqlalchemy import (
    String,
    ForeignKey,
    Numeric,
    Integer,
    Date,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.models.base import BaseModel


# ──────────────────────────────────────────────
# Base Metric Fields Mixin (Common to daily/aggregates)
# ──────────────────────────────────────────────
class MetricFieldsMixin:
    """Reusable statistical columns for ad performance."""
    impressions: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    reach: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    frequency: Mapped[Optional[float]] = mapped_column(Numeric(precision=6, scale=2), nullable=True)
    spend: Mapped[Optional[float]] = mapped_column(Numeric(precision=14, scale=2), nullable=True)
    clicks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    link_clicks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ctr: Mapped[Optional[float]] = mapped_column(Numeric(precision=6, scale=4), nullable=True)
    link_ctr: Mapped[Optional[float]] = mapped_column(Numeric(precision=6, scale=4), nullable=True)
    cpc: Mapped[Optional[float]] = mapped_column(Numeric(precision=14, scale=2), nullable=True)
    link_cpc: Mapped[Optional[float]] = mapped_column(Numeric(precision=14, scale=2), nullable=True)
    cpm: Mapped[Optional[float]] = mapped_column(Numeric(precision=14, scale=2), nullable=True)
    actions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Store JSON map of actions/events
    leads: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    purchases: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    revenue: Mapped[Optional[float]] = mapped_column(Numeric(precision=14, scale=2), nullable=True)
    cpl: Mapped[Optional[float]] = mapped_column(Numeric(precision=14, scale=2), nullable=True)
    cpp: Mapped[Optional[float]] = mapped_column(Numeric(precision=14, scale=2), nullable=True)
    roas: Mapped[Optional[float]] = mapped_column(Numeric(precision=8, scale=2), nullable=True)


# ──────────────────────────────────────────────
# Daily Performance Models
# ──────────────────────────────────────────────
class CampaignDailyMetrics(BaseModel, MetricFieldsMixin):
    """Campaign-level daily statistics."""
    __tablename__ = "campaign_daily_metrics"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)

    __table_args__ = (
        UniqueConstraint("campaign_id", "date", name="uq_campaign_daily_metrics_date"),
    )

    # Relationships
    campaign: Mapped["Campaign"] = relationship(
        "Campaign",
        back_populates="daily_metrics",
    )


class AdSetDailyMetrics(BaseModel, MetricFieldsMixin):
    """AdSet-level daily statistics."""
    __tablename__ = "adset_daily_metrics"

    ad_set_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ad_sets.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)

    __table_args__ = (
        UniqueConstraint("ad_set_id", "date", name="uq_adset_daily_metrics_date"),
    )

    # Relationships
    ad_set: Mapped["AdSet"] = relationship(
        "AdSet",
        back_populates="daily_metrics",
    )


class AdDailyMetrics(BaseModel, MetricFieldsMixin):
    """Ad-level daily statistics."""
    __tablename__ = "ad_daily_metrics"

    ad_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ads.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)

    __table_args__ = (
        UniqueConstraint("ad_id", "date", name="uq_ad_daily_metrics_date"),
    )

    # Relationships
    ad: Mapped["Ad"] = relationship(
        "Ad",
        back_populates="daily_metrics",
    )


# ──────────────────────────────────────────────
# Breakdown Metrics Models
# ──────────────────────────────────────────────
class AdBreakdownDailyMetrics(BaseModel, MetricFieldsMixin):
    """Ad-level daily breakdown metrics (placement, publisher, age, gender, etc.)."""
    __tablename__ = "ad_breakdown_daily_metrics"

    ad_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ads.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    breakdown_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,  # age, gender, country, placement, device
    )
    breakdown_value: Mapped[str] = mapped_column(
        String(100),
        nullable=False,  # e.g., "18-24", "male", "US", "instagram_reels"
    )

    __table_args__ = (
        UniqueConstraint(
            "ad_id", "date", "breakdown_type", "breakdown_value",
            name="uq_ad_breakdown_daily_metrics_key"
        ),
    )

    # Relationships
    ad: Mapped["Ad"] = relationship(
        "Ad",
        back_populates="breakdown_metrics",
    )


# ──────────────────────────────────────────────
# Aggregate Performance Cache Models
# ──────────────────────────────────────────────
class CampaignMetricsAggregate(BaseModel, MetricFieldsMixin):
    """Pre-calculated campaign statistics aggregates (7d, 30d, 90d, etc.)."""
    __tablename__ = "campaign_metrics_aggregate"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    window: Mapped[str] = mapped_column(
        String(10),
        nullable=False,  # 1d, 3d, 7d, 14d, 30d, 90d, lifetime
    )

    __table_args__ = (
        UniqueConstraint("campaign_id", "window", name="uq_campaign_metrics_aggregate_window"),
    )

    # Relationships
    campaign: Mapped["Campaign"] = relationship(
        "Campaign",
        back_populates="aggregates",
    )


class AdSetMetricsAggregate(BaseModel, MetricFieldsMixin):
    """Pre-calculated AdSet statistics aggregates."""
    __tablename__ = "adset_metrics_aggregate"

    ad_set_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ad_sets.id", ondelete="CASCADE"),
        nullable=False,
    )
    window: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("ad_set_id", "window", name="uq_adset_metrics_aggregate_window"),
    )

    # Relationships
    ad_set: Mapped["AdSet"] = relationship(
        "AdSet",
        back_populates="aggregates",
    )


class AdMetricsAggregate(BaseModel, MetricFieldsMixin):
    """Pre-calculated Ad statistics aggregates."""
    __tablename__ = "ad_metrics_aggregate"

    ad_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ads.id", ondelete="CASCADE"),
        nullable=False,
    )
    window: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("ad_id", "window", name="uq_ad_metrics_aggregate_window"),
    )

    # Relationships
    ad: Mapped["Ad"] = relationship(
        "Ad",
        back_populates="aggregates",
    )
