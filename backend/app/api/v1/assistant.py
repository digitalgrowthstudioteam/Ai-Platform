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
    monthly_credits_remaining: int = 0
    purchased_credits_remaining: int = 0
    trial_credits_remaining: int = 0
    monthly_credits_limit: int = 0
    monthly_credits_used: int = 0

class ConversationCreateRequest(BaseModel):
    ad_account_id: str
    title: Optional[str] = "New Conversation"

class ConversationResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: str
    updated_at: str

class MessageSendRequest(BaseModel):
    content: str
    ad_account_id: str
    campaign_id: Optional[uuid.UUID] = None
    adset_id: Optional[uuid.UUID] = None
    ad_id: Optional[uuid.UUID] = None

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
async def verify_ad_account_ownership(db: AsyncSession, ad_account_id: str, user_id: uuid.UUID) -> MetaAdAccount:
    from app.services.entitlement_engine import EntitlementEngine
    user_stmt = select(User).where(User.id == user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not found."
        )

    accessible_ids = await EntitlementEngine.get_accessible_user_ids(user, db)
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id.in_(accessible_ids))
    try:
        acc_uuid = uuid.UUID(ad_account_id)
        stmt = stmt.where(MetaAdAccount.id == acc_uuid)
    except (ValueError, TypeError):
        stmt = stmt.where(MetaAdAccount.meta_account_id == ad_account_id)

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
    ad_account_id: Optional[str] = None,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns current user's (or effective parent owner's) AI credits balance with detailed breakdown.
    """
    user = await get_db_user_from_claims(claims, db)
    
    # If ad_account_id is provided, resolve effective workspace owner user
    target_user = user
    if ad_account_id:
        try:
            from app.services.entitlement_engine import EntitlementEngine
            accessible_ids = await EntitlementEngine.get_accessible_user_ids(user, db)
            stmt = select(MetaAdAccount).where(MetaAdAccount.user_id.in_(accessible_ids))
            try:
                acc_uuid = uuid.UUID(ad_account_id)
                stmt = stmt.where(MetaAdAccount.id == acc_uuid)
            except (ValueError, TypeError):
                stmt = stmt.where(MetaAdAccount.meta_account_id == ad_account_id)
            res = await db.execute(stmt)
            acc = res.scalar_one_or_none()
            if acc:
                owner_stmt = select(User).where(User.id == acc.user_id)
                owner_res = await db.execute(owner_stmt)
                owner_user = owner_res.scalar_one_or_none()
                if owner_user:
                    target_user = owner_user
        except Exception as resolve_err:
            logger.error("failed_resolving_effective_user_credits", error=str(resolve_err))

    # Auto-heal credits reset in case they hit this read route first
    from app.services.entitlement_engine import EntitlementEngine
    try:
        await EntitlementEngine.check_and_reset_monthly_credits(target_user, db)
    except Exception as reset_err:
        logger.error("failed_credits_reset_self_healing_read", error=str(reset_err))
        
    plan_config = EntitlementEngine.get_plan_config(target_user.plan_id)
    monthly_limit = plan_config.get("monthly_credits", 0)
    monthly_used = max(0, monthly_limit - target_user.monthly_credits_remaining)
    
    return CreditBalanceResponse(
        credits=target_user.credits,
        monthly_credits_remaining=target_user.monthly_credits_remaining,
        purchased_credits_remaining=target_user.purchased_credits_remaining,
        trial_credits_remaining=target_user.trial_credits_remaining,
        monthly_credits_limit=monthly_limit,
        monthly_credits_used=monthly_used
    )


@router.get("/conversations", response_model=List[ConversationResponse], summary="List assistant conversations")
async def list_conversations(
    ad_account_id: str,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists user conversation histories scoped to the active ad_account_id (UUID or meta_account_id string).
    """
    user = await get_db_user_from_claims(claims, db)
    ad_acc = await verify_ad_account_ownership(db, ad_account_id, user.id)

    stmt = (
        select(AIChatConversation)
        .where(AIChatConversation.user_id == user.id)
        .where(AIChatConversation.ad_account_id == ad_acc.id)
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
    ad_acc = await verify_ad_account_ownership(db, req.ad_account_id, user.id)

    convo = AIChatConversation(
        user_id=user.id,
        ad_account_id=ad_acc.id,
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
    ad_acc = await verify_ad_account_ownership(db, req.ad_account_id, user.id)

    # 2. Check Conversation session ownership and match ad account
    convo_stmt = (
        select(AIChatConversation)
        .where(AIChatConversation.id == conversation_id)
        .where(AIChatConversation.user_id == user.id)
        .where(AIChatConversation.ad_account_id == ad_acc.id)
    )
    convo_res = await db.execute(convo_stmt)
    convo = convo_res.scalar_one_or_none()
    if not convo:
        raise HTTPException(
            status_code=400,
            detail="Conversation context does not match user account or selected ad account boundary."
        )

    # Load parent owner user to check and deduct credits if team shared
    effective_user = user
    if ad_acc.user_id != user.id:
        owner_stmt = select(User).where(User.id == ad_acc.user_id)
        owner_res = await db.execute(owner_stmt)
        owner_user = owner_res.scalar_one_or_none()
        if owner_user:
            effective_user = owner_user

    # 3. Check credits before request
    if effective_user.credits <= 0:
        raise HTTPException(
            status_code=400,
            detail="You've used all your AI Credits."
        )

    # 4. Invoke service
    reply, success = await AIAssistantService.process_user_message(
        db=db,
        user_id=effective_user.id,
        ad_account_id=ad_acc.id,
        conversation_id=conversation_id,
        message_content=req.content,
        campaign_id=req.campaign_id,
        adset_id=req.adset_id,
        ad_id=req.ad_id,
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail=reply
        )

    # Refresh effective user to fetch latest authoritative credits count
    await db.refresh(effective_user)

    # Update conversation title if default and this is first user message
    if convo.title == "New Conversation":
        convo.title = req.content[:30] + ("..." if len(req.content) > 30 else "")
        db.add(convo)
        await db.commit()

    return MessageSendResponse(
        role="model",
        content=reply,
        credits_remaining=effective_user.credits,
    )
