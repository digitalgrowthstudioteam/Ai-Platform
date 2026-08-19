"""
Digital Growth Studio — Campaigns Router
"""
import uuid
import structlog
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.dependencies import get_current_user, require_active_subscription
from app.api.v1.meta import get_db_user_from_claims
from app.models.meta import MetaAdAccount
from app.models.campaign import Campaign, AdSet
from app.models.metrics import CampaignDailyMetrics, AdSetDailyMetrics

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
    leads: int
    revenue: float
    ctr: float
    cpc: float
    cpm: float
    roas: float
    conversations: Optional[int] = 0
    calls: Optional[int] = 0


class CampaignItemResponse(BaseModel):
    id: uuid.UUID
    meta_campaign_id: str
    name: str
    objective: str
    status: str
    daily_budget: Optional[float]
    lifetime_budget: Optional[float]
    metrics: CampaignMetrics
    performance_goal: Optional[str] = None
    optimization_event: Optional[str] = None


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
            func.coalesce(func.sum(CampaignDailyMetrics.leads), 0).label("leads"),
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
            func.coalesce(metrics_subq.c.leads, 0).label("leads"),
            func.coalesce(metrics_subq.c.revenue, 0).label("revenue"),
        )
        .outerjoin(metrics_subq, Campaign.id == metrics_subq.c.campaign_id)
        .where(Campaign.ad_account_id == ad_acc.id)
        .order_by(Campaign.name.asc())
    )
    
    res = await db.execute(stmt)
    rows = res.all()

    # Query and sum conversations and calls from actions JSON daily logs
    daily_stmt = (
        select(CampaignDailyMetrics.campaign_id, CampaignDailyMetrics.actions)
        .join(Campaign, CampaignDailyMetrics.campaign_id == Campaign.id)
        .where(Campaign.ad_account_id == ad_acc.id)
        .where(CampaignDailyMetrics.date >= start_date)
        .where(CampaignDailyMetrics.date <= end_date)
    )
    daily_res = await db.execute(daily_stmt)
    daily_rows = daily_res.all()
    
    conversations_map = {}
    calls_map = {}
    for r in daily_rows:
        c_id = r.campaign_id
        actions = r.actions or {}
        conversations_map[c_id] = conversations_map.get(c_id, 0) + int(actions.get("conversations", 0))
        calls_map[c_id] = calls_map.get(c_id, 0) + int(actions.get("calls", 0))

    # Resolve performance_goal and optimization_event per campaign based on active/primary adsets
    campaign_ids = [row.Campaign.id for row in rows]
    adsets_goals = {}
    if campaign_ids:
        adsets_stmt = select(
            AdSet.campaign_id,
            AdSet.performance_goal,
            AdSet.optimization_event,
            AdSet.status
        ).where(AdSet.campaign_id.in_(campaign_ids))
        adsets_res = await db.execute(adsets_stmt)
        adsets_rows = adsets_res.all()
        for r in adsets_rows:
            c_id = r.campaign_id
            if c_id not in adsets_goals or r.status == "ACTIVE":
                adsets_goals[c_id] = {
                    "performance_goal": r.performance_goal,
                    "optimization_event": r.optimization_event
                }

    campaigns = []
    for row in rows:
        camp = row.Campaign
        spend = float(row.spend)
        impressions = int(row.impressions)
        clicks = int(row.clicks)
        purchases = int(row.purchases)
        leads = int(row.leads)
        revenue = float(row.revenue)

        ctr = (clicks / impressions) if impressions > 0 else 0.0
        cpc = (spend / clicks) if clicks > 0 else 0.0
        cpm = (spend / impressions * 1000) if impressions > 0 else 0.0
        roas = (revenue / spend) if spend > 0 else 0.0
        conversations = conversations_map.get(camp.id, 0)
        calls = calls_map.get(camp.id, 0)

        goals = adsets_goals.get(camp.id, {})

        campaigns.append(
            CampaignItemResponse(
                id=camp.id,
                meta_campaign_id=camp.meta_campaign_id,
                name=camp.name,
                objective=camp.objective,
                status=camp.status,
                daily_budget=float(camp.daily_budget) if camp.daily_budget else None,
                lifetime_budget=float(camp.lifetime_budget) if camp.lifetime_budget else None,
                performance_goal=goals.get("performance_goal"),
                optimization_event=goals.get("optimization_event"),
                metrics=CampaignMetrics(
                    spend=spend,
                    impressions=impressions,
                    clicks=clicks,
                    purchases=purchases,
                    leads=leads,
                    revenue=revenue,
                    ctr=ctr,
                    cpc=cpc,
                    cpm=cpm,
                    roas=roas,
                    conversations=conversations,
                    calls=calls,
                ),
            )
        )
    return campaigns


# ──────────────────────────────────────────────
# Dynamic Performance Goal API (Phase 6)
# ──────────────────────────────────────────────

@router.get("/{campaign_id}/adsets/{adset_id}/performance", summary="Get goal-aware performance profile of an adset")
async def get_adset_performance(
    campaign_id: uuid.UUID,
    adset_id: uuid.UUID,
    start_date: date = Query(..., description="Start date of filter window"),
    end_date: date = Query(..., description="End date of filter window"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Computes and returns a performance report fully dynamic and customized to the
    AdSet's specific Meta Performance Goal.
    """
    user = await get_db_user_from_claims(claims, db)
    
    # 1. Fetch AdSet
    stmt = (
        select(AdSet)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .where(AdSet.id == adset_id)
        .where(Campaign.id == campaign_id)
        .where(Campaign.ad_account_id.in_(
            select(MetaAdAccount.id).where(MetaAdAccount.user_id == user.id)
        ))
    )
    res = await db.execute(stmt)
    adset = res.scalar_one_or_none()
    if not adset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AdSet not found or access denied."
        )

    # 2. Get Performance Goal Profile
    from app.core.performance_goals import get_goal_profile
    from app.services.metric_engine import MetricEngine, METRIC_CATALOG
    
    goal_id = adset.performance_goal_profile_id or adset.performance_goal or "conversions"
    profile = get_goal_profile(goal_id)

    # 3. Calculate Date Ranges (Current vs Previous)
    duration = end_date - start_date + timedelta(days=1)
    prev_start = start_date - duration
    prev_end = start_date - timedelta(days=1)

    # 4. Fetch metrics helper
    async def get_metrics_for_period(s_date: date, e_date: date) -> dict:
        stmt = (
            select(AdSetDailyMetrics)
            .where(AdSetDailyMetrics.ad_set_id == adset_id)
            .where(AdSetDailyMetrics.date >= s_date)
            .where(AdSetDailyMetrics.date <= e_date)
        )
        res = await db.execute(stmt)
        rows = res.scalars().all()
        
        aggregated_actions = {}
        total_spend = 0.0
        total_impressions = 0
        total_reach = 0
        total_clicks = 0
        total_link_clicks = 0
        total_leads = 0
        total_purchases = 0
        total_revenue = 0.0

        for row in rows:
            total_spend += float(row.spend or 0.0)
            total_impressions += int(row.impressions or 0)
            total_reach += int(row.reach or 0)
            total_clicks += int(row.clicks or 0)
            total_link_clicks += int(row.link_clicks or 0)
            total_leads += int(row.leads or 0)
            total_purchases += int(row.purchases or 0)
            total_revenue += float(row.revenue or 0.0)
            
            if row.actions:
                for k, v in row.actions.items():
                    aggregated_actions[k] = aggregated_actions.get(k, 0) + int(v or 0)

        # Merge standard with action dictionary
        raw_map = {
            "spend": total_spend,
            "impressions": total_impressions,
            "reach": total_reach,
            "clicks": total_clicks,
            "link_clicks": total_link_clicks,
            "leads": total_leads,
            "purchases": total_purchases,
            "revenue": total_revenue,
            **aggregated_actions
        }
        return MetricEngine.calculate_derived_metrics(raw_map)

    curr_metrics = await get_metrics_for_period(start_date, end_date)
    prev_metrics = await get_metrics_for_period(prev_start, prev_end)

    # 5. Format metric nodes
    def compile_metric_node(m_id: str) -> dict:
        metadata = METRIC_CATALOG.get(m_id) or {"name": m_id.replace("_", " ").title(), "category": "PRIMARY", "unit": "count", "format": "float", "precision": 2}
        val = curr_metrics.get(m_id)
        prev_val = prev_metrics.get(m_id)
        
        change_pct = None
        trend = "stable"
        if val is not None and prev_val is not None and prev_val > 0:
            change_pct = ((val - prev_val) / prev_val) * 100.0
            
            # Determine trend direction (is lower better or higher better?)
            is_cost = m_id.startswith("cost_") or m_id in ("cpc", "cpm", "cpl", "cpa", "cpp")
            if change_pct > 2.0:
                trend = "degrading" if is_cost else "improving"
            elif change_pct < -2.0:
                trend = "improving" if is_cost else "degrading"

        # Determine metric status
        status = "normal"
        if trend == "improving":
            status = "good"
        elif trend == "degrading":
            status = "critical"

        # Formula description helper
        formula_map = {
            "cpm": "spend / impressions * 1000",
            "cpc": "spend / link_clicks",
            "ctr": "clicks / impressions * 100",
            "cpl": "spend / leads",
            "cost_per_call": "spend / calls",
            "roas": "revenue / spend",
            "cpa": "spend / purchases"
        }

        return {
            "metric": m_id,
            "name": metadata["name"],
            "value": val,
            "previous_value": prev_val,
            "change_percent": change_pct,
            "trend": trend,
            "status": status,
            "formula": formula_map.get(m_id, "native_meta_integration"),
            "data_source": "Meta API Normalized Layer",
            "availability": "available" if val is not None else "unavailable"
        }

    # Split into response sections
    primary = []
    secondary = []
    diagnostic = []
    business = []
    unavailable = []

    # Map sections
    for m in profile.get("primary_metrics", []):
        node = compile_metric_node(m)
        if node["availability"] == "available":
            primary.append(node)
        else:
            unavailable.append(node)

    for m in profile.get("secondary_metrics", []):
        node = compile_metric_node(m)
        if node["availability"] == "available":
            secondary.append(node)
        else:
            unavailable.append(node)

    for m in profile.get("diagnostic_metrics", []):
        node = compile_metric_node(m)
        if node["availability"] == "available":
            diagnostic.append(node)
        else:
            unavailable.append(node)

    for m in profile.get("business_metrics", []):
        node = compile_metric_node(m)
        # Show business metrics only when downstream data exists (value not None and > 0)
        if node["availability"] == "available" and node["value"] and node["value"] > 0:
            business.append(node)
        else:
            # We explicitly exclude or mark unavailable
            node["availability"] = "unavailable"
            unavailable.append(node)

    # 6. Calculate Health Score (Phase 8)
    health_weights = profile.get("health_score_profile") or {
        "cost_per_conversion": 0.40,
        "conversion_volume": 0.30,
        "cpm_stability": 0.20,
        "trend": 0.10
    }
    
    score = 80.0  # Default baseline score
    score_reasons = []

    # Simple dynamic adjustments based on trends of primary KPIs
    for prim in primary:
        m_id = prim["metric"]
        trend = prim["trend"]
        weight = health_weights.get(m_id, 0.20)
        
        if trend == "improving":
            score += (weight * 20.0)
            score_reasons.append(f"Improving {prim['name']}")
        elif trend == "degrading":
            score -= (weight * 30.0)
            score_reasons.append(f"Degrading {prim['name']}")
            
    # Cap score
    score = max(0.0, min(100.0, score))
    health_status = "good" if score >= 75 else ("warning" if score >= 50 else "critical")

    # 7. Compile Funnel
    funnel = []
    # Dynamic funnel based on motive
    motive_funnels = {
        "website": ["link_clicks", "landing_page_views", "conversions", "purchases"],
        "leads": ["impressions", "link_clicks", "leads", "qualified_leads"],
        "phone": ["impressions", "link_clicks", "calls", "qualified_calls"],
        "messaging": ["impressions", "link_clicks", "conversations", "messaging_leads"],
        "app": ["impressions", "link_clicks", "app_installs", "app_events"],
    }
    stages = motive_funnels.get(profile.get("motive", "website"), ["impressions", "link_clicks", "conversions"])
    
    for stage in stages:
        metadata = METRIC_CATALOG.get(stage) or {"name": stage}
        val = curr_metrics.get(stage, 0) or 0
        funnel.append({
            "stage": metadata["name"],
            "metric": stage,
            "value": int(val) if isinstance(val, (int, float)) else 0
        })

    return {
        "adset_id": str(adset_id),
        "campaign_id": str(campaign_id),
        "performance_goal": {
            "id": profile["id"],
            "name": profile["name"],
            "motive": profile["motive"],
            "description": profile["description"]
        },
        "primary_metrics": primary,
        "secondary_metrics": secondary,
        "diagnostic_metrics": diagnostic,
        "business_metrics": business,
        "unavailable_metrics": unavailable,
        "health_score": {
            "score": round(score),
            "status": health_status,
            "reasons": score_reasons
        },
        "funnel": funnel,
        "trend_summary": "improving" if score >= 75 else ("degrading" if score < 50 else "stable")
    }


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


@router.get("/{campaign_id}/daily", response_model=List[DailyMetricPoint], summary="Get campaign daily performance metrics")
async def get_campaign_daily_metrics(
    campaign_id: uuid.UUID,
    start_date: date = Query(..., description="Start date of filter window"),
    end_date: date = Query(..., description="End date of filter window"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_db_user_from_claims(claims, db)
    # Verify campaign access
    stmt = (
        select(Campaign)
        .where(Campaign.id == campaign_id)
        .where(Campaign.ad_account_id.in_(
            select(MetaAdAccount.id).where(MetaAdAccount.user_id == user.id)
        ))
    )
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")

    # Fetch daily metrics
    stmt = (
        select(CampaignDailyMetrics)
        .where(CampaignDailyMetrics.campaign_id == campaign_id)
        .where(CampaignDailyMetrics.date >= start_date)
        .where(CampaignDailyMetrics.date <= end_date)
        .order_by(CampaignDailyMetrics.date.asc())
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


@router.get("/{campaign_id}/adsets/{adset_id}/daily", response_model=List[DailyMetricPoint], summary="Get adset daily performance metrics")
async def get_adset_daily_metrics(
    campaign_id: uuid.UUID,
    adset_id: uuid.UUID,
    start_date: date = Query(..., description="Start date of filter window"),
    end_date: date = Query(..., description="End date of filter window"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await get_db_user_from_claims(claims, db)
    # Verify adset access
    stmt = (
        select(AdSet)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .where(AdSet.id == adset_id)
        .where(Campaign.id == campaign_id)
        .where(Campaign.ad_account_id.in_(
            select(MetaAdAccount.id).where(MetaAdAccount.user_id == user.id)
        ))
    )
    res = await db.execute(stmt)
    adset = res.scalar_one_or_none()
    if not adset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AdSet not found.")

    # Fetch daily metrics
    stmt = (
        select(AdSetDailyMetrics)
        .where(AdSetDailyMetrics.ad_set_id == adset_id)
        .where(AdSetDailyMetrics.date >= start_date)
        .where(AdSetDailyMetrics.date <= end_date)
        .order_by(AdSetDailyMetrics.date.asc())
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


