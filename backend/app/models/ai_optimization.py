"""
Digital Growth Studio — AI Optimization Config & Log Models
"""
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, Boolean, Numeric, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.models.base import BaseModel


class AIOptimizationConfig(BaseModel):
    """
    AIOptimizationConfig model.
    Stores the configuration, targets, and memory/context for campaigns that have AI Optimization active.
    """
    __tablename__ = "ai_optimization_configs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    
    # AI Campaign Settings & Target Metrics (AI Memory context)
    business_objective: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    primary_kpi: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    secondary_kpi: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    target_cpl: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=14, scale=2),
        nullable=True,
    )
    target_cpa: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=14, scale=2),
        nullable=True,
    )
    target_roas: Mapped[Optional[float]] = mapped_column(
        Numeric(precision=14, scale=2),
        nullable=True,
    )

    last_analysis_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    
    # Campaign AI Memory (historical findings, resolved patterns, recommendations metadata)
    memory: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        server_default="{}",
    )

    # Relationships
    user = relationship("User", backref="ai_optimization_configs")
    ad_account = relationship("MetaAdAccount", backref="ai_optimization_configs")
    campaign = relationship("Campaign", backref="ai_optimization_config")


class AIOptimizationLog(BaseModel):
    """
    AIOptimizationLog model.
    Audit log tracking analysis execution, triggering context, and Gemini reasoning calls.
    """
    __tablename__ = "ai_optimization_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    analysis_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )
    trigger_type: Mapped[str] = mapped_column(
        String(50),
        default="SYNC",  # SYNC or MANUAL
        nullable=False,
    )
    context_version: Mapped[str] = mapped_column(
        String(20),
        default="1.0",
        nullable=False,
    )
    gemini_model: Mapped[str] = mapped_column(
        String(100),
        default="gemini-1.5-flash",
        nullable=False,
    )
    recommendations_generated: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="SUCCESS",  # SUCCESS, NO_CHANGE_DETECTED, ERROR
        nullable=False,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        nullable=True,
    )

    # Relationships
    user = relationship("User", backref="ai_optimization_logs")
    ad_account = relationship("MetaAdAccount", backref="ai_optimization_logs")
    campaign = relationship("Campaign", backref="ai_optimization_logs")
