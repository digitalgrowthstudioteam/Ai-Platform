"""
Digital Growth Studio — Meta Ads Service Database Models
"""
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Integer, JSON, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from app.models.base import BaseModel


class MetaAdServiceRequest(BaseModel):
    """
    MetaAdServiceRequest model.
    Tracks user's custom Meta Ads campaign setup requests, objectives, budgets, and operational progress.
    """
    __tablename__ = "meta_ad_service_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    campaign_plan_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("campaign_plans.id", ondelete="SET NULL"),
        nullable=True,
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    business_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    whatsapp_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    website: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    business_location: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    industry: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    industry_other: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    business_description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    advertised_product: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    campaign_objective: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    daily_budget: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    number_of_ads: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    creative_required: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    additional_services: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    meta_account_exists: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    meta_business_id: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
    )
    meta_ad_account_id: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="draft",  # draft, submitted, eligibility_review, eligible, restricted, quotation_generated, trial_started, whatsapp_pending, whatsapp_connected, partner_access_requested, partner_access_granted, campaign_setup, campaign_live, completed, cancelled, expired
    )
    partner_access_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="not_requested",  # not_requested, requested, pending, granted, rejected, revoked
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
    )
    quotations: Mapped[List["ServiceQuotation"]] = relationship(
        "ServiceQuotation",
        back_populates="service_request",
        cascade="all, delete-orphan",
    )
    ad_packs: Mapped[List["AdPack"]] = relationship(
        "AdPack",
        back_populates="service_request",
    )


class AdPack(BaseModel):
    """
    AdPack model.
    Tracks advertising packs purchased by the user, including total, used, remaining and expired credits.
    """
    __tablename__ = "ad_packs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    service_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("meta_ad_service_requests.id", ondelete="SET NULL"),
        nullable=True,
    )
    pack_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,  # promo_1_ad, pack_1, pack_3, pack_15, pack_30
    )
    total_ad_credits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    used_ad_credits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    remaining_ad_credits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    price_paid: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,  # in Paise
    )
    purchased_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",  # active, consumed, expired
    )
    non_refundable_terms_accepted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    non_refundable_terms_accepted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    order_statuses: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=dict,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
    )
    service_request: Mapped[Optional["MetaAdServiceRequest"]] = relationship(
        "MetaAdServiceRequest",
        back_populates="ad_packs",
    )


class ServiceQuotation(BaseModel):
    """
    ServiceQuotation model.
    Generated quotations for custom Meta Ad campaigns, account setup and creative services.
    """
    __tablename__ = "service_quotations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    service_request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_service_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    regular_total: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,  # in Paise
    )
    discount_total: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,  # in Paise
    )
    final_total: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,  # in Paise
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="INR",
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending",  # pending, paid, expired
    )
    items: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=list,  # JSON list of line items
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
    )
    service_request: Mapped["MetaAdServiceRequest"] = relationship(
        "MetaAdServiceRequest",
        back_populates="quotations",
    )


class CampaignPlan(BaseModel):
    """
    CampaignPlan model.
    Stores dynamically generated Meta Ads campaign plans and readiness scores.
    """
    __tablename__ = "campaign_plans"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    business_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    campaign_profile: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    report_data: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    readiness_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="generated",  # generated, converted
    )
    pdf_path: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id],
    )
