"""
Digital Growth Studio — Account Memory & Ad Experiments Models
"""
import uuid
from datetime import date
from sqlalchemy import String, ForeignKey, JSON, Integer, Float, Date
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class AccountMemory(BaseModel):
    """
    Account Memory model.
    Stores the persistent historical intelligence patterns learned for each Meta Ad Account.
    """
    __tablename__ = "account_memories"

    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    pattern_type: Mapped[str] = mapped_column(
        String(100),  # e.g., "FORMAT", "HOOK", "HEADLINE", "PLACEMENT", "AUDIENCE"
        nullable=False,
    )
    pattern_key: Mapped[str] = mapped_column(
        String(100),  # e.g., "VIDEO_VS_STATIC", "PROBLEM_HOOK_VS_GENERIC"
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    supporting_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=True,
    )
    confidence_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.90,
    )
    sample_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=10,
    )
    date_range: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="last_90d",
    )
    status: Mapped[str] = mapped_column(
        String(50),  # e.g., "VALIDATED", "CHANGING", "REVERSED"
        nullable=False,
        default="VALIDATED",
    )


class AdExperiment(BaseModel):
    """
    Ad Experiment model.
    Tracks A/B testing and experimentation variables, control and variant entities,
    hypotheses, and result uplifts.
    """
    __tablename__ = "ad_experiments"

    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    control_entity_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
    )
    variant_entity_id: Mapped[uuid.UUID] = mapped_column(
        nullable=False,
    )
    hypothesis: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    primary_metric: Mapped[str] = mapped_column(
        String(50),  # e.g., "CTR", "CPC", "ROAS", "CPL"
        nullable=False,
        default="CTR",
    )
    secondary_metrics: Mapped[dict] = mapped_column(
        JSON,
        nullable=True,  # e.g., ["CPL", "ROAS"]
    )
    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),  # e.g., "ACTIVE", "COMPLETED", "PAUSED"
        nullable=False,
        default="ACTIVE",
    )
    winner: Mapped[str] = mapped_column(
        String(50),  # e.g., "VARIANT", "CONTROL", "TIE", "INSUFFICIENT_DATA"
        nullable=True,
    )
    confidence_score: Mapped[float] = mapped_column(
        Float,
        nullable=True,
    )
    results_summary: Mapped[dict] = mapped_column(
        JSON,
        nullable=True,  # e.g., {"ctr_diff_pct": 28.0, "cpl_diff_pct": -17.0}
    )
