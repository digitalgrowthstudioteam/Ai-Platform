"""
Digital Growth Studio — Ads Router
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
from app.models.campaign import Campaign, AdSet, Ad
from app.models.creative import Creative
from app.models.metrics import AdDailyMetrics

logger = structlog.get_logger()
router = APIRouter(
    prefix="/ads",
    tags=["Ads"],
    dependencies=[Depends(require_active_subscription)],
)


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class AdMetrics(BaseModel):
    spend: float
    impressions: int
    clicks: int
    purchases: int
    revenue: float
    ctr: float
    cpc: float
    cpm: float
    roas: float


class CreativeDetails(BaseModel):
    id: uuid.UUID
    meta_creative_id: str
    headline: Optional[str] = None
    primary_text: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    video_id: Optional[str] = None
    creative_type: Optional[str] = None
    landing_page_url: Optional[str] = None


class AdItemResponse(BaseModel):
    id: uuid.UUID
    meta_ad_id: str
    name: str
    status: str
    campaign_name: str
    adset_name: str
    metrics: AdMetrics
    creative: Optional[CreativeDetails] = None


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("", response_model=List[AdItemResponse], summary="List aggregated performance of ads with creative variations")
async def list_ads(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    start_date: date = Query(..., description="Start date of filter window"),
    end_date: date = Query(..., description="End date of filter window"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns list of ads, their creative details, and aggregated performance metrics within the date range window.
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

    # 2. Query ad metrics subquery grouped by ad_id
    metrics_subq = (
        select(
            AdDailyMetrics.ad_id,
            func.coalesce(func.sum(AdDailyMetrics.spend), 0).label("spend"),
            func.coalesce(func.sum(AdDailyMetrics.impressions), 0).label("impressions"),
            func.coalesce(func.sum(AdDailyMetrics.clicks), 0).label("clicks"),
            func.coalesce(func.sum(AdDailyMetrics.purchases), 0).label("purchases"),
            func.coalesce(func.sum(AdDailyMetrics.revenue), 0).label("revenue"),
        )
        .where(AdDailyMetrics.date >= start_date)
        .where(AdDailyMetrics.date <= end_date)
        .group_by(AdDailyMetrics.ad_id)
        .subquery()
    )

    # 3. Join Campaigns, AdSets, Ads, Creatives, and Metrics
    stmt = (
        select(
            Ad,
            AdSet.name.label("adset_name"),
            Campaign.name.label("campaign_name"),
            Creative,
            func.coalesce(metrics_subq.c.spend, 0).label("spend"),
            func.coalesce(metrics_subq.c.impressions, 0).label("impressions"),
            func.coalesce(metrics_subq.c.clicks, 0).label("clicks"),
            func.coalesce(metrics_subq.c.purchases, 0).label("purchases"),
            func.coalesce(metrics_subq.c.revenue, 0).label("revenue"),
        )
        .join(AdSet, Ad.ad_set_id == AdSet.id)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .outerjoin(Creative, Creative.ad_id == Ad.id)
        .outerjoin(metrics_subq, Ad.id == metrics_subq.c.ad_id)
        .where(Campaign.ad_account_id == ad_acc.id)
        .order_by(Ad.name.asc())
    )
    
    res = await db.execute(stmt)
    rows = res.all()

    ads = []
    for row in rows:
        ad = row.Ad
        cr = row.Creative
        spend = float(row.spend)
        impressions = int(row.impressions)
        clicks = int(row.clicks)
        purchases = int(row.purchases)
        revenue = float(row.revenue)

        ctr = (clicks / impressions) if impressions > 0 else 0.0
        cpc = (spend / clicks) if clicks > 0 else 0.0
        cpm = (spend / impressions * 1000) if impressions > 0 else 0.0
        roas = (revenue / spend) if spend > 0 else 0.0

        creative_details = None
        if cr:
            creative_details = CreativeDetails(
                id=cr.id,
                meta_creative_id=cr.meta_creative_id,
                headline=cr.headline,
                primary_text=cr.primary_text,
                description=cr.description,
                image_url=cr.image_url,
                video_id=cr.video_id,
                creative_type=cr.creative_type,
                landing_page_url=cr.landing_page_url,
            )

        ads.append(
            AdItemResponse(
                id=ad.id,
                meta_ad_id=ad.meta_ad_id,
                name=ad.name,
                status=ad.status,
                campaign_name=row.campaign_name,
                adset_name=row.adset_name,
                metrics=AdMetrics(
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
                creative=creative_details,
            )
        )
    return ads
