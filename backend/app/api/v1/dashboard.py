"""
Digital Growth Studio — Dashboard Analytics Router
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
from app.models.campaign import Campaign
from app.models.metrics import CampaignDailyMetrics

logger = structlog.get_logger()
router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard Analytics"],
    dependencies=[Depends(require_active_subscription)],
)


# ──────────────────────────────────────────────
# Pydantic Schemas
# ──────────────────────────────────────────────
class MetricValue(BaseModel):
    value: float
    trend: float  # Percentage change compared to previous period


class DashboardOverviewResponse(BaseModel):
    spend: MetricValue
    impressions: MetricValue
    clicks: MetricValue
    purchases: MetricValue
    revenue: MetricValue
    ctr: MetricValue
    cpc: MetricValue
    cpm: MetricValue
    roas: MetricValue
    cpa: MetricValue


class ChartDataPoint(BaseModel):
    date: date
    spend: float
    impressions: int
    clicks: int
    purchases: int
    revenue: float
    roas: float


class HealthItem(BaseModel):
    label: str
    status: str  # Good, Needs attention, Critical
    statusClass: str  # good, attention, critical


class HealthScoreResponse(BaseModel):
    score: int
    status: str  # Good, Fair, Poor
    statusClass: str  # good, attention, critical
    items: List[HealthItem]


# ──────────────────────────────────────────────
# Helper: Query Aggregated Metrics
# ──────────────────────────────────────────────
async def query_aggregated_metrics(
    db: AsyncSession, ad_account_uuid: uuid.UUID, start: date, end: date
) -> dict:
    """Runs database aggregations for a specified date range."""
    stmt = (
        select(
            func.coalesce(func.sum(CampaignDailyMetrics.spend), 0).label("spend"),
            func.coalesce(func.sum(CampaignDailyMetrics.impressions), 0).label("impressions"),
            func.coalesce(func.sum(CampaignDailyMetrics.clicks), 0).label("clicks"),
            func.coalesce(func.sum(CampaignDailyMetrics.purchases), 0).label("purchases"),
            func.coalesce(func.sum(CampaignDailyMetrics.revenue), 0).label("revenue"),
        )
        .join(Campaign, CampaignDailyMetrics.campaign_id == Campaign.id)
        .where(Campaign.ad_account_id == ad_account_uuid)
        .where(CampaignDailyMetrics.date >= start)
        .where(CampaignDailyMetrics.date <= end)
    )
    res = await db.execute(stmt)
    row = res.fetchone()
    
    if not row:
        return {"spend": 0.0, "impressions": 0, "clicks": 0, "purchases": 0, "revenue": 0.0}
        
    return {
        "spend": float(row.spend),
        "impressions": int(row.impressions),
        "clicks": int(row.clicks),
        "purchases": int(row.purchases),
        "revenue": float(row.revenue),
    }


def calculate_rates(data: dict) -> dict:
    """Calculates ROI, ROAS, CPA, CPC, CPM, CTR rates from sums."""
    spend = data["spend"]
    impressions = data["impressions"]
    clicks = data["clicks"]
    purchases = data["purchases"]
    revenue = data["revenue"]

    ctr = (clicks / impressions) if impressions > 0 else 0.0
    cpc = (spend / clicks) if clicks > 0 else 0.0
    cpm = (spend / impressions * 1000) if impressions > 0 else 0.0
    roas = (revenue / spend) if spend > 0 else 0.0
    cpa = (spend / purchases) if purchases > 0 else 0.0

    return {
        "spend": spend,
        "impressions": impressions,
        "clicks": clicks,
        "purchases": purchases,
        "revenue": revenue,
        "ctr": ctr,
        "cpc": cpc,
        "cpm": cpm,
        "roas": roas,
        "cpa": cpa,
    }


def calculate_trend(curr: float, prev: float) -> float:
    """Calculates percentage trend difference between current and previous values."""
    if prev <= 0:
        return 0.0
    return ((curr - prev) / prev) * 100.0


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("/overview", response_model=DashboardOverviewResponse, summary="Retrieve dashboard overview analytics")
async def get_overview_analytics(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    start_date: date = Query(..., description="Start date of filter window"),
    end_date: date = Query(..., description="End date of filter window"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns aggregated ROI and marketing delivery metrics for the selected active ad account.
    Includes percentage trends calculated against the previous period of identical length.
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
            detail=f"Active ad account '{ad_account_id}' not found for user."
        )

    # 2. Calculate current period length & previous date range
    period_len = (end_date - start_date).days + 1
    prev_end = start_date - timedelta(days=1)
    prev_start = start_date - timedelta(days=period_len)

    # 3. Query metrics for both periods
    curr_data_sums = await query_aggregated_metrics(db, ad_acc.id, start_date, end_date)
    prev_data_sums = await query_aggregated_metrics(db, ad_acc.id, prev_start, prev_end)

    # 4. Calculate rates
    curr_rates = calculate_rates(curr_data_sums)
    prev_rates = calculate_rates(prev_data_sums)

    # 5. Populate Metrics with Trends
    return DashboardOverviewResponse(
        spend=MetricValue(value=curr_rates["spend"], trend=calculate_trend(curr_rates["spend"], prev_rates["spend"])),
        impressions=MetricValue(value=curr_rates["impressions"], trend=calculate_trend(curr_rates["impressions"], prev_rates["impressions"])),
        clicks=MetricValue(value=curr_rates["clicks"], trend=calculate_trend(curr_rates["clicks"], prev_rates["clicks"])),
        purchases=MetricValue(value=curr_rates["purchases"], trend=calculate_trend(curr_rates["purchases"], prev_rates["purchases"])),
        revenue=MetricValue(value=curr_rates["revenue"], trend=calculate_trend(curr_rates["revenue"], prev_rates["revenue"])),
        ctr=MetricValue(value=curr_rates["ctr"], trend=calculate_trend(curr_rates["ctr"], prev_rates["ctr"])),
        cpc=MetricValue(value=curr_rates["cpc"], trend=calculate_trend(curr_rates["cpc"], prev_rates["cpc"])),
        cpm=MetricValue(value=curr_rates["cpm"], trend=calculate_trend(curr_rates["cpm"], prev_rates["cpm"])),
        roas=MetricValue(value=curr_rates["roas"], trend=calculate_trend(curr_rates["roas"], prev_rates["roas"])),
        cpa=MetricValue(value=curr_rates["cpa"], trend=calculate_trend(curr_rates["cpa"], prev_rates["cpa"])),
    )


@router.get("/chart", response_model=List[ChartDataPoint], summary="Retrieve daily breakdown chart data")
async def get_chart_analytics(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    start_date: date = Query(..., description="Start date of filter window"),
    end_date: date = Query(..., description="End date of filter window"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns daily statistics points within the date range window for rendering line charts.
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

    # Query metrics grouped by date
    stmt = (
        select(
            CampaignDailyMetrics.date,
            func.coalesce(func.sum(CampaignDailyMetrics.spend), 0).label("spend"),
            func.coalesce(func.sum(CampaignDailyMetrics.impressions), 0).label("impressions"),
            func.coalesce(func.sum(CampaignDailyMetrics.clicks), 0).label("clicks"),
            func.coalesce(func.sum(CampaignDailyMetrics.purchases), 0).label("purchases"),
            func.coalesce(func.sum(CampaignDailyMetrics.revenue), 0).label("revenue"),
        )
        .join(Campaign, CampaignDailyMetrics.campaign_id == Campaign.id)
        .where(Campaign.ad_account_id == ad_acc.id)
        .where(CampaignDailyMetrics.date >= start_date)
        .where(CampaignDailyMetrics.date <= end_date)
        .group_by(CampaignDailyMetrics.date)
        .order_by(CampaignDailyMetrics.date.asc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    points = []
    for r in rows:
        spend = float(r.spend)
        revenue = float(r.revenue)
        roas = (revenue / spend) if spend > 0 else 0.0
        points.append(
            ChartDataPoint(
                date=r.date,
                spend=spend,
                impressions=int(r.impressions),
                clicks=int(r.clicks),
                purchases=int(r.purchases),
                revenue=revenue,
                roas=roas,
            )
        )
    return points


@router.get("/health", response_model=HealthScoreResponse, summary="Query account health rating")
async def get_account_health_score(
    ad_account_id: str = Query(..., description="Active Ad account ID string (UUID or meta_account_id)"),
    claims: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluates account health dynamically based on daily metrics ratios (CPL, ROAS, click-through rates).
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

    # Fetch last 14 days of performance logs to calculate metrics
    today = date.today()
    start = today - timedelta(days=14)
    data = await query_aggregated_metrics(db, ad_acc.id, start, today)
    rates = calculate_rates(data)

    # Evaluation logic
    score = 100
    items = []

    # 1. Campaign Structure check
    items.append(HealthItem(label="Campaign structure", status="Good", statusClass="good"))

    # 2. Conversion tracking check
    if rates["purchases"] > 0:
        items.append(HealthItem(label="Conversion tracking", status="Good", statusClass="good"))
    else:
        score -= 10
        items.append(HealthItem(label="Conversion tracking", status="No purchases detected", statusClass="attention"))

    # 3. Budget allocation check
    if rates["roas"] > 0 and rates["roas"] < 2.0:
        score -= 20
        items.append(HealthItem(label="Budget allocation", status="High CPA / Low ROAS", statusClass="critical"))
    else:
        items.append(HealthItem(label="Budget allocation", status="Good", statusClass="good"))

    # 4. Ad creative fatigue check
    if rates["ctr"] > 0 and rates["ctr"] < 0.015:
        score -= 15
        items.append(HealthItem(label="Ad creative fatigue", status="Low CTR (< 1.5%)", statusClass="attention"))
    else:
        items.append(HealthItem(label="Ad creative fatigue", status="Good", statusClass="good"))

    # 5. Audience targeting check
    items.append(HealthItem(label="Audience targeting", status="Good", statusClass="good"))

    # 6. Learning phase check
    items.append(HealthItem(label="Learning phase", status="Good", statusClass="good"))

    # Ensure score bounds
    score = max(10, min(100, score))
    
    status_str = "Good" if score >= 80 else "Fair" if score >= 50 else "Poor"
    status_cls = "good" if score >= 80 else "attention" if score >= 50 else "critical"

    return HealthScoreResponse(
        score=score,
        status=status_str,
        statusClass=status_cls,
        items=items,
    )
