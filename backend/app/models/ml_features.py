"""
Digital Growth Studio — ML Feature Store Model (Phase 10)

Stores extracted features from creative/audience/performance data
in a structured format ready for future machine learning pipelines.

V1: Rules + statistics + AI explanation
Later: Machine Learning model training from this feature store.
"""
import uuid
from datetime import date
from sqlalchemy import (
    String,
    ForeignKey,
    Numeric,
    Integer,
    Date,
    Float,
    Boolean,
    JSON,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.models.base import BaseModel


class MLFeatureRecord(BaseModel):
    """
    ML-ready feature record for a single ad entity at a point in time.
    Captures creative, audience, and performance features for future ML.
    """
    __tablename__ = "ml_feature_store"

    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    ad_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ads.id", ondelete="SET NULL"),
        nullable=True,
    )
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
    )
    feature_date: Mapped[date] = mapped_column(Date, nullable=False)

    # ── Creative Features ──
    creative_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # image, video, carousel, collection
    creative_length: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )  # video duration in seconds, 0 for images
    headline_length: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    primary_text_length: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    hook_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # problem, benefit, question, statistic, story
    has_offer: Mapped[Optional[bool]] = mapped_column(
        Boolean, nullable=True, default=False
    )
    has_price: Mapped[Optional[bool]] = mapped_column(
        Boolean, nullable=True, default=False
    )
    has_social_proof: Mapped[Optional[bool]] = mapped_column(
        Boolean, nullable=True, default=False
    )
    cta_type: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )

    # ── Audience & Placement Features ──
    placement: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # feed, reels, stories, audience_network
    audience_type: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )  # broad, lookalike, retargeting, interest
    age_group: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True
    )  # 18-24, 25-34, 35-44, 45-54, 55-64, 65+
    gender: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True
    )  # male, female, all

    # ── Performance Features ──
    spend: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=14, scale=2), nullable=True
    )
    impressions: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    ctr: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )
    cpc: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )
    cpm: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )
    conversion_rate: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )
    cpl: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )
    roas: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )
    frequency: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )

    # ── Outcome label (for future supervised ML) ──
    outcome_label: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # winner, loser, average, fatigue

    # ── Raw extra features for extensibility ──
    extra_features: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )

    __table_args__ = (
        UniqueConstraint("ad_id", "feature_date", name="uq_ml_feature_ad_date"),
    )


class OptimizationAction(BaseModel):
    """
    Future automation architecture — stores user-approved optimization actions.
    This preserves the pipeline:
      Recommendation → User Approval → Optimization Action → Meta API → Result → Monitoring → Rollback → Learning

    Meta write access is NOT implemented in V1. This model stores the intent
    and approval workflow so the architecture is ready when write access is enabled.
    """
    __tablename__ = "optimization_actions"

    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    recommendation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ai_recommendations.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Action Details ──
    action_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # PAUSE_AD, INCREASE_BUDGET, DECREASE_BUDGET, EXCLUDE_PLACEMENT, CHANGE_TARGETING, LAUNCH_CREATIVE
    entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # campaign, adset, ad
    entity_id: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True
    )
    description: Mapped[str] = mapped_column(
        Text, nullable=False
    )

    # ── Approval Workflow ──
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="PENDING_APPROVAL"
    )  # PENDING_APPROVAL, APPROVED, EXECUTED, FAILED, ROLLED_BACK, CANCELLED
    approved_at: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    executed_at: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    rolled_back_at: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )

    # ── Monitoring & Rollback ──
    pre_action_metrics: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # Snapshot of metrics before action
    post_action_metrics: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )  # Snapshot of metrics after action (filled during monitoring)
    rollback_reason: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    # ── Learning ──
    learning_outcome: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # What was learned from this action (fed back into Account Memory)
    learning_committed: Mapped[Optional[bool]] = mapped_column(
        Boolean, nullable=True, default=False
    )  # Whether the learning has been committed to Account Memory
