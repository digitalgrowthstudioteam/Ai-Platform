"""
Digital Growth Studio — Campaigns Router
"""
import uuid
import structlog
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_user, require_active_subscription
from app.api.v1.meta import get_db_user_from_claims
from app.models.meta import MetaAdAccount
from app.models.campaign import Campaign
from app.models.metrics import CampaignDailyMetrics

logger = structlog.get_logger()
router = APIRouter(
    prefix="/campaigns",
    tags=["Campaigns"],
    dependencies=[Depends(require_active_subscription)],
)


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class CampaignMetrics(BaseModel):
    spend: float
    impressions: int
    clicks: int
    purchases: int
    revenue: float
    ctr: float
    cpc: float
    cpm: float
    roas: float


class CampaignItemResponse(BaseModel):
    id: uuid.UUID
    meta_campaign_id: str
    name: str
    objective: str
    status: str
    daily_budget: Optional[float]
    lifetime_budget: Optional[float]
    metrics: CampaignMetrics


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("", response_model=List[CampaignItemResponse], summary="List aggregated performance of campaigns")
async def list_campaigns(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    start_date: date = Query(..., description="Start date of filter window"),
    end_date: date = Query(..., description="End date of filter window"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns lists of campaigns and their aggregated performance metrics within the date range window.
    """
    user = await get_db_user_from_claims(claims, db)

    # 1. Resolve Active Ad Account
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

    # 2. Query campaigns and join daily metrics subquery grouped by campaign_id
    metrics_subq = (
        select(
            CampaignDailyMetrics.campaign_id,
            func.coalesce(func.sum(CampaignDailyMetrics.spend), 0).label("spend"),
            func.coalesce(func.sum(CampaignDailyMetrics.impressions), 0).label("impressions"),
            func.coalesce(func.sum(CampaignDailyMetrics.clicks), 0).label("clicks"),
            func.coalesce(func.sum(CampaignDailyMetrics.purchases), 0).label("purchases"),
            func.coalesce(func.sum(CampaignDailyMetrics.revenue), 0).label("revenue"),
        )
        .where(CampaignDailyMetrics.date >= start_date)
        .where(CampaignDailyMetrics.date <= end_date)
        .group_by(CampaignDailyMetrics.campaign_id)
        .subquery()
    )

    stmt = (
        select(
            Campaign,
            func.coalesce(metrics_subq.c.spend, 0).label("spend"),
            func.coalesce(metrics_subq.c.impressions, 0).label("impressions"),
            func.coalesce(metrics_subq.c.clicks, 0).label("clicks"),
            func.coalesce(metrics_subq.c.purchases, 0).label("purchases"),
            func.coalesce(metrics_subq.c.revenue, 0).label("revenue"),
        )
        .outerjoin(metrics_subq, Campaign.id == metrics_subq.c.campaign_id)
        .where(Campaign.ad_account_id == ad_acc.id)
        .order_by(Campaign.name.asc())
    )
    
    res = await db.execute(stmt)
    rows = res.all()

    campaigns = []
    for row in rows:
        camp = row.Campaign
        spend = float(row.spend)
        impressions = int(row.impressions)
        clicks = int(row.clicks)
        purchases = int(row.purchases)
        revenue = float(row.revenue)

        ctr = (clicks / impressions) if impressions > 0 else 0.0
        cpc = (spend / clicks) if clicks > 0 else 0.0
        cpm = (spend / impressions * 1000) if impressions > 0 else 0.0
        roas = (revenue / spend) if spend > 0 else 0.0

        campaigns.append(
            CampaignItemResponse(
                id=camp.id,
                meta_campaign_id=camp.meta_campaign_id,
                name=camp.name,
                objective=camp.objective,
                status=camp.status,
                daily_budget=float(camp.daily_budget) if camp.daily_budget else None,
                lifetime_budget=float(camp.lifetime_budget) if camp.lifetime_budget else None,
                metrics=CampaignMetrics(
                    spend=spend,
                    impressions=impressions,
                    clicks=clicks,
                    purchases=purchases,
                    revenue=revenue,
                    ctr=ctr,
                    cpc=cpc,
                    cpm=cpm,
                    roas=roas,
                ),
            )
        )
    return campaigns
