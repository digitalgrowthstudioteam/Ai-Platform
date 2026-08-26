"""
Digital Growth Studio — Manual Expense Model
"""
import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional

from app.models.base import BaseModel


class ManualExpense(BaseModel):
    """
    ManualExpense model.
    Tracks offline or manual business expenses recorded by administrators.
    """
    __tablename__ = "manual_expenses"

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )  # e.g., "marketing", "servers", "salaries", "office", "tools", "other"
    amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="INR",
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    expense_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )
