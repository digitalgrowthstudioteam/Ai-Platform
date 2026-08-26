"""
Digital Growth Studio — Ads Router
"""
import uuid
import structlog
import httpx
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any

from app.database import get_db
from app.dependencies import get_current_user, require_active_subscription
from app.api.v1.meta import get_db_user_from_claims
from app.config import get_settings
from app.models.meta import MetaAdAccount, MetaConnection
from app.models.campaign import Campaign, AdSet, Ad
from app.models.creative import Creative
from app.models.metrics import AdDailyMetrics, AdSetDailyMetrics

logger = structlog.get_logger()
settings = get_settings()
router = APIRouter(
    prefix="/ads",
    tags=["Ads & AdSets"],
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
    conversations: Optional[int] = 0
    
    spend_trend: Optional[float] = 0.0
    impressions_trend: Optional[float] = 0.0
    clicks_trend: Optional[float] = 0.0
    purchases_trend: Optional[float] = 0.0
    revenue_trend: Optional[float] = 0.0
    ctr_trend: Optional[float] = 0.0
    cpc_trend: Optional[float] = 0.0
    roas_trend: Optional[float] = 0.0


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
    goal: Optional[str] = None
    performance_goal: Optional[str] = None
    outcome: Optional[str] = None
    goal_profile: Optional[Dict[str, Any]] = None


class AdSetMetrics(BaseModel):
    spend: float
    impressions: int
    clicks: int
    purchases: int
    revenue: float
    ctr: float
    cpc: float
    cpm: float
    roas: float
    conversations: Optional[int] = 0
    
    spend_trend: Optional[float] = 0.0
    impressions_trend: Optional[float] = 0.0
    clicks_trend: Optional[float] = 0.0
    purchases_trend: Optional[float] = 0.0
    revenue_trend: Optional[float] = 0.0
    ctr_trend: Optional[float] = 0.0
    cpc_trend: Optional[float] = 0.0
    roas_trend: Optional[float] = 0.0


class AdSetItemResponse(BaseModel):
    id: uuid.UUID
    meta_adset_id: str
    campaign_id: uuid.UUID
    name: str
    status: str
    campaign_name: str
    campaign_objective: Optional[str] = None
    optimization_goal: str
    billing_event: str
    motive: Optional[str] = None
    performance_goal: Optional[str] = None
    optimization_event: Optional[str] = None
    performance_goal_profile_id: Optional[str] = None
    metrics: AdSetMetrics
    goal: Optional[str] = None
    outcome: Optional[str] = None
    goal_profile: Optional[Dict[str, Any]] = None


class CreativeItemResponse(BaseModel):
    id: uuid.UUID
    meta_creative_id: str
    headline: Optional[str] = None
    primary_text: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    video_id: Optional[str] = None
    creative_type: Optional[str] = None
    landing_page_url: Optional[str] = None
    call_to_action: Optional[str] = None


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
    from app.services.entitlement_engine import EntitlementEngine
    from datetime import timedelta

    # Enforce plan historical days date capping
    start_date = await EntitlementEngine.enforce_historical_days(start_date, user, db)

    # 1. Resolve Active Ad Account
    accessible_ids = await EntitlementEngine.get_accessible_user_ids(user, db)
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id.in_(accessible_ids))
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

    # Calculate previous period parameters
    period_len = (end_date - start_date).days + 1
    prev_end = start_date - timedelta(days=1)
    prev_start = start_date - timedelta(days=period_len)

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

    prev_metrics_subq = (
        select(
            AdDailyMetrics.ad_id,
            func.coalesce(func.sum(AdDailyMetrics.spend), 0).label("spend"),
            func.coalesce(func.sum(AdDailyMetrics.impressions), 0).label("impressions"),
            func.coalesce(func.sum(AdDailyMetrics.clicks), 0).label("clicks"),
            func.coalesce(func.sum(AdDailyMetrics.purchases), 0).label("purchases"),
            func.coalesce(func.sum(AdDailyMetrics.revenue), 0).label("revenue"),
        )
        .where(AdDailyMetrics.date >= prev_start)
        .where(AdDailyMetrics.date <= prev_end)
        .group_by(AdDailyMetrics.ad_id)
        .subquery()
    )

    # 3. Join Campaigns, AdSets, Ads, Creatives, and Metrics
    stmt = (
        select(
            Ad,
            AdSet.name.label("adset_name"),
            AdSet.performance_goal.label("adset_performance_goal"),
            Campaign.name.label("campaign_name"),
            Campaign.objective.label("campaign_objective"),
            Creative,
            func.coalesce(metrics_subq.c.spend, 0).label("spend"),
            func.coalesce(metrics_subq.c.impressions, 0).label("impressions"),
            func.coalesce(metrics_subq.c.clicks, 0).label("clicks"),
            func.coalesce(metrics_subq.c.purchases, 0).label("purchases"),
            func.coalesce(metrics_subq.c.revenue, 0).label("revenue"),
            func.coalesce(prev_metrics_subq.c.spend, 0).label("prev_spend"),
            func.coalesce(prev_metrics_subq.c.impressions, 0).label("prev_impressions"),
            func.coalesce(prev_metrics_subq.c.clicks, 0).label("prev_clicks"),
            func.coalesce(prev_metrics_subq.c.purchases, 0).label("prev_purchases"),
            func.coalesce(prev_metrics_subq.c.revenue, 0).label("prev_revenue"),
        )
        .join(AdSet, Ad.ad_set_id == AdSet.id)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .join(MetaAdAccount, Campaign.ad_account_id == MetaAdAccount.id)
        .outerjoin(Creative, Creative.ad_id == Ad.id)
        .outerjoin(metrics_subq, Ad.id == metrics_subq.c.ad_id)
        .outerjoin(prev_metrics_subq, Ad.id == prev_metrics_subq.c.ad_id)
        .where(MetaAdAccount.meta_account_id == ad_acc.meta_account_id)
        .order_by(func.coalesce(metrics_subq.c.spend, 0).desc(), Ad.name.asc())
    )
    
    res = await db.execute(stmt)
    rows = res.all()

    # Query and sum conversations from actions JSON daily logs for Ads
    daily_stmt = (
        select(AdDailyMetrics.ad_id, AdDailyMetrics.actions)
        .join(Ad, AdDailyMetrics.ad_id == Ad.id)
        .join(AdSet, Ad.ad_set_id == AdSet.id)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .join(MetaAdAccount, Campaign.ad_account_id == MetaAdAccount.id)
        .where(MetaAdAccount.meta_account_id == ad_acc.meta_account_id)
        .where(AdDailyMetrics.date >= start_date)
        .where(AdDailyMetrics.date <= end_date)
    )
    daily_res = await db.execute(daily_stmt)
    daily_rows = daily_res.all()
    
    conversations_map = {}
    for r in daily_rows:
        a_id = r.ad_id
        actions = r.actions or {}
        conversations_map[a_id] = conversations_map.get(a_id, 0) + int(actions.get("conversations", 0))

    ads = []
    for row in rows:
        ad = row.Ad
        cr = row.Creative
        spend = float(row.spend)
        impressions = int(row.impressions)
        clicks = int(row.clicks)
        purchases = int(row.purchases)
        revenue = float(row.revenue)

        prev_spend = float(row.prev_spend)
        prev_impressions = int(row.prev_impressions)
        prev_clicks = int(row.prev_clicks)
        prev_purchases = int(row.prev_purchases)
        prev_revenue = float(row.prev_revenue)

        ctr = (clicks / impressions * 100.0) if impressions > 0 else 0.0
        cpc = (spend / clicks) if clicks > 0 else 0.0
        cpm = (spend / impressions * 1000) if impressions > 0 else 0.0
        roas = (revenue / spend) if spend > 0 else 0.0

        prev_ctr = (prev_clicks / prev_impressions * 100.0) if prev_impressions > 0 else 0.0
        prev_cpc = (prev_spend / prev_clicks) if prev_clicks > 0 else 0.0
        prev_roas = (prev_revenue / prev_spend) if prev_spend > 0 else 0.0

        def calc_t(c_val: float, p_val: float) -> float:
            if p_val <= 0:
                return 0.0
            return ((c_val - p_val) / p_val) * 100.0

        spend_trend = calc_t(spend, prev_spend)
        impressions_trend = calc_t(impressions, prev_impressions)
        clicks_trend = calc_t(clicks, prev_clicks)
        purchases_trend = calc_t(purchases, prev_purchases)
        revenue_trend = calc_t(revenue, prev_revenue)
        ctr_trend = calc_t(ctr, prev_ctr)
        cpc_trend = calc_t(cpc, prev_cpc)
        roas_trend = calc_t(roas, prev_roas)

        conversations = conversations_map.get(ad.id, 0)

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

        # Resolve goal engine details
        from app.services.goal_engine import PerformanceGoalEngine
        prof = PerformanceGoalEngine.get_metric_profile(
            objective=row.campaign_objective,
            goal=row.adset_performance_goal
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
                    conversations=conversations,
                    
                    spend_trend=spend_trend,
                    impressions_trend=impressions_trend,
                    clicks_trend=clicks_trend,
                    purchases_trend=purchases_trend,
                    revenue_trend=revenue_trend,
                    ctr_trend=ctr_trend,
                    cpc_trend=cpc_trend,
                    roas_trend=roas_trend,
                ),
                creative=creative_details,
                goal=prof.get("objective"),
                performance_goal=row.adset_performance_goal,
                outcome=prof.get("outcome"),
                goal_profile=prof
            )
        )
    return ads


@router.get("/adsets", response_model=List[AdSetItemResponse], summary="List aggregated performance of ad sets")
async def list_adsets(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    start_date: date = Query(..., description="Start date of filter window"),
    end_date: date = Query(..., description="End date of filter window"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns list of adsets, their settings, and aggregated performance metrics within the date range window.
    """
    user = await get_db_user_from_claims(claims, db)
    from app.services.entitlement_engine import EntitlementEngine
    from datetime import timedelta

    # Enforce plan historical days date capping
    start_date = await EntitlementEngine.enforce_historical_days(start_date, user, db)

    # 1. Resolve Active Ad Account
    accessible_ids = await EntitlementEngine.get_accessible_user_ids(user, db)
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id.in_(accessible_ids))
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

    # Calculate previous period parameters
    period_len = (end_date - start_date).days + 1
    prev_end = start_date - timedelta(days=1)
    prev_start = start_date - timedelta(days=period_len)

    # 2. Query adset metrics subquery grouped by ad_set_id
    metrics_subq = (
        select(
            AdSetDailyMetrics.ad_set_id,
            func.coalesce(func.sum(AdSetDailyMetrics.spend), 0).label("spend"),
            func.coalesce(func.sum(AdSetDailyMetrics.impressions), 0).label("impressions"),
            func.coalesce(func.sum(AdSetDailyMetrics.clicks), 0).label("clicks"),
            func.coalesce(func.sum(AdSetDailyMetrics.purchases), 0).label("purchases"),
            func.coalesce(func.sum(AdSetDailyMetrics.revenue), 0).label("revenue"),
        )
        .where(AdSetDailyMetrics.date >= start_date)
        .where(AdSetDailyMetrics.date <= end_date)
        .group_by(AdSetDailyMetrics.ad_set_id)
        .subquery()
    )

    prev_metrics_subq = (
        select(
            AdSetDailyMetrics.ad_set_id,
            func.coalesce(func.sum(AdSetDailyMetrics.spend), 0).label("spend"),
            func.coalesce(func.sum(AdSetDailyMetrics.impressions), 0).label("impressions"),
            func.coalesce(func.sum(AdSetDailyMetrics.clicks), 0).label("clicks"),
            func.coalesce(func.sum(AdSetDailyMetrics.purchases), 0).label("purchases"),
            func.coalesce(func.sum(AdSetDailyMetrics.revenue), 0).label("revenue"),
        )
        .where(AdSetDailyMetrics.date >= prev_start)
        .where(AdSetDailyMetrics.date <= prev_end)
        .group_by(AdSetDailyMetrics.ad_set_id)
        .subquery()
    )

    # 3. Join Campaigns, AdSets, and Metrics
    stmt = (
        select(
            AdSet,
            Campaign.name.label("campaign_name"),
            Campaign.objective.label("campaign_objective"),
            func.coalesce(metrics_subq.c.spend, 0).label("spend"),
            func.coalesce(metrics_subq.c.impressions, 0).label("impressions"),
            func.coalesce(metrics_subq.c.clicks, 0).label("clicks"),
            func.coalesce(metrics_subq.c.purchases, 0).label("purchases"),
            func.coalesce(metrics_subq.c.revenue, 0).label("revenue"),
            func.coalesce(prev_metrics_subq.c.spend, 0).label("prev_spend"),
            func.coalesce(prev_metrics_subq.c.impressions, 0).label("prev_impressions"),
            func.coalesce(prev_metrics_subq.c.clicks, 0).label("prev_clicks"),
            func.coalesce(prev_metrics_subq.c.purchases, 0).label("prev_purchases"),
            func.coalesce(prev_metrics_subq.c.revenue, 0).label("prev_revenue"),
        )
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .join(MetaAdAccount, Campaign.ad_account_id == MetaAdAccount.id)
        .outerjoin(metrics_subq, AdSet.id == metrics_subq.c.ad_set_id)
        .outerjoin(prev_metrics_subq, AdSet.id == prev_metrics_subq.c.ad_set_id)
        .where(MetaAdAccount.meta_account_id == ad_acc.meta_account_id)
        .order_by(AdSet.name.asc())
    )
    
    res = await db.execute(stmt)
    rows = res.all()

    # Query and sum conversations from actions JSON daily logs for AdSets
    daily_stmt = (
        select(AdSetDailyMetrics.ad_set_id, AdSetDailyMetrics.actions)
        .join(AdSet, AdSetDailyMetrics.ad_set_id == AdSet.id)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .join(MetaAdAccount, Campaign.ad_account_id == MetaAdAccount.id)
        .where(MetaAdAccount.meta_account_id == ad_acc.meta_account_id)
        .where(AdSetDailyMetrics.date >= start_date)
        .where(AdSetDailyMetrics.date <= end_date)
    )
    daily_res = await db.execute(daily_stmt)
    daily_rows = daily_res.all()
    
    conversations_map = {}
    for r in daily_rows:
        as_id = r.ad_set_id
        actions = r.actions or {}
        conversations_map[as_id] = conversations_map.get(as_id, 0) + int(actions.get("conversations", 0))

    adsets = []
    for row in rows:
        adset = row.AdSet
        spend = float(row.spend)
        impressions = int(row.impressions)
        clicks = int(row.clicks)
        purchases = int(row.purchases)
        revenue = float(row.revenue)

        prev_spend = float(row.prev_spend)
        prev_impressions = int(row.prev_impressions)
        prev_clicks = int(row.prev_clicks)
        prev_purchases = int(row.prev_purchases)
        prev_revenue = float(row.prev_revenue)

        ctr = (clicks / impressions * 100.0) if impressions > 0 else 0.0
        cpc = (spend / clicks) if clicks > 0 else 0.0
        cpm = (spend / impressions * 1000) if impressions > 0 else 0.0
        roas = (revenue / spend) if spend > 0 else 0.0

        prev_ctr = (prev_clicks / prev_impressions * 100.0) if prev_impressions > 0 else 0.0
        prev_cpc = (prev_spend / prev_clicks) if prev_clicks > 0 else 0.0
        prev_roas = (prev_revenue / prev_spend) if prev_spend > 0 else 0.0

        def calc_t(c_val: float, p_val: float) -> float:
            if p_val <= 0:
                return 0.0
            return ((c_val - p_val) / p_val) * 100.0

        spend_trend = calc_t(spend, prev_spend)
        impressions_trend = calc_t(impressions, prev_impressions)
        clicks_trend = calc_t(clicks, prev_clicks)
        purchases_trend = calc_t(purchases, prev_purchases)
        revenue_trend = calc_t(revenue, prev_revenue)
        ctr_trend = calc_t(ctr, prev_ctr)
        cpc_trend = calc_t(cpc, prev_cpc)
        roas_trend = calc_t(roas, prev_roas)

        conversations = conversations_map.get(adset.id, 0)

        # Resolve goal engine details
        from app.services.goal_engine import PerformanceGoalEngine
        prof = PerformanceGoalEngine.get_metric_profile(
            objective=row.campaign_objective,
            goal=adset.performance_goal
        )

        adsets.append(
            AdSetItemResponse(
                id=adset.id,
                meta_adset_id=adset.meta_adset_id,
                campaign_id=adset.campaign_id,
                name=adset.name,
                status=adset.status,
                campaign_name=row.campaign_name,
                campaign_objective=row.campaign_objective,
                optimization_goal=adset.optimization_goal,
                billing_event=adset.billing_event,
                motive=adset.motive,
                performance_goal=adset.performance_goal,
                optimization_event=adset.optimization_event,
                performance_goal_profile_id=adset.performance_goal_profile_id,
                metrics=AdSetMetrics(
                    spend=spend,
                    impressions=impressions,
                    clicks=clicks,
                    purchases=purchases,
                    revenue=revenue,
                    ctr=ctr,
                    cpc=cpc,
                    cpm=cpm,
                    roas=roas,
                    conversations=conversations,
                    
                    spend_trend=spend_trend,
                    impressions_trend=impressions_trend,
                    clicks_trend=clicks_trend,
                    purchases_trend=purchases_trend,
                    revenue_trend=revenue_trend,
                    ctr_trend=ctr_trend,
                    cpc_trend=cpc_trend,
                    roas_trend=roas_trend,
                ),
                goal=prof.get("objective"),
                outcome=prof.get("outcome"),
                goal_profile=prof
            )
        )
    return adsets


@router.get("/creatives", response_model=List[CreativeItemResponse], summary="List all unique creatives inside an ad account")
async def list_creatives(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns list of unique creatives linked to any ads inside the active ad account.
    """
    user = await get_db_user_from_claims(claims, db)
    from app.services.entitlement_engine import EntitlementEngine

    # 1. Resolve Active Ad Account
    accessible_ids = await EntitlementEngine.get_accessible_user_ids(user, db)
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id.in_(accessible_ids))
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

    # 2. Query all creatives linked to ads in this ad account
    stmt = (
        select(Creative)
        .join(Ad, Creative.ad_id == Ad.id)
        .join(AdSet, Ad.ad_set_id == AdSet.id)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .join(MetaAdAccount, Campaign.ad_account_id == MetaAdAccount.id)
        .where(MetaAdAccount.meta_account_id == ad_acc.meta_account_id)
        .order_by(Creative.meta_creative_id.asc())
    )
    
    res = await db.execute(stmt)
    rows = res.scalars().all()

    # Deduplicate by meta_creative_id to keep response clean
    seen = set()
    creatives = []
    for cr in rows:
        if cr.meta_creative_id in seen:
            continue
        seen.add(cr.meta_creative_id)
        creatives.append(
            CreativeItemResponse(
                id=cr.id,
                meta_creative_id=cr.meta_creative_id,
                headline=cr.headline,
                primary_text=cr.primary_text,
                description=cr.description,
                image_url=cr.image_url,
                video_id=cr.video_id,
                creative_type=cr.creative_type,
                landing_page_url=cr.landing_page_url,
                call_to_action=cr.call_to_action,
            )
        )
    return creatives


# ──────────────────────────────────────────────
# BREAKDOWNS & AUDIENCES SCHEMAS
# ──────────────────────────────────────────────
class PlacementMetricsResponse(BaseModel):
    publisher_platform: str
    platform_position: Optional[str] = None
    spend: float
    impressions: int
    clicks: int
    purchases: int
    results: int
    revenue: float
    ctr: float
    cpc: float
    roas: float


class DemographicMetricsResponse(BaseModel):
    age: str
    gender: str
    spend: float
    impressions: int
    clicks: int
    purchases: int
    results: int
    revenue: float
    ctr: float
    cpc: float
    roas: float


class RegionMetricsResponse(BaseModel):
    region: str
    spend: float
    impressions: int
    clicks: int
    results: int
    revenue: float
    ctr: float
    cpc: float
    roas: float



class AudienceItemResponse(BaseModel):
    id: str
    name: str
    subtype: str
    approximate_count_size: Optional[int] = None
    description: Optional[str] = None


# ──────────────────────────────────────────────
# BREAKDOWNS & AUDIENCES ROUTES
# ──────────────────────────────────────────────
@router.get("/placements", response_model=List[PlacementMetricsResponse])
async def list_placements(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    campaign_id: Optional[str] = Query(None),
    adset_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_db_user_from_claims(claims, db)
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
    try:
        acc_uuid = uuid.UUID(ad_account_id)
        stmt = stmt.where(MetaAdAccount.id == acc_uuid)
    except ValueError:
        stmt = stmt.where(MetaAdAccount.meta_account_id == ad_account_id)

    res = await db.execute(stmt)
    ad_acc = res.scalar_one_or_none()
    if not ad_acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active ad account not found.")

    conn_stmt = select(MetaConnection).where(MetaConnection.id == ad_acc.meta_connection_id)
    conn_res = await db.execute(conn_stmt)
    conn = conn_res.scalar_one_or_none()

    token = conn.access_token if conn else None


    # Resolve target ID
    target_id = ad_acc.meta_account_id
    is_cake_baking = False
    
    if campaign_id:
        try:
            c_uuid = uuid.UUID(campaign_id)
            c_res = await db.execute(select(Campaign.meta_campaign_id, Campaign.name).where(Campaign.id == c_uuid))
            c_row = c_res.fetchone()
            if c_row:
                meta_id, c_name = c_row
                if meta_id:
                    target_id = meta_id
                if c_name and "Cake Baking" in c_name:
                    is_cake_baking = True
        except ValueError:
            target_id = campaign_id
            c_res = await db.execute(select(Campaign.name).where(Campaign.meta_campaign_id == campaign_id))
            c_name = c_res.scalar()
            if c_name and "Cake Baking" in c_name:
                is_cake_baking = True
    elif adset_id:
        try:
            as_uuid = uuid.UUID(adset_id)
            as_res = await db.execute(select(AdSet.meta_adset_id, AdSet.campaign_id).where(AdSet.id == as_uuid))
            as_row = as_res.fetchone()
            if as_row:
                meta_id, c_uuid = as_row
                if meta_id:
                    target_id = meta_id
                if c_uuid:
                    c_res = await db.execute(select(Campaign.name).where(Campaign.id == c_uuid))
                    c_name = c_res.scalar()
                    if c_name and "Cake Baking" in c_name:
                        is_cake_baking = True
        except ValueError:
            target_id = adset_id

    platform_breakdowns = []
    if token:
        try:
            async with httpx.AsyncClient() as client:
                time_range_str = ""
                if start_date and end_date:
                    time_range_str = f"&time_range=%7B%22since%22%3A%22{start_date}%22%2C%22until%22%3A%22{end_date}%22%7D"
                else:
                    time_range_str = "&date_preset=last_30d"

                # Request publisher_platform and platform_position
                platform_url = (
                    f"https://graph.facebook.com/{settings.META_API_VERSION}/{target_id}/insights"
                    f"?breakdowns=publisher_platform,platform_position"
                    f"&fields=spend,impressions,clicks,actions,action_values"
                    f"{time_range_str}"
                    f"&access_token={token}"
                )
                r = await client.get(platform_url, timeout=15.0)
                if r.status_code == 200:
                    platform_breakdowns = r.json().get("data", [])
        except Exception as e:
            logger.warn("Failed to fetch live placement data from Meta.", error=str(e))

    output = []
    for platform in platform_breakdowns:
        plat_name = platform.get("publisher_platform")
        plat_pos = platform.get("platform_position")
        spend = float(platform.get("spend", 0.0))
        impressions = int(platform.get("impressions", 0))
        clicks = int(platform.get("clicks", 0))

        purchases = 0
        revenue = 0.0
        results = 0
        actions = platform.get("actions", [])
        
        for act in actions:
            act_type = act.get("action_type")
            if act_type == "purchase":
                purchases = int(act.get("value", 0))
        for val in platform.get("action_values", []):
            if val.get("action_type") == "purchase":
                revenue = float(val.get("value", 0.0))

        # Dynamic results logic
        msg_val = sum(int(act.get("value", 0)) for act in actions if act.get("action_type") in ("onsite_conversion.messaging_first_reply", "onsite_conversion.messaging_conversation_started_7d", "messaging_connections"))
        lead_val = sum(int(act.get("value", 0)) for act in actions if act.get("action_type") in ("lead", "submit_form"))
        purch_val = sum(int(act.get("value", 0)) for act in actions if act.get("action_type") == "purchase")
        
        if msg_val > 0:
            results = msg_val
        elif lead_val > 0:
            results = lead_val
        else:
            results = purch_val

        ctr = (clicks / impressions * 100.0) if impressions > 0 else 0.0
        cpc = (spend / clicks) if clicks > 0 else 0.0
        roas = (revenue / spend) if spend > 0 else 0.0

        output.append(
            PlacementMetricsResponse(
                publisher_platform=plat_name,
                platform_position=plat_pos,
                spend=spend,
                impressions=impressions,
                clicks=clicks,
                purchases=purchases,
                results=results,
                revenue=revenue,
                ctr=ctr,
                cpc=cpc,
                roas=roas
            )
        )
    return output


@router.get("/demographics", response_model=List[DemographicMetricsResponse])
async def list_demographics(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    campaign_id: Optional[str] = Query(None),
    adset_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_db_user_from_claims(claims, db)
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
    try:
        acc_uuid = uuid.UUID(ad_account_id)
        stmt = stmt.where(MetaAdAccount.id == acc_uuid)
    except ValueError:
        stmt = stmt.where(MetaAdAccount.meta_account_id == ad_account_id)

    res = await db.execute(stmt)
    ad_acc = res.scalar_one_or_none()
    if not ad_acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active ad account not found.")

    conn_stmt = select(MetaConnection).where(MetaConnection.id == ad_acc.meta_connection_id)
    conn_res = await db.execute(conn_stmt)
    conn = conn_res.scalar_one_or_none()

    token = conn.access_token if conn else None


    # Resolve target ID
    target_id = ad_acc.meta_account_id
    is_cake_baking = False
    
    if campaign_id:
        try:
            c_uuid = uuid.UUID(campaign_id)
            c_res = await db.execute(select(Campaign.meta_campaign_id, Campaign.name).where(Campaign.id == c_uuid))
            c_row = c_res.fetchone()
            if c_row:
                meta_id, c_name = c_row
                if meta_id:
                    target_id = meta_id
                if c_name and "Cake Baking" in c_name:
                    is_cake_baking = True
        except ValueError:
            target_id = campaign_id
            c_res = await db.execute(select(Campaign.name).where(Campaign.meta_campaign_id == campaign_id))
            c_name = c_res.scalar()
            if c_name and "Cake Baking" in c_name:
                is_cake_baking = True
    elif adset_id:
        try:
            as_uuid = uuid.UUID(adset_id)
            as_res = await db.execute(select(AdSet.meta_adset_id, AdSet.campaign_id).where(AdSet.id == as_uuid))
            as_row = as_res.fetchone()
            if as_row:
                meta_id, c_uuid = as_row
                if meta_id:
                    target_id = meta_id
                if c_uuid:
                    c_res = await db.execute(select(Campaign.name).where(Campaign.id == c_uuid))
                    c_name = c_res.scalar()
                    if c_name and "Cake Baking" in c_name:
                        is_cake_baking = True
        except ValueError:
            target_id = adset_id

    demographic_breakdowns = []
    if token:
        try:
            async with httpx.AsyncClient() as client:
                time_range_str = ""
                if start_date and end_date:
                    time_range_str = f"&time_range=%7B%22since%22%3A%22{start_date}%22%2C%22until%22%3A%22{end_date}%22%7D"
                else:
                    time_range_str = "&date_preset=last_30d"

                demo_url = (
                    f"https://graph.facebook.com/{settings.META_API_VERSION}/{target_id}/insights"
                    f"?breakdowns=age,gender"
                    f"&fields=spend,impressions,clicks,actions,action_values"
                    f"{time_range_str}"
                    f"&access_token={token}"
                )
                r = await client.get(demo_url, timeout=15.0)
                if r.status_code == 200:
                    demographic_breakdowns = r.json().get("data", [])
        except Exception as e:
            logger.warn("Failed to fetch live demographic data from Meta.", error=str(e))

    output = []
    for demo in demographic_breakdowns:
        age = demo.get("age")
        gender = demo.get("gender")
        spend = float(demo.get("spend", 0.0))
        impressions = int(demo.get("impressions", 0))
        clicks = int(demo.get("clicks", 0))

        purchases = 0
        revenue = 0.0
        results = 0
        actions = demo.get("actions", [])
        
        for act in actions:
            if act.get("action_type") == "purchase":
                purchases = int(act.get("value", 0))
        for val in demo.get("action_values", []):
            if val.get("action_type") == "purchase":
                revenue = float(val.get("value", 0.0))

        # Dynamic results logic
        msg_val = sum(int(act.get("value", 0)) for act in actions if act.get("action_type") in ("onsite_conversion.messaging_first_reply", "onsite_conversion.messaging_conversation_started_7d", "messaging_connections"))
        lead_val = sum(int(act.get("value", 0)) for act in actions if act.get("action_type") in ("lead", "submit_form"))
        purch_val = sum(int(act.get("value", 0)) for act in actions if act.get("action_type") == "purchase")
        
        if msg_val > 0:
            results = msg_val
        elif lead_val > 0:
            results = lead_val
        else:
            results = purch_val

        ctr = (clicks / impressions * 100.0) if impressions > 0 else 0.0
        cpc = (spend / clicks) if clicks > 0 else 0.0
        roas = (revenue / spend) if spend > 0 else 0.0

        output.append(
            DemographicMetricsResponse(
                age=age,
                gender=gender,
                spend=spend,
                impressions=impressions,
                clicks=clicks,
                purchases=purchases,
                results=results,
                revenue=revenue,
                ctr=ctr,
                cpc=cpc,
                roas=roas
            )
        )
    return output


@router.get("/regions", response_model=List[RegionMetricsResponse])
async def list_regions(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    campaign_id: Optional[str] = Query(None),
    adset_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_db_user_from_claims(claims, db)
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
    try:
        acc_uuid = uuid.UUID(ad_account_id)
        stmt = stmt.where(MetaAdAccount.id == acc_uuid)
    except ValueError:
        stmt = stmt.where(MetaAdAccount.meta_account_id == ad_account_id)

    res = await db.execute(stmt)
    ad_acc = res.scalar_one_or_none()
    if not ad_acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active ad account not found.")

    conn_stmt = select(MetaConnection).where(MetaConnection.id == ad_acc.meta_connection_id)
    conn_res = await db.execute(conn_stmt)
    conn = conn_res.scalar_one_or_none()

    token = conn.access_token if conn else None


    # Resolve target ID
    target_id = ad_acc.meta_account_id
    is_cake_baking = False
    
    if campaign_id:
        try:
            c_uuid = uuid.UUID(campaign_id)
            c_res = await db.execute(select(Campaign.meta_campaign_id, Campaign.name).where(Campaign.id == c_uuid))
            c_row = c_res.fetchone()
            if c_row:
                meta_id, c_name = c_row
                if meta_id:
                    target_id = meta_id
                if c_name and "Cake Baking" in c_name:
                    is_cake_baking = True
        except ValueError:
            target_id = campaign_id
            c_res = await db.execute(select(Campaign.name).where(Campaign.meta_campaign_id == campaign_id))
            c_name = c_res.scalar()
            if c_name and "Cake Baking" in c_name:
                is_cake_baking = True
    elif adset_id:
        try:
            as_uuid = uuid.UUID(adset_id)
            as_res = await db.execute(select(AdSet.meta_adset_id, AdSet.campaign_id).where(AdSet.id == as_uuid))
            as_row = as_res.fetchone()
            if as_row:
                meta_id, c_uuid = as_row
                if meta_id:
                    target_id = meta_id
                if c_uuid:
                    c_res = await db.execute(select(Campaign.name).where(Campaign.id == c_uuid))
                    c_name = c_res.scalar()
                    if c_name and "Cake Baking" in c_name:
                        is_cake_baking = True
        except ValueError:
            target_id = adset_id

    region_breakdowns = []
    if token:
        try:
            async with httpx.AsyncClient() as client:
                time_range_str = ""
                if start_date and end_date:
                    time_range_str = f"&time_range=%7B%22since%22%3A%22{start_date}%22%2C%22until%22%3A%22{end_date}%22%7D"
                else:
                    time_range_str = "&date_preset=last_30d"

                region_url = (
                    f"https://graph.facebook.com/{settings.META_API_VERSION}/{target_id}/insights"
                    f"?breakdowns=region"
                    f"&fields=spend,impressions,clicks,actions,action_values"
                    f"{time_range_str}"
                    f"&access_token={token}"
                )
                r = await client.get(region_url, timeout=15.0)
                if r.status_code == 200:
                    region_breakdowns = r.json().get("data", [])
        except Exception as e:
            logger.warn("Failed to fetch live regional data from Meta.", error=str(e))

    output = []
    for reg in region_breakdowns:
        region_name = reg.get("region")
        spend = float(reg.get("spend", 0.0))
        impressions = int(reg.get("impressions", 0))
        clicks = int(reg.get("clicks", 0))

        purchases = 0
        revenue = 0.0
        results = 0
        actions = reg.get("actions", [])
        
        for act in actions:
            if act.get("action_type") == "purchase":
                purchases = int(act.get("value", 0))
        for val in reg.get("action_values", []):
            if val.get("action_type") == "purchase":
                revenue = float(val.get("value", 0.0))

        # Dynamic results logic
        msg_val = sum(int(act.get("value", 0)) for act in actions if act.get("action_type") in ("onsite_conversion.messaging_first_reply", "onsite_conversion.messaging_conversation_started_7d", "messaging_connections"))
        lead_val = sum(int(act.get("value", 0)) for act in actions if act.get("action_type") in ("lead", "submit_form"))
        purch_val = sum(int(act.get("value", 0)) for act in actions if act.get("action_type") == "purchase")
        
        if msg_val > 0:
            results = msg_val
        elif lead_val > 0:
            results = lead_val
        else:
            results = purch_val

        ctr = (clicks / impressions * 100.0) if impressions > 0 else 0.0
        cpc = (spend / clicks) if clicks > 0 else 0.0
        roas = (revenue / spend) if spend > 0 else 0.0

        output.append(
            RegionMetricsResponse(
                region=region_name,
                spend=spend,
                impressions=impressions,
                clicks=clicks,
                results=results,
                revenue=revenue,
                ctr=ctr,
                cpc=cpc,
                roas=roas
            )
        )
    return output


@router.get("/audiences", response_model=List[AudienceItemResponse])
async def list_audiences(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_db_user_from_claims(claims, db)
    from app.services.entitlement_engine import EntitlementEngine
    accessible_ids = await EntitlementEngine.get_accessible_user_ids(user, db)
    stmt = select(MetaAdAccount).where(MetaAdAccount.user_id.in_(accessible_ids))
    try:
        acc_uuid = uuid.UUID(ad_account_id)
        stmt = stmt.where(MetaAdAccount.id == acc_uuid)
    except ValueError:
        stmt = stmt.where(MetaAdAccount.meta_account_id == ad_account_id)

    res = await db.execute(stmt)
    ad_acc = res.scalar_one_or_none()
    if not ad_acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active ad account not found.")

    conn_stmt = select(MetaConnection).where(MetaConnection.id == ad_acc.meta_connection_id)
    conn_res = await db.execute(conn_stmt)
    conn = conn_res.scalar_one_or_none()

    token = conn.access_token if conn else None


    custom_audiences = []
    if token:
        try:
            async with httpx.AsyncClient() as client:
                audiences_url = (
                    f"https://graph.facebook.com/{settings.META_API_VERSION}/{ad_acc.meta_account_id}/customaudiences"
                    f"?fields=id,name,subtype,approximate_count_size,description"
                    f"&access_token={token}"
                )
                r = await client.get(audiences_url, timeout=15.0)
                if r.status_code == 200:
                    custom_audiences = r.json().get("data", [])
        except Exception as e:
            logger.warn("Failed to fetch live audiences from Meta.", error=str(e))

    output = []
    for aud in custom_audiences:
        output.append(
            AudienceItemResponse(
                id=aud.get("id"),
                name=aud.get("name"),
                subtype=aud.get("subtype"),
                approximate_count_size=aud.get("approximate_count_size"),
                description=aud.get("description")
            )
        )
    return output


class DailyMetricPoint(BaseModel):
    date: date
    spend: float
    impressions: int
    clicks: int
    purchases: int
    revenue: float
    roas: float
    conversations: int = 0
    leads: int = 0
    calls: int = 0


@router.get("/{ad_id}/daily", response_model=List[DailyMetricPoint], summary="Get ad daily performance metrics")
async def get_ad_daily_metrics(
    ad_id: uuid.UUID,
    start_date: date = Query(..., description="Start date of filter window"),
    end_date: date = Query(..., description="End date of filter window"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_db_user_from_claims(claims, db)
    from app.services.entitlement_engine import EntitlementEngine

    # Enforce plan historical days date capping
    start_date = await EntitlementEngine.enforce_historical_days(start_date, user, db)

    # Verify ad access
    accessible_ids = await EntitlementEngine.get_accessible_user_ids(user, db)
    stmt = (
        select(Ad)
        .join(AdSet, Ad.ad_set_id == AdSet.id)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .where(Ad.id == ad_id)
        .where(Campaign.ad_account_id.in_(
            select(MetaAdAccount.id).where(MetaAdAccount.user_id.in_(accessible_ids))
        ))
    )
    res = await db.execute(stmt)
    ad = res.scalar_one_or_none()
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ad not found.")

    # Fetch daily metrics
    stmt = (
        select(AdDailyMetrics)
        .where(AdDailyMetrics.ad_id == ad_id)
        .where(AdDailyMetrics.date >= start_date)
        .where(AdDailyMetrics.date <= end_date)
        .order_by(AdDailyMetrics.date.asc())
    )
    res = await db.execute(stmt)
    rows = res.scalars().all()
    return [
        DailyMetricPoint(
            date=r.date,
            spend=float(r.spend or 0.0),
            impressions=int(r.impressions or 0),
            clicks=int(r.clicks or 0),
            purchases=int(r.purchases or 0),
            revenue=float(r.revenue or 0.0),
            roas=float(r.roas or 0.0),
            conversations=int((r.actions or {}).get("conversations", 0)),
            leads=int(r.leads or (r.actions or {}).get("leads", 0)),
            calls=int((r.actions or {}).get("calls", 0)),
        )
        for r in rows
    ]

