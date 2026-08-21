"""
Digital Growth Studio — AI Assistant Endpoints
"""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.api.v1.meta import get_db_user_from_claims
from app.models.user import User
from app.models.meta import MetaAdAccount
from app.models.ai_assistant import AIChatConversation, AIChatMessage
from app.services.ai_assistant_service import AIAssistantService

logger = logging.getLogger("ai_assistant_router")
router = APIRouter(prefix="/assistant", tags=["AI Assistant"])


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class CreditBalanceResponse(BaseModel):
    credits: int

class ConversationCreateRequest(BaseModel):
    ad_account_id: uuid.UUID
    title: Optional[str] = "New Conversation"

class ConversationResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: str
    updated_at: str

class MessageSendRequest(BaseModel):
    content: str
    ad_account_id: uuid.UUID

class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: str
    gemini_status: Optional[str] = None

class MessageSendResponse(BaseModel):
    role: str
    content: str
    credits_remaining: int


# ──────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────
async def verify_ad_account_ownership(db: AsyncSession, ad_account_id: uuid.UUID, user_id: uuid.UUID) -> MetaAdAccount:
    stmt = (
        select(MetaAdAccount)
        .where(MetaAdAccount.id == ad_account_id)
        .where(MetaAdAccount.user_id == user_id)
    )
    res = await db.execute(stmt)
    ad_acc = res.scalar_one_or_none()
    if not ad_acc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to the specified Meta ad account."
        )
    return ad_acc


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@router.get("/credits", response_model=CreditBalanceResponse, summary="Get AI Credits balance")
async def get_ai_credits(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns current user's AI credits balance.
    """
    user = await get_db_user_from_claims(claims, db)
    return CreditBalanceResponse(credits=user.credits)


@router.get("/conversations", response_model=List[ConversationResponse], summary="List assistant conversations")
async def list_conversations(
    ad_account_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists user conversation histories scoped to the active ad_account_id.
    """
    user = await get_db_user_from_claims(claims, db)
    await verify_ad_account_ownership(db, ad_account_id, user.id)

    stmt = (
        select(AIChatConversation)
        .where(AIChatConversation.user_id == user.id)
        .where(AIChatConversation.ad_account_id == ad_account_id)
        .order_by(AIChatConversation.updated_at.desc())
    )
    res = await db.execute(stmt)
    conversations = res.scalars().all()

    return [
        ConversationResponse(
            id=c.id,
            title=c.title,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
        )
        for c in conversations
    ]


@router.post("/conversations", response_model=ConversationResponse, summary="Create a new conversation session")
async def create_conversation(
    req: ConversationCreateRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Instantiates a new persistent chat session scoped to the selected ad account.
    """
    user = await get_db_user_from_claims(claims, db)
    await verify_ad_account_ownership(db, req.ad_account_id, user.id)

    convo = AIChatConversation(
        user_id=user.id,
        ad_account_id=req.ad_account_id,
        title=req.title or "New Conversation"
    )
    db.add(convo)
    await db.commit()
    await db.refresh(convo)

    return ConversationResponse(
        id=convo.id,
        title=convo.title,
        created_at=convo.created_at.isoformat(),
        updated_at=convo.updated_at.isoformat()
    )


@router.delete("/conversations/{conversation_id}", summary="Delete conversation session")
async def delete_conversation(
    conversation_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes conversation history session.
    """
    user = await get_db_user_from_claims(claims, db)
    
    stmt = (
        select(AIChatConversation)
        .where(AIChatConversation.id == conversation_id)
        .where(AIChatConversation.user_id == user.id)
    )
    res = await db.execute(stmt)
    convo = res.scalar_one_or_none()
    if not convo:
        raise HTTPException(
            status_code=status.HTTP_444_NOT_FOUND if hasattr(status, "HTTP_444_NOT_FOUND") else 404,
            detail="Conversation not found or access denied."
        )

    await db.delete(convo)
    await db.commit()
    return {"status": "success", "message": "Conversation history successfully removed."}


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse], summary="Get messages in conversation")
async def get_messages(
    conversation_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetches chat history messages for a conversation session.
    """
    user = await get_db_user_from_claims(claims, db)
    
    # Verify convo ownership
    stmt = (
        select(AIChatConversation)
        .where(AIChatConversation.id == conversation_id)
        .where(AIChatConversation.user_id == user.id)
    )
    res = await db.execute(stmt)
    convo = res.scalar_one_or_none()
    if not convo:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found or access denied."
        )

    msg_stmt = (
        select(AIChatMessage)
        .where(AIChatMessage.conversation_id == conversation_id)
        .order_by(AIChatMessage.created_at.asc())
    )
    msg_res = await db.execute(msg_stmt)
    messages = msg_res.scalars().all()

    return [
        MessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=m.created_at.isoformat(),
            gemini_status=m.gemini_status,
        )
        for m in messages
    ]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageSendResponse, summary="Send message to assistant")
async def send_message(
    conversation_id: uuid.UUID,
    req: MessageSendRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Sends user query message to Gemini Flash assistant in context of the selected ad account.
    """
    user = await get_db_user_from_claims(claims, db)
    
    # 1. Enforce Server-Side Ownership Boundaries
    await verify_ad_account_ownership(db, req.ad_account_id, user.id)

    # 2. Check Conversation session ownership and match ad account
    convo_stmt = (
        select(AIChatConversation)
        .where(AIChatConversation.id == conversation_id)
        .where(AIChatConversation.user_id == user.id)
        .where(AIChatConversation.ad_account_id == req.ad_account_id)
    )
    convo_res = await db.execute(convo_stmt)
    convo = convo_res.scalar_one_or_none()
    if not convo:
        raise HTTPException(
            status_code=400,
            detail="Conversation context does not match user account or selected ad account boundary."
        )

    # 3. Check credits before request
    if user.credits <= 0:
        raise HTTPException(
            status_code=400,
            detail="You've used all your AI Credits."
        )

    # 4. Invoke service
    reply, success = await AIAssistantService.process_user_message(
        db=db,
        user_id=user.id,
        ad_account_id=req.ad_account_id,
        conversation_id=conversation_id,
        message_content=req.content,
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail=reply
        )

    # Refresh user to fetch latest authoritative credits count
    await db.refresh(user)

    # Update conversation title if default and this is first user message
    if convo.title == "New Conversation":
        convo.title = req.content[:30] + ("..." if len(req.content) > 30 else "")
        db.add(convo)
        await db.commit()

    return MessageSendResponse(
        role="model",
        content=reply,
        credits_remaining=user.credits,
    )
