"""
Digital Growth Studio — AI Assistant Models
"""
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from app.models.base import BaseModel


class AIChatConversation(BaseModel):
    """
    AIChatConversation model.
    Represents a persistent multi-turn chat session with Gemini Flash.
    Scoped strictly to user_id and ad_account_id.
    """
    __tablename__ = "ai_chat_conversations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="New Conversation",
    )

    # Relationships
    user: Mapped["User"] = relationship("User")
    ad_account: Mapped["MetaAdAccount"] = relationship("MetaAdAccount")
    messages: Mapped[List["AIChatMessage"]] = relationship(
        "AIChatMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AIChatMessage.created_at",
    )


class AIChatMessage(BaseModel):
    """
    AIChatMessage model.
    Represents an individual message (either user query or model response).
    """
    __tablename__ = "ai_chat_messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ai_chat_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(50),  # "user" or "model"
        nullable=False,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    gemini_status: Mapped[Optional[str]] = mapped_column(
        String(50),  # "success", "failed", or null for user messages
        nullable=True,
    )
    credit_transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ai_credit_transactions.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    conversation: Mapped["AIChatConversation"] = relationship(
        "AIChatConversation",
        back_populates="messages",
    )
    credit_transaction: Mapped[Optional["AICreditTransaction"]] = relationship(
        "AICreditTransaction",
        foreign_keys=[credit_transaction_id],
    )


class AICreditTransaction(BaseModel):
    """
    AICreditTransaction model.
    Audit log record representing a signed ledger transaction (grants, consumption, expiries, adjustments).
    """
    __tablename__ = "ai_credit_transactions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    ad_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("meta_ad_accounts.id", ondelete="CASCADE"),
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
    credit_amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )
    amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=-1,
    )
    credit_type: Mapped[str] = mapped_column(
        String(50),  # "monthly_included", "purchased", "trial"
        nullable=False,
        default="monthly_included",
    )
    transaction_type: Mapped[str] = mapped_column(
        String(50),  # "grant", "consume", "expire", "adjustment", "refund"
        nullable=False,
        default="consume",
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    reference_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    reason: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="AI Assistant response",
    )
    gemini_model: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default="gemini-1.5-flash",
    )
    request_reference_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User")
    ad_account: Mapped[Optional["MetaAdAccount"]] = relationship("MetaAdAccount")

