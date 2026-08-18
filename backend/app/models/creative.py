"""
Digital Growth Studio — Creative Model
"""
import uuid
from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.models.base import BaseModel


class Creative(BaseModel):
    """
    Creative model.
    Stores copy variations, visual URLs, CTA formats, and landing pages.
    """
    __tablename__ = "creatives"

    meta_creative_id: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
    )
    ad_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ads.id", ondelete="SET NULL"),
        nullable=True,
    )
    headline: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    primary_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    call_to_action: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    image_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    video_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    creative_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,  # image, video, carousel, collection, fallback
    )
    landing_page_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    ad: Mapped[Optional["Ad"]] = relationship(
        "Ad",
        back_populates="creatives",
        foreign_keys=[ad_id],
    )
