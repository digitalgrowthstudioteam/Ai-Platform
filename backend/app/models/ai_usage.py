"""
Digital Growth Studio — AI Usage Model
"""
import uuid
from sqlalchemy import String, ForeignKey, Integer, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

from app.models.base import BaseModel


class AIUsageRecord(BaseModel):
    """
    AIUsageRecord model.
    Tracks exact Gemini token counts, estimated USD costs, and credit allocations.
    """
    __tablename__ = "ai_usage_records"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ad_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    conversation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ai_chat_conversations.id", ondelete="SET NULL"),
        nullable=True,
    )
    message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ai_chat_messages.id", ondelete="SET NULL"),
        nullable=True,
    )
    request_id: Mapped[Optional[str]] = mapped_column(
        String(128),
        index=True,
        nullable=True,
    )
    model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    request_type: Mapped[str] = mapped_column(
        String(50),  # "ai_assistant" or "ai_optimization"
        nullable=False,
    )
    input_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    output_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    thinking_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    total_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    estimated_cost: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    credit_charged: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    credit_transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ai_credit_transactions.id", ondelete="SET NULL"),
        nullable=True,
    )
    success: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    error_code: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User")
    ad_account: Mapped[Optional["MetaAdAccount"]] = relationship("MetaAdAccount")
    conversation: Mapped[Optional["AIChatConversation"]] = relationship("AIChatConversation")
    message: Mapped[Optional["AIChatMessage"]] = relationship("AIChatMessage", foreign_keys=[message_id])
    credit_transaction: Mapped[Optional["AICreditTransaction"]] = relationship("AICreditTransaction", foreign_keys=[credit_transaction_id])
