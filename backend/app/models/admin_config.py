"""
Digital Growth Studio — Admin Config Model
"""
from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class AdminConfig(BaseModel):
    """
    AdminConfig model.
    Stores generic configurations like pricing, plans, credit packs, and trial limits.
    """
    __tablename__ = "admin_configs"

    key: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    value: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )
