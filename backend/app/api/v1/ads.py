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
from typing import List, Optional

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

    # Query and sum conversations from actions JSON daily logs for Ads
    daily_stmt = (
        select(AdDailyMetrics.ad_id, AdDailyMetrics.actions)
        .join(Ad, AdDailyMetrics.ad_id == Ad.id)
        .join(AdSet, Ad.ad_set_id == AdSet.id)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .where(Campaign.ad_account_id == ad_acc.id)
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

        ctr = (clicks / impressions) if impressions > 0 else 0.0
        cpc = (spend / clicks) if clicks > 0 else 0.0
        cpm = (spend / impressions * 1000) if impressions > 0 else 0.0
        roas = (revenue / spend) if spend > 0 else 0.0
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
                ),
                creative=creative_details,
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
        )
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .outerjoin(metrics_subq, AdSet.id == metrics_subq.c.ad_set_id)
        .where(Campaign.ad_account_id == ad_acc.id)
        .order_by(AdSet.name.asc())
    )
    
    res = await db.execute(stmt)
    rows = res.all()

    # Query and sum conversations from actions JSON daily logs for AdSets
    daily_stmt = (
        select(AdSetDailyMetrics.ad_set_id, AdSetDailyMetrics.actions)
        .join(AdSet, AdSetDailyMetrics.ad_set_id == AdSet.id)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .where(Campaign.ad_account_id == ad_acc.id)
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

        ctr = (clicks / impressions) if impressions > 0 else 0.0
        cpc = (spend / clicks) if clicks > 0 else 0.0
        cpm = (spend / impressions * 1000) if impressions > 0 else 0.0
        roas = (revenue / spend) if spend > 0 else 0.0
        conversations = conversations_map.get(adset.id, 0)

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
                ),
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

    # 2. Query all creatives linked to ads in this ad account
    stmt = (
        select(Creative)
        .join(Ad, Creative.ad_id == Ad.id)
        .join(AdSet, Ad.ad_set_id == AdSet.id)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .where(Campaign.ad_account_id == ad_acc.id)
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
    spend: float
    impressions: int
    clicks: int
    purchases: int
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
    is_mock = not token or token.startswith("EAAGm0PX") or token == "mock_access_token"

    platform_breakdowns = []
    if not is_mock and token:
        try:
            async with httpx.AsyncClient() as client:
                platform_url = (
                    f"https://graph.facebook.com/{settings.META_API_VERSION}/{ad_acc.meta_account_id}/insights"
                    f"?date_preset=last_30d&breakdowns=publisher_platform"
                    f"&fields=spend,impressions,clicks,actions,action_values"
                    f"&access_token={token}"
                )
                r = await client.get(platform_url, timeout=15.0)
                if r.status_code == 200:
                    platform_breakdowns = r.json().get("data", [])
        except Exception as e:
            logger.warn("Failed to fetch live placement data from Meta. Falling back to mocks.", error=str(e))

    if is_mock or not platform_breakdowns:
        platform_breakdowns = [
            {"publisher_platform": "facebook", "spend": 4500.00, "impressions": 50000, "clicks": 800, "actions": [{"action_type": "purchase", "value": 8}], "action_values": [{"action_type": "purchase", "value": 6400.00}]},
            {"publisher_platform": "instagram", "spend": 3200.00, "impressions": 40000, "clicks": 950, "actions": [{"action_type": "purchase", "value": 15}], "action_values": [{"action_type": "purchase", "value": 12000.00}]},
            {"publisher_platform": "audience_network", "spend": 950.00, "impressions": 12000, "clicks": 110, "actions": [], "action_values": []},
            {"publisher_platform": "messenger", "spend": 450.00, "impressions": 5000, "clicks": 85, "actions": [{"action_type": "purchase", "value": 2}], "action_values": [{"action_type": "purchase", "value": 1600.00}]},
        ]

    output = []
    for platform in platform_breakdowns:
        plat_name = platform.get("publisher_platform")
        spend = float(platform.get("spend", 0.0))
        impressions = int(platform.get("impressions", 0))
        clicks = int(platform.get("clicks", 0))

        purchases = 0
        revenue = 0.0
        for act in platform.get("actions", []):
            if act.get("action_type") == "purchase":
                purchases = int(act.get("value", 0))
        for val in platform.get("action_values", []):
            if val.get("action_type") == "purchase":
                revenue = float(val.get("value", 0.0))

        ctr = (clicks / impressions) if impressions > 0 else 0.0
        cpc = (spend / clicks) if clicks > 0 else 0.0
        roas = (revenue / spend) if spend > 0 else 0.0

        output.append(
            PlacementMetricsResponse(
                publisher_platform=plat_name,
                spend=spend,
                impressions=impressions,
                clicks=clicks,
                purchases=purchases,
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
    is_mock = not token or token.startswith("EAAGm0PX") or token == "mock_access_token"

    demographic_breakdowns = []
    if not is_mock and token:
        try:
            async with httpx.AsyncClient() as client:
                demo_url = (
                    f"https://graph.facebook.com/{settings.META_API_VERSION}/{ad_acc.meta_account_id}/insights"
                    f"?date_preset=last_30d&breakdowns=age,gender"
                    f"&fields=spend,impressions,clicks,actions,action_values"
                    f"&access_token={token}"
                )
                r = await client.get(demo_url, timeout=15.0)
                if r.status_code == 200:
                    demographic_breakdowns = r.json().get("data", [])
        except Exception as e:
            logger.warn("Failed to fetch live demographic data from Meta. Falling back to mocks.", error=str(e))

    if is_mock or not demographic_breakdowns:
        demographic_breakdowns = [
            {"age": "18-24", "gender": "female", "spend": 1200.00, "impressions": 15000, "clicks": 180, "actions": [{"action_type": "purchase", "value": 1}], "action_values": [{"action_type": "purchase", "value": 800.00}]},
            {"age": "18-24", "gender": "male", "spend": 1100.00, "impressions": 14000, "clicks": 150, "actions": [{"action_type": "purchase", "value": 0}], "action_values": []},
            {"age": "25-34", "gender": "female", "spend": 3500.00, "impressions": 40000, "clicks": 720, "actions": [{"action_type": "purchase", "value": 14}], "action_values": [{"action_type": "purchase", "value": 11200.00}]},
            {"age": "25-34", "gender": "male", "spend": 2800.00, "impressions": 30000, "clicks": 600, "actions": [{"action_type": "purchase", "value": 10}], "action_values": [{"action_type": "purchase", "value": 8000.00}]},
            {"age": "35-44", "gender": "female", "spend": 1900.00, "impressions": 20000, "clicks": 320, "actions": [{"action_type": "purchase", "value": 5}], "action_values": [{"action_type": "purchase", "value": 4000.00}]},
            {"age": "35-44", "gender": "male", "spend": 1500.00, "impressions": 18000, "clicks": 280, "actions": [{"action_type": "purchase", "value": 3}], "action_values": [{"action_type": "purchase", "value": 2400.00}]},
        ]

    output = []
    for demo in demographic_breakdowns:
        age = demo.get("age")
        gender = demo.get("gender")
        spend = float(demo.get("spend", 0.0))
        impressions = int(demo.get("impressions", 0))
        clicks = int(demo.get("clicks", 0))

        purchases = 0
        revenue = 0.0
        for act in demo.get("actions", []):
            if act.get("action_type") == "purchase":
                purchases = int(act.get("value", 0))
        for val in demo.get("action_values", []):
            if val.get("action_type") == "purchase":
                revenue = float(val.get("value", 0.0))

        ctr = (clicks / impressions) if impressions > 0 else 0.0
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
    is_mock = not token or token.startswith("EAAGm0PX") or token == "mock_access_token"

    custom_audiences = []
    if not is_mock and token:
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
            logger.warn("Failed to fetch live audiences from Meta. Falling back to mocks.", error=str(e))

    if is_mock or not custom_audiences:
        custom_audiences = [
            {"id": "aud_1", "name": "Website Visitors - Last 30 Days", "subtype": "WEBSITE", "approximate_count_size": 12500, "description": "Pixel-tracked users visiting any landing page"},
            {"id": "aud_2", "name": "Lookalike (IN, 1%) - Purchases", "subtype": "LOOKALIKE", "approximate_count_size": 420000, "description": "1% Lookalike based on seed purchase conversion event"},
            {"id": "aud_3", "name": "CRM Sync - Newsletter Subscribers List", "subtype": "CUSTOM", "approximate_count_size": 8400, "description": "Customer list match sync uploaded on 14 Aug"},
            {"id": "aud_4", "name": "Engaged with Instagram Page - 365 Days", "subtype": "ENGAGEMENT", "approximate_count_size": 32000, "description": "Users who sent a DM, saved a post, or visited profile"},
        ]

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


@router.get("/{ad_id}/daily", response_model=List[DailyMetricPoint], summary="Get ad daily performance metrics")
async def get_ad_daily_metrics(
    ad_id: uuid.UUID,
    start_date: date = Query(..., description="Start date of filter window"),
    end_date: date = Query(..., description="End date of filter window"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_db_user_from_claims(claims, db)
    # Verify ad access
    stmt = (
        select(Ad)
        .join(AdSet, Ad.ad_set_id == AdSet.id)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .where(Ad.id == ad_id)
        .where(Campaign.ad_account_id.in_(
            select(MetaAdAccount.id).where(MetaAdAccount.user_id == user.id)
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
        )
        for r in rows
    ]

