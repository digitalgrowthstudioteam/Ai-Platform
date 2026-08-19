"""
Digital Growth Studio — Campaigns, Ad Sets, & Ads Models
"""
import uuid
from sqlalchemy import String, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from app.models.base import BaseModel


class Campaign(BaseModel):
    """
    Campaign model.
    Maps Meta Ads Campaigns.
    """
    __tablename__ = "campaigns"

    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    meta_campaign_id: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    objective: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",
    )
    buying_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="AUCTION",
    )
    daily_budget: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=14, scale=2),
        nullable=True,
    )
    lifetime_budget: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=14, scale=2),
        nullable=True,
    )

    # Relationships
    ad_account: Mapped["MetaAdAccount"] = relationship(
        "MetaAdAccount",
        back_populates="campaigns",
    )
    ad_sets: Mapped[List["AdSet"]] = relationship(
        "AdSet",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )
    daily_metrics: Mapped[List["CampaignDailyMetrics"]] = relationship(
        "CampaignDailyMetrics",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )
    aggregates: Mapped[List["CampaignMetricsAggregate"]] = relationship(
        "CampaignMetricsAggregate",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )


class AdSet(BaseModel):
    """
    AdSet model.
    Maps Meta Ads Ad Sets.
    """
    __tablename__ = "ad_sets"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    meta_adset_id: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",
    )
    optimization_goal: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    billing_event: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    motive: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    performance_goal: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    optimization_event: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    performance_goal_profile_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    daily_budget: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=14, scale=2),
        nullable=True,
    )
    lifetime_budget: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=14, scale=2),
        nullable=True,
    )

    # Relationships
    campaign: Mapped["Campaign"] = relationship(
        "Campaign",
        back_populates="ad_sets",
    )
    ads: Mapped[List["Ad"]] = relationship(
        "Ad",
        back_populates="ad_set",
        cascade="all, delete-orphan",
    )
    daily_metrics: Mapped[List["AdSetDailyMetrics"]] = relationship(
        "AdSetDailyMetrics",
        back_populates="ad_set",
        cascade="all, delete-orphan",
    )
    aggregates: Mapped[List["AdSetMetricsAggregate"]] = relationship(
        "AdSetMetricsAggregate",
        back_populates="ad_set",
        cascade="all, delete-orphan",
    )


class Ad(BaseModel):
    """
    Ad model.
    Maps Meta Ads Ads.
    """
    __tablename__ = "ads"

    ad_set_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ad_sets.id", ondelete="CASCADE"),
        nullable=False,
    )
    meta_ad_id: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ACTIVE",
    )
    creative_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("creatives.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    ad_set: Mapped["AdSet"] = relationship(
        "AdSet",
        back_populates="ads",
    )
    creatives: Mapped[List["Creative"]] = relationship(
        "Creative",
        back_populates="ad",
        foreign_keys="[Creative.ad_id]",
        cascade="all, delete-orphan",
    )
    daily_metrics: Mapped[List["AdDailyMetrics"]] = relationship(
        "AdDailyMetrics",
        back_populates="ad",
        cascade="all, delete-orphan",
    )
    breakdown_metrics: Mapped[List["AdBreakdownDailyMetrics"]] = relationship(
        "AdBreakdownDailyMetrics",
        back_populates="ad",
        cascade="all, delete-orphan",
    )
    aggregates: Mapped[List["AdMetricsAggregate"]] = relationship(
        "AdMetricsAggregate",
        back_populates="ad",
        cascade="all, delete-orphan",
    )
