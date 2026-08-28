from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel

class EmailTemplateConfig(BaseModel):
    """
    EmailTemplateConfig model.
    Stores customizable email templates for global notification triggers.
    """
    __tablename__ = "email_template_configs"

    trigger_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    subject_template: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    body_template: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
