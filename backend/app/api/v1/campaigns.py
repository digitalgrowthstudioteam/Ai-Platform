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
    
    spend_trend: Optional[float] = 0.0
    impressions_trend: Optional[float] = 0.0
    clicks_trend: Optional[float] = 0.0
    purchases_trend: Optional[float] = 0.0
    leads_trend: Optional[float] = 0.0
    revenue_trend: Optional[float] = 0.0
    ctr_trend: Optional[float] = 0.0
    cpc_trend: Optional[float] = 0.0
    roas_trend: Optional[float] = 0.0


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
    outcome: Optional[str] = None


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
    from app.services.entitlement_engine import EntitlementEngine

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

    prev_metrics_subq = (
        select(
            CampaignDailyMetrics.campaign_id,
            func.coalesce(func.sum(CampaignDailyMetrics.spend), 0).label("spend"),
            func.coalesce(func.sum(CampaignDailyMetrics.impressions), 0).label("impressions"),
            func.coalesce(func.sum(CampaignDailyMetrics.clicks), 0).label("clicks"),
            func.coalesce(func.sum(CampaignDailyMetrics.purchases), 0).label("purchases"),
            func.coalesce(func.sum(CampaignDailyMetrics.leads), 0).label("leads"),
            func.coalesce(func.sum(CampaignDailyMetrics.revenue), 0).label("revenue"),
        )
        .where(CampaignDailyMetrics.date >= prev_start)
        .where(CampaignDailyMetrics.date <= prev_end)
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
            func.coalesce(prev_metrics_subq.c.spend, 0).label("prev_spend"),
            func.coalesce(prev_metrics_subq.c.impressions, 0).label("prev_impressions"),
            func.coalesce(prev_metrics_subq.c.clicks, 0).label("prev_clicks"),
            func.coalesce(prev_metrics_subq.c.purchases, 0).label("prev_purchases"),
            func.coalesce(prev_metrics_subq.c.leads, 0).label("prev_leads"),
            func.coalesce(prev_metrics_subq.c.revenue, 0).label("prev_revenue"),
        )
        .outerjoin(metrics_subq, Campaign.id == metrics_subq.c.campaign_id)
        .outerjoin(prev_metrics_subq, Campaign.id == prev_metrics_subq.c.campaign_id)
        .join(MetaAdAccount, Campaign.ad_account_id == MetaAdAccount.id)
        .where(MetaAdAccount.meta_account_id == ad_acc.meta_account_id)
        .order_by(func.coalesce(metrics_subq.c.spend, 0).desc(), Campaign.name.asc())
    )
    
    res = await db.execute(stmt)
    rows = res.all()

    # Query and sum conversations and calls from actions JSON daily logs
    daily_stmt = (
        select(CampaignDailyMetrics.campaign_id, CampaignDailyMetrics.actions)
        .join(Campaign, CampaignDailyMetrics.campaign_id == Campaign.id)
        .join(MetaAdAccount, Campaign.ad_account_id == MetaAdAccount.id)
        .where(MetaAdAccount.meta_account_id == ad_acc.meta_account_id)
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

        prev_spend = float(row.prev_spend)
        prev_impressions = int(row.prev_impressions)
        prev_clicks = int(row.prev_clicks)
        prev_purchases = int(row.prev_purchases)
        prev_leads = int(row.prev_leads)
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
        leads_trend = calc_t(leads, prev_leads)
        revenue_trend = calc_t(revenue, prev_revenue)
        ctr_trend = calc_t(ctr, prev_ctr)
        cpc_trend = calc_t(cpc, prev_cpc)
        roas_trend = calc_t(roas, prev_roas)

        conversations = conversations_map.get(camp.id, 0)
        calls = calls_map.get(camp.id, 0)

        goals = adsets_goals.get(camp.id, {})
        from app.services.goal_engine import PerformanceGoalEngine
        pg = goals.get("performance_goal")
        profile = PerformanceGoalEngine.get_metric_profile(objective=camp.objective, goal=pg)
        outcome = profile.get("outcome")

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
                outcome=outcome,
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
                    
                    spend_trend=spend_trend,
                    impressions_trend=impressions_trend,
                    clicks_trend=clicks_trend,
                    purchases_trend=purchases_trend,
                    leads_trend=leads_trend,
                    revenue_trend=revenue_trend,
                    ctr_trend=ctr_trend,
                    cpc_trend=cpc_trend,
                    roas_trend=roas_trend,
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
    from app.services.entitlement_engine import EntitlementEngine

    # Enforce plan historical days date capping
    start_date = await EntitlementEngine.enforce_historical_days(start_date, user, db)
    
    # 1. Fetch AdSet
    accessible_ids = await EntitlementEngine.get_accessible_user_ids(user, db)
    stmt = (
        select(AdSet)
        .join(Campaign, AdSet.campaign_id == Campaign.id)
        .where(AdSet.id == adset_id)
        .where(Campaign.id == campaign_id)
        .where(Campaign.ad_account_id.in_(
            select(MetaAdAccount.id).where(MetaAdAccount.user_id.in_(accessible_ids))
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
    # Verify campaign access via shared meta_account_id
    user_meta_account_ids = select(MetaAdAccount.meta_account_id).where(MetaAdAccount.user_id == user.id)
    stmt = (
        select(Campaign)
        .join(MetaAdAccount, Campaign.ad_account_id == MetaAdAccount.id)
        .where(Campaign.id == campaign_id)
        .where(MetaAdAccount.meta_account_id.in_(user_meta_account_ids))
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


@router.get("/brief-drilldown", summary="Get campaign and adset level performance drilldown for Daily Brief comparison")
async def get_brief_drilldown(
    ad_account_id: str = Query(..., description="Active Ad account ID string"),
    report_date: Optional[str] = Query(None, description="Report date (YYYY-MM-DD), default is yesterday"),
    days: int = Query(1, description="Number of days to check spend for"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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
        raise HTTPException(status_code=404, detail="Ad account not found.")

    # 2. Parse target date
    if report_date:
        try:
            target_date = datetime.strptime(report_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    else:
        target_date = date.today() - timedelta(days=1)

    # 3. Find campaigns with spend > 0.01 over the period ending on target_date
    start_dt = target_date - timedelta(days=days - 1)
    c_stmt = (
        select(Campaign)
        .join(CampaignDailyMetrics, Campaign.id == CampaignDailyMetrics.campaign_id)
        .where(Campaign.ad_account_id == ad_acc.id)
        .where(CampaignDailyMetrics.date >= start_dt)
        .where(CampaignDailyMetrics.date <= target_date)
        .where(CampaignDailyMetrics.spend >= 0.01)
        .group_by(Campaign.id)
    )
    c_res = await db.execute(c_stmt)
    active_campaigns = c_res.scalars().all()

    if not active_campaigns:
        return []

    active_campaign_ids = [c.id for c in active_campaigns]

    # 4. Fetch all child AdSets
    adsets_stmt = select(AdSet).where(AdSet.campaign_id.in_(active_campaign_ids))
    adsets_res = await db.execute(adsets_stmt)
    adsets = adsets_res.scalars().all()

    if not adsets:
        return []

    adset_ids = [a.id for a in adsets]

    # 5. Fetch all AdSetDailyMetrics
    metrics_stmt = (
        select(AdSetDailyMetrics)
        .where(AdSetDailyMetrics.ad_set_id.in_(adset_ids))
        .where(AdSetDailyMetrics.date <= target_date)
    )
    metrics_res = await db.execute(metrics_stmt)
    all_metrics = metrics_res.scalars().all()

    # Group metrics by adset
    adset_metrics_map = {}
    for r in all_metrics:
        adset_metrics_map.setdefault(r.ad_set_id, []).append(r)

    # Spend per campaign over the period map
    yesterday_c_spend_stmt = (
        select(CampaignDailyMetrics.campaign_id, func.sum(CampaignDailyMetrics.spend).label("spend"))
        .where(CampaignDailyMetrics.campaign_id.in_(active_campaign_ids))
        .where(CampaignDailyMetrics.date >= start_dt)
        .where(CampaignDailyMetrics.date <= target_date)
        .group_by(CampaignDailyMetrics.campaign_id)
    )
    yesterday_c_spend_res = await db.execute(yesterday_c_spend_stmt)
    yesterday_c_spend = {r.campaign_id: float(r.spend or 0.0) for r in yesterday_c_spend_res.all()}

    # Group adsets by campaign
    campaign_adsets_map = {}
    for a in adsets:
        campaign_adsets_map.setdefault(a.campaign_id, []).append(a)

    results = []
    for c in active_campaigns:
        c_adsets = campaign_adsets_map.get(c.id, [])
        adset_list = []
        
        for a in c_adsets:
            rows = adset_metrics_map.get(a.id, [])
            
            # Map performance goal to primary metric
            perf_goal = (a.performance_goal or "").upper()
            metric_key = "link_clicks"
            metric_label = "Link Clicks"
            
            if "CONVERSATIONS" in perf_goal or "MESSAGING" in perf_goal:
                metric_key = "conversations"
                metric_label = "Conversations"
            elif "LEAD" in perf_goal:
                metric_key = "leads"
                metric_label = "Leads"
            elif "PURCHASE" in perf_goal:
                metric_key = "purchases"
                metric_label = "Purchases"
            else:
                # Fallback to campaign objective if performance goal is not specified
                obj = (c.objective or "").upper()
                if "LEAD" in obj:
                    metric_key = "leads"
                    metric_label = "Leads"
                elif "CONV" in obj or "ENGAGEMENT" in obj or "MESSAGING" in obj:
                    metric_key = "conversations"
                    metric_label = "Conversations"
                elif "SALE" in obj:
                    metric_key = "purchases"
                    metric_label = "Purchases"

            def get_window_stats(days_back: int, prev_shift: int):
                # current window
                c_start = target_date - timedelta(days=days_back - 1)
                c_end = target_date
                # previous window
                p_start = c_start - timedelta(days=prev_shift)
                p_end = c_end - timedelta(days=prev_shift)
                
                c_rows = [r for r in rows if c_start <= r.date <= c_end]
                p_rows = [r for r in rows if p_start <= r.date <= p_end]
                
                c_spend = sum(float(r.spend or 0.0) for r in c_rows)
                p_spend = sum(float(r.spend or 0.0) for r in p_rows)
                
                def get_metric_val(r):
                    if metric_key in ("conversations", "calls", "post_engagement"):
                        return int((r.actions or {}).get(metric_key, 0))
                    return int(getattr(r, metric_key, 0))
                
                c_val = sum(get_metric_val(r) for r in c_rows)
                p_val = sum(get_metric_val(r) for r in p_rows)
                
                c_cost = c_spend / c_val if c_val > 0 else 0.0
                p_cost = p_spend / p_val if p_val > 0 else 0.0
                
                val_change = ((c_val - p_val) / p_val) * 100.0 if p_val > 0 else 0.0
                cost_change = ((c_cost - p_cost) / p_cost) * 100.0 if p_cost > 0 else 0.0
                
                return {
                    "current_val": c_val,
                    "previous_val": p_val,
                    "val_change_pct": val_change,
                    "current_cost": c_cost,
                    "previous_cost": p_cost,
                    "cost_change_pct": cost_change,
                    "spend_current": c_spend,
                    "spend_previous": p_spend,
                }

            def get_lifetime_stats():
                c_spend = sum(float(r.spend or 0.0) for r in rows)
                def get_metric_val(r):
                    if metric_key in ("conversations", "calls", "post_engagement"):
                        return int((r.actions or {}).get(metric_key, 0))
                    return int(getattr(r, metric_key, 0))
                c_val = sum(get_metric_val(r) for r in rows)
                c_cost = c_spend / c_val if c_val > 0 else 0.0
                
                return {
                    "current_val": c_val,
                    "previous_val": 0,
                    "val_change_pct": 0.0,
                    "current_cost": c_cost,
                    "previous_cost": 0.0,
                    "cost_change_pct": 0.0,
                    "spend_current": c_spend,
                    "spend_previous": 0.0,
                }

            adset_list.append({
                "adset_id": a.id,
                "adset_name": a.name,
                "performance_goal": a.performance_goal,
                "metric_label": metric_label,
                "comparisons": {
                    "last_day": get_window_stats(1, 1),
                    "last_3d": get_window_stats(3, 3),
                    "last_7d": get_window_stats(7, 7),
                    "last_15d": get_window_stats(15, 15),
                    "last_30d": get_window_stats(30, 30),
                    "lifetime": get_lifetime_stats()
                }
            })
            
        results.append({
            "campaign_id": c.id,
            "campaign_name": c.name,
            "objective": c.objective,
            "yesterday_spend": yesterday_c_spend.get(c.id, 0.0),
            "adsets": adset_list
        })
        
    return results


# ──────────────────────────────────────────────
# AI Optimization Schemas & Endpoints
# ──────────────────────────────────────────────

class AIOptimizationConfigResponse(BaseModel):
    is_active: bool
    business_objective: Optional[str] = None
    primary_kpi: Optional[str] = None
    secondary_kpi: Optional[str] = None
    target_cpl: Optional[float] = None
    target_cpa: Optional[float] = None
    target_roas: Optional[float] = None
    last_analysis_at: Optional[datetime] = None
    active_count: int
    limit: int


class AIOptimizationDashboardItem(BaseModel):
    campaign_id: uuid.UUID
    campaign_name: str
    ad_account_name: str
    is_active: bool
    last_analysis_at: Optional[datetime] = None
    spend: float
    leads: int
    purchases: int
    revenue: float
    cpl: float
    roas: float
    cpl_change_7d: float
    roas_change_7d: float
    open_recommendations_count: int
    highest_priority: str
    over_limit: bool = False


class AIOptimizationDashboardResponse(BaseModel):
    active_count: int
    limit: int
    campaigns: List[AIOptimizationDashboardItem]


class ActivateAIOptimizationRequest(BaseModel):
    business_objective: Optional[str] = None
    primary_kpi: Optional[str] = None
    secondary_kpi: Optional[str] = None
    target_cpl: Optional[float] = None
    target_cpa: Optional[float] = None
    target_roas: Optional[float] = None


@router.get("/ai-optimization/dashboard", response_model=AIOptimizationDashboardResponse, summary="Get AI Optimization dashboard data")
async def get_ai_optimization_dashboard(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists campaigns with their optimization config status and 7D metrics aggregates.
    """
    user = await get_db_user_from_claims(claims, db)
    from app.services.entitlement_engine import EntitlementEngine
    from app.models.ai_optimization import AIOptimizationConfig
    from app.models.recommendation import AIRecommendation

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

    # 2. Get SaaS plan limits
    ent = await EntitlementEngine.resolve_entitlements(user, db)
    limit = ent.get("ai_optimization_campaign_limit", 0)

    # 3. Fetch all active configs globally ordered by oldest activation first
    global_stmt = (
        select(AIOptimizationConfig)
        .where(AIOptimizationConfig.user_id == user.id)
        .where(AIOptimizationConfig.is_active == True)
        .order_by(AIOptimizationConfig.created_at.asc())
    )
    global_res = await db.execute(global_stmt)
    global_configs = global_res.scalars().all()
    active_count = len(global_configs)
    entitled_campaign_ids = {cfg.campaign_id for cfg in global_configs[:limit]}

    # 4. Fetch all campaigns in this ad account
    stmt_c = select(Campaign).where(Campaign.ad_account_id == ad_acc.id).order_by(Campaign.name.asc())
    res_c = await db.execute(stmt_c)
    campaigns = res_c.scalars().all()

    # 5. Fetch all optimization configs for campaigns in this ad account
    stmt_cfg = select(AIOptimizationConfig).where(AIOptimizationConfig.ad_account_id == ad_acc.id)
    res_cfg = await db.execute(stmt_cfg)
    configs = {cfg.campaign_id: cfg for cfg in res_cfg.scalars().all()}

    # 6. Fetch daily metrics to compute 7d values
    today = date.today()
    start_date = today - timedelta(days=14)
    stmt_metrics = (
        select(CampaignDailyMetrics)
        .join(Campaign, CampaignDailyMetrics.campaign_id == Campaign.id)
        .where(Campaign.ad_account_id == ad_acc.id)
        .where(CampaignDailyMetrics.date >= start_date)
    )
    res_metrics = await db.execute(stmt_metrics)
    all_metrics = res_metrics.scalars().all()

    # Group metrics by campaign
    metrics_by_camp = {}
    for m in all_metrics:
        if m.campaign_id not in metrics_by_camp:
            metrics_by_camp[m.campaign_id] = []
        metrics_by_camp[m.campaign_id].append(m)

    # 7. Fetch active recommendations count and highest priority per campaign
    stmt_recs = (
        select(AIRecommendation)
        .where(AIRecommendation.ad_account_id == ad_acc.id)
        .where(AIRecommendation.status.in_(["new", "viewed"]))
    )
    res_recs = await db.execute(stmt_recs)
    active_recs = res_recs.scalars().all()
    
    recs_by_camp = {}
    for r in active_recs:
        c_id = r.campaign_id or r.entity_id
        if not c_id:
            continue
        if c_id not in recs_by_camp:
            recs_by_camp[c_id] = []
        recs_by_camp[c_id].append(r)

    # Compile list items
    items = []
    for c in campaigns:
        cfg = configs.get(c.id)
        is_active = cfg.is_active if cfg else False
        last_analysis = cfg.last_analysis_at if cfg else None
        
        # Calculate 7D stats
        camp_metrics = metrics_by_camp.get(c.id, [])
        cur_m = [m for m in camp_metrics if m.date >= today - timedelta(days=7)]
        prev_m = [m for m in camp_metrics if today - timedelta(days=14) <= m.date < today - timedelta(days=7)]
        
        spend = sum(float(m.spend or 0.0) for m in cur_m)
        leads = sum(m.leads or 0 for m in cur_m)
        purchases = sum(m.purchases or 0 for m in cur_m)
        revenue = sum(float(m.revenue or 0.0) for m in cur_m)
        cpl = spend / leads if leads > 0 else spend
        roas = revenue / spend if spend > 0 else 0.0
        
        prev_spend = sum(float(m.spend or 0.0) for m in prev_m)
        prev_leads = sum(m.leads or 0 for m in prev_m)
        prev_purchases = sum(m.purchases or 0 for m in prev_m)
        prev_revenue = sum(float(m.revenue or 0.0) for m in prev_m)
        prev_cpl = prev_spend / prev_leads if prev_leads > 0 else prev_spend
        prev_roas = prev_revenue / prev_spend if prev_spend > 0 else 0.0
        
        cpl_change = (cpl - prev_cpl) / prev_cpl if prev_cpl > 0 else 0.0
        roas_change = (roas - prev_roas) / prev_roas if prev_roas > 0 else 0.0
        
        # Recommendations summary
        camp_recs = recs_by_camp.get(c.id, [])
        open_count = len(camp_recs)
        
        priority_order = {"critical": 4, "high": 3, "medium": 2, "low": 1, "opportunity": 2}
        highest_prio_val = 0
        highest_prio_str = "none"
        for r in camp_recs:
            prio = (r.priority or "info").lower()
            prio_val = priority_order.get(prio, 0)
            if prio_val > highest_prio_val:
                highest_prio_val = prio_val
                highest_prio_str = prio
                
        is_over_limit = False
        if is_active and c.id not in entitled_campaign_ids:
            is_over_limit = True

        items.append(
            AIOptimizationDashboardItem(
                campaign_id=c.id,
                campaign_name=c.name,
                ad_account_name=ad_acc.account_name or "Connected Account",
                is_active=is_active,
                last_analysis_at=last_analysis,
                spend=spend,
                leads=leads,
                purchases=purchases,
                revenue=revenue,
                cpl=cpl,
                roas=roas,
                cpl_change_7d=cpl_change,
                roas_change_7d=roas_change,
                open_recommendations_count=open_count,
                highest_priority=highest_prio_str,
                over_limit=is_over_limit
            )
        )

    # Sort items: active first, then spend descending
    items.sort(key=lambda x: (not x.is_active, -x.spend))

    return AIOptimizationDashboardResponse(
        active_count=active_count,
        limit=limit,
        campaigns=items
    )


@router.get("/{campaign_id}/ai-optimization", response_model=AIOptimizationConfigResponse, summary="Get AI Optimization status for a campaign")
async def get_ai_optimization_status(
    campaign_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns AI active state and targets for a single campaign.
    """
    user = await get_db_user_from_claims(claims, db)
    from app.services.entitlement_engine import EntitlementEngine
    from app.models.ai_optimization import AIOptimizationConfig

    # 1. Fetch the campaign and check ownership
    stmt = (
        select(Campaign)
        .join(MetaAdAccount, Campaign.ad_account_id == MetaAdAccount.id)
        .where(Campaign.id == campaign_id)
    )
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found."
        )

    # Validate ownership
    accessible_ids = await EntitlementEngine.get_accessible_user_ids(user, db)
    stmt_acc = select(MetaAdAccount).where(MetaAdAccount.id == campaign.ad_account_id).where(MetaAdAccount.user_id.in_(accessible_ids))
    res_acc = await db.execute(stmt_acc)
    ad_acc = res_acc.scalar_one_or_none()
    if not ad_acc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this campaign's ad account."
        )

    # 2. Query dynamic limits
    ent = await EntitlementEngine.resolve_entitlements(user, db)
    limit = ent.get("ai_optimization_campaign_limit", 0)

    # Total active configs globally for this user
    stmt_active_total = (
        select(func.count(AIOptimizationConfig.id))
        .where(AIOptimizationConfig.user_id == user.id)
        .where(AIOptimizationConfig.is_active == True)
    )
    res_active_total = await db.execute(stmt_active_total)
    active_count = res_active_total.scalar_one()

    # Get campaign optimization config
    stmt_cfg = select(AIOptimizationConfig).where(AIOptimizationConfig.campaign_id == campaign_id)
    res_cfg = await db.execute(stmt_cfg)
    cfg = res_cfg.scalar_one_or_none()

    if not cfg:
        return AIOptimizationConfigResponse(
            is_active=False,
            active_count=active_count,
            limit=limit
        )

    return AIOptimizationConfigResponse(
        is_active=cfg.is_active,
        business_objective=cfg.business_objective,
        primary_kpi=cfg.primary_kpi,
        secondary_kpi=cfg.secondary_kpi,
        target_cpl=cfg.target_cpl,
        target_cpa=cfg.target_cpa,
        target_roas=cfg.target_roas,
        last_analysis_at=cfg.last_analysis_at,
        active_count=active_count,
        limit=limit
    )


@router.post("/{campaign_id}/ai-optimization/activate", response_model=AIOptimizationConfigResponse, summary="Activate AI Optimization for a campaign")
async def activate_ai_optimization(
    campaign_id: uuid.UUID,
    payload: Optional[ActivateAIOptimizationRequest] = None,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Activates AI optimization for a campaign, checking plan limits.
    """
    user = await get_db_user_from_claims(claims, db)
    from app.services.entitlement_engine import EntitlementEngine
    from app.models.ai_optimization import AIOptimizationConfig

    # 1. Retrieve the campaign and verify ownership
    stmt = (
        select(Campaign)
        .join(MetaAdAccount, Campaign.ad_account_id == MetaAdAccount.id)
        .where(Campaign.id == campaign_id)
    )
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found."
        )

    accessible_ids = await EntitlementEngine.get_accessible_user_ids(user, db)
    stmt_acc = select(MetaAdAccount).where(MetaAdAccount.id == campaign.ad_account_id).where(MetaAdAccount.user_id.in_(accessible_ids))
    res_acc = await db.execute(stmt_acc)
    ad_acc = res_acc.scalar_one_or_none()
    if not ad_acc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this campaign's ad account."
        )

    # 2. Check limits
    ent = await EntitlementEngine.resolve_entitlements(user, db)
    limit = ent.get("ai_optimization_campaign_limit", 0)

    # Check if config already exists and is active
    stmt_cfg = select(AIOptimizationConfig).where(AIOptimizationConfig.campaign_id == campaign_id)
    res_cfg = await db.execute(stmt_cfg)
    cfg = res_cfg.scalar_one_or_none()

    is_already_active = cfg.is_active if cfg else False

    # Get total active configs globally for this user
    stmt_active_total = (
        select(func.count(AIOptimizationConfig.id))
        .where(AIOptimizationConfig.user_id == user.id)
        .where(AIOptimizationConfig.is_active == True)
    )
    res_active_total = await db.execute(stmt_active_total)
    active_count = res_active_total.scalar_one()

    if not is_already_active:
        if active_count >= limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have reached your AI Optimization limit for your current plan."
            )

    # 3. Create or update config
    payload_data = payload.dict() if payload else {}
    if not cfg:
        cfg = AIOptimizationConfig(
            user_id=user.id,
            ad_account_id=campaign.ad_account_id,
            campaign_id=campaign_id,
            is_active=True,
            business_objective=payload_data.get("business_objective"),
            primary_kpi=payload_data.get("primary_kpi"),
            secondary_kpi=payload_data.get("secondary_kpi"),
            target_cpl=payload_data.get("target_cpl"),
            target_cpa=payload_data.get("target_cpa"),
            target_roas=payload_data.get("target_roas"),
            memory={}
        )
        db.add(cfg)
        active_count += 1
    else:
        cfg.is_active = True
        if "business_objective" in payload_data:
            cfg.business_objective = payload_data.get("business_objective")
        if "primary_kpi" in payload_data:
            cfg.primary_kpi = payload_data.get("primary_kpi")
        if "secondary_kpi" in payload_data:
            cfg.secondary_kpi = payload_data.get("secondary_kpi")
        if "target_cpl" in payload_data:
            cfg.target_cpl = payload_data.get("target_cpl")
        if "target_cpa" in payload_data:
            cfg.target_cpa = payload_data.get("target_cpa")
        if "target_roas" in payload_data:
            cfg.target_roas = payload_data.get("target_roas")
        
        db.add(cfg)
        if not is_already_active:
            active_count += 1

    await db.commit()
    await db.refresh(cfg)

    # Run analysis immediately in the background task
    try:
        from app.services.ai_optimization_service import AIOptimizationService
        import asyncio
        asyncio.create_task(AIOptimizationService.analyze_campaign(db, cfg, user.id))
    except Exception as run_err:
        logger.error("Failed triggering immediate analysis on activation", error=str(run_err))

    return AIOptimizationConfigResponse(
        is_active=cfg.is_active,
        business_objective=cfg.business_objective,
        primary_kpi=cfg.primary_kpi,
        secondary_kpi=cfg.secondary_kpi,
        target_cpl=cfg.target_cpl,
        target_cpa=cfg.target_cpa,
        target_roas=cfg.target_roas,
        last_analysis_at=cfg.last_analysis_at,
        active_count=active_count,
        limit=limit
    )


@router.post("/{campaign_id}/ai-optimization/deactivate", response_model=AIOptimizationConfigResponse, summary="Deactivate AI Optimization for a campaign")
async def deactivate_ai_optimization(
    campaign_id: uuid.UUID,
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deactivates campaign optimization without losing recommendations or data history.
    """
    user = await get_db_user_from_claims(claims, db)
    from app.services.entitlement_engine import EntitlementEngine
    from app.models.ai_optimization import AIOptimizationConfig

    # 1. Fetch the campaign and check ownership
    stmt = (
        select(Campaign)
        .join(MetaAdAccount, Campaign.ad_account_id == MetaAdAccount.id)
        .where(Campaign.id == campaign_id)
    )
    res = await db.execute(stmt)
    campaign = res.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found."
        )

    accessible_ids = await EntitlementEngine.get_accessible_user_ids(user, db)
    stmt_acc = select(MetaAdAccount).where(MetaAdAccount.id == campaign.ad_account_id).where(MetaAdAccount.user_id.in_(accessible_ids))
    res_acc = await db.execute(stmt_acc)
    ad_acc = res_acc.scalar_one_or_none()
    if not ad_acc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this campaign's ad account."
        )

    # 2. Get configuration
    stmt_cfg = select(AIOptimizationConfig).where(AIOptimizationConfig.campaign_id == campaign_id)
    res_cfg = await db.execute(stmt_cfg)
    cfg = res_cfg.scalar_one_or_none()

    if not cfg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI Optimization config not found for this campaign."
        )

    cfg.is_active = False
    db.add(cfg)
    await db.commit()
    await db.refresh(cfg)

    # Get total active configs globally for this user
    stmt_active_total = (
        select(func.count(AIOptimizationConfig.id))
        .where(AIOptimizationConfig.user_id == user.id)
        .where(AIOptimizationConfig.is_active == True)
    )
    res_active_total = await db.execute(stmt_active_total)
    active_count = res_active_total.scalar_one()

    # Query dynamic limits
    ent = await EntitlementEngine.resolve_entitlements(user, db)
    limit = ent.get("ai_optimization_campaign_limit", 0)

    return AIOptimizationConfigResponse(
        is_active=cfg.is_active,
        business_objective=cfg.business_objective,
        primary_kpi=cfg.primary_kpi,
        secondary_kpi=cfg.secondary_kpi,
        target_cpl=cfg.target_cpl,
        target_cpa=cfg.target_cpa,
        target_roas=cfg.target_roas,
        last_analysis_at=cfg.last_analysis_at,
        active_count=active_count,
        limit=limit
    )



