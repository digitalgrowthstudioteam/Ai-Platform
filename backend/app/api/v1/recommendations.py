"""
Digital Growth Studio — AI Recommendations Router
"""
import uuid
import structlog
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.api.v1.meta import get_db_user_from_claims
from app.models.meta import MetaAdAccount
from app.models.recommendation import AIRecommendation

logger = structlog.get_logger()
router = APIRouter(prefix="/recommendations", tags=["AI Recommendations"])


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class AIRecommendationResponse(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    recommendation_type: str
    title: str
    description: str
    reason: str
    confidence_score: float
    priority: str
    supporting_metrics: Optional[dict] = None
    status: str


class RecommendationActionResponse(BaseModel):
    status: str
    message: str


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("", response_model=List[AIRecommendationResponse], summary="List AI recommendations")
async def list_recommendations(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns list of active optimization suggestions calculated by the AI engine.
    """
    user = await get_db_user_from_claims(claims, db)

    # Resolve Active Ad Account
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
    try:
        acc_uuid = uuid.UUID(ad_account_id)
        stmt = stmt.where(MetaAdAccount.id == acc_uuid)
    except ValueError:
        stmt = stmt.where(MetaAdAccount.meta_account_id == ad_account_id)

    res = await db.execute(stmt)
    ad_acc = res.scalar_one_or_none()
    if not ad_acc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active ad account not found."
        )

    # Fetch active recommendations (new, viewed)
    stmt = (
        select(AIRecommendation)
        .where(AIRecommendation.ad_account_id == ad_acc.id)
        .where(AIRecommendation.status.in_(["new", "viewed"]))
        .order_by(AIRecommendation.priority.asc(), AIRecommendation.created_at.desc())
    )
    
    res = await db.execute(stmt)
    recs = res.scalars().all()
    
    return [
        AIRecommendationResponse(
            id=r.id,
            entity_type=r.entity_type,
            entity_id=r.entity_id,
            recommendation_type=r.recommendation_type,
            title=r.title,
            description=r.description,
            reason=r.reason,
            confidence_score=float(r.confidence_score),
            priority=r.priority,
            supporting_metrics=r.supporting_metrics,
            status=r.status,
        )
        for r in recs
    ]


@router.post("/{recommendation_id}/apply", response_model=RecommendationActionResponse, summary="Apply a recommendation")
async def apply_recommendation(
    recommendation_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Applies the recommendation parameters, updating its status to accepted.
    """
    user = await get_db_user_from_claims(claims, db)

    stmt = select(AIRecommendation).where(AIRecommendation.id == recommendation_id)
    res = await db.execute(stmt)
    rec = res.scalar_one_or_none()
    
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found."
        )

    # Verify authorization
    stmt_acc = select(MetaAdAccount).where(MetaAdAccount.id == rec.ad_account_id).where(MetaAdAccount.user_id == user.id)
    res_acc = await db.execute(stmt_acc)
    if not res_acc.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this ad account pipeline."
        )

    # Set status to accepted
    rec.status = "accepted"
    rec.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return RecommendationActionResponse(
        status="success",
        message=f"Recommendation '{rec.title}' successfully accepted."
    )


@router.post("/{recommendation_id}/dismiss", response_model=RecommendationActionResponse, summary="Dismiss a recommendation")
async def dismiss_recommendation(
    recommendation_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dismisses the recommendation card, setting status to dismissed.
    """
    user = await get_db_user_from_claims(claims, db)

    stmt = select(AIRecommendation).where(AIRecommendation.id == recommendation_id)
    res = await db.execute(stmt)
    rec = res.scalar_one_or_none()
    
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found."
        )

    # Verify authorization
    stmt_acc = select(MetaAdAccount).where(MetaAdAccount.id == rec.ad_account_id).where(MetaAdAccount.user_id == user.id)
    res_acc = await db.execute(stmt_acc)
    if not res_acc.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_430_FORBIDDEN if hasattr(status, "HTTP_430_FORBIDDEN") else status.HTTP_403_FORBIDDEN,
            detail="You do not own this ad account pipeline."
        )

    # Set status to dismissed
    rec.status = "dismissed"
    rec.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return RecommendationActionResponse(
        status="success",
        message="Recommendation successfully dismissed."
    )
