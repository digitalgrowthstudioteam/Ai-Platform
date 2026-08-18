import uuid
import structlog
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.api.v1.meta import get_db_user_from_claims
from app.models.user import User
from app.models.ticket import SupportTicket

logger = structlog.get_logger()
router = APIRouter(prefix="/support", tags=["Help & Support Tickets"])


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class SupportTicketCreateRequest(BaseModel):
    subject: str
    description: str
    category: str = "General Support"


class SupportTicketResponse(BaseModel):
    id: uuid.UUID
    subject: str
    description: str
    category: str
    status: str
    admin_reply: Optional[str] = None
    created_at: datetime


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("/tickets", response_model=List[SupportTicketResponse], summary="Query user support tickets")
async def list_user_tickets(
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns lists of all tickets raised by the currently logged in user.
    """
    user = await get_db_user_from_claims(claims, db)
    stmt = select(SupportTicket).where(SupportTicket.user_id == user.id).order_by(SupportTicket.created_at.desc())
    res = await db.execute(stmt)
    tickets = res.scalars().all()
    return tickets


@router.post("/tickets", response_model=SupportTicketResponse, summary="Raise a help support ticket")
async def create_support_ticket(
    req: SupportTicketCreateRequest,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new support ticket in the database.
    """
    user = await get_db_user_from_claims(claims, db)

    ticket = SupportTicket(
        user_id=user.id,
        subject=req.subject,
        description=req.description,
        category=req.category,
        status="open",
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    logger.info("support_ticket_raised", user_id=user.id, ticket_id=ticket.id)
    return ticket
