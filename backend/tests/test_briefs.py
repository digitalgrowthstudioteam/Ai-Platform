"""
Digital Growth Studio — AI Briefs Integration Tests
"""
import pytest
import uuid
from datetime import date, timedelta, datetime
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.dependencies import get_current_user
from app.models.user import User
from app.models.meta import MetaConnection, MetaAdAccount
from app.models.campaign import Campaign, AdSet, Ad
from app.models.metrics import CampaignDailyMetrics
from app.models.daily_brief import AIDailyBrief, AIWeeklyBrief
from app.services.brief_service import AIBriefService

# Mock user claims
MOCK_CLAIMS = {
    "uid": "mock_firebase_uid_briefs_123",
    "email": "brief_test@example.com",
    "name": "Briefs Test User",
}


@pytest.fixture
def mock_auth():
    """Mock get_current_user dependency."""
    app.dependency_overrides[get_current_user] = lambda: MOCK_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
async def setup_brief_data(db: AsyncSession):
    """
    Sets up campaign structure, daily performance, and generates test daily metrics.
    """
    # 0. Clean up existing test records if any
    await db.execute(delete(AIDailyBrief))
    await db.execute(delete(AIWeeklyBrief))
    await db.execute(delete(CampaignDailyMetrics))
    await db.execute(delete(Campaign).where(Campaign.meta_campaign_id == "camp_briefs_1"))
    await db.execute(delete(MetaAdAccount).where(MetaAdAccount.meta_account_id == "act_briefs_888"))
    await db.execute(delete(User).where(User.email == MOCK_CLAIMS["email"]))
    await db.commit()

    # 1. User
    user = User(
        firebase_uid=MOCK_CLAIMS["uid"],
        email=MOCK_CLAIMS["email"],
        name=MOCK_CLAIMS["name"],
        trial_status="active",
        trial_started_at=datetime.utcnow(),
        trial_ends_at=datetime.utcnow() + timedelta(days=7),
        trial_used=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 2. Connection
    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_brief_user_999",
        status="connected",
        access_token="mock_access_token",
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)

    # 3. Ad Account
    ad_acc = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_briefs_888",
        account_name="DG Test Briefs Account",
        currency="INR",
        timezone="Asia/Kolkata",
        account_status=1,
    )
    db.add(ad_acc)
    await db.commit()
    await db.refresh(ad_acc)

    # 4. Campaign
    campaign = Campaign(
        ad_account_id=ad_acc.id,
        meta_campaign_id="camp_briefs_1",
        name="Lead Pacing Campaign",
        objective="OUTCOMES",
        status="ACTIVE",
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)

    # 5. Daily Metrics for yesterday and 7 days prior
    yesterday = date.today() - timedelta(days=1)
    
    # Yesterday metric
    y_metric = CampaignDailyMetrics(
        campaign_id=campaign.id,
        date=yesterday,
        spend=3000.00,
        impressions=25000,
        clicks=400,
        leads=30,
        purchases=0,
        revenue=0.0
    )
    db.add(y_metric)

    # Prior metrics (for 7 days average compare)
    for i in range(2, 9):
        past_date = date.today() - timedelta(days=i)
        past_metric = CampaignDailyMetrics(
            campaign_id=campaign.id,
            date=past_date,
            spend=2000.00,
            impressions=20000,
            clicks=300,
            leads=15,
            purchases=0,
            revenue=0.0
        )
        db.add(past_metric)

    await db.commit()
    return user, ad_acc, campaign


@pytest.mark.asyncio
async def test_generate_daily_brief(setup_brief_data, db: AsyncSession):
    user, ad_acc, campaign = setup_brief_data
    yesterday = date.today() - timedelta(days=1)

    # Generate daily brief
    brief = await AIBriefService.generate_daily_brief(db, ad_acc.id, user.id, yesterday)
    
    assert brief is not None
    assert brief.ad_account_id == ad_acc.id
    assert brief.report_date == yesterday
    assert brief.overall_status in ("Improving", "Stable", "Declining")
    assert brief.spend == 3000.00
    assert brief.results == 30
    assert brief.primary_kpi == "CPL"
    assert brief.primary_kpi_value == 100.00  # spend (3000) / leads (30)

    # Check database persistence
    stmt = select(AIDailyBrief).where(AIDailyBrief.id == brief.id)
    res = await db.execute(stmt)
    persisted = res.scalar_one_or_none()
    assert persisted is not None
    assert persisted.results == 30


@pytest.mark.asyncio
async def test_get_daily_brief_api(mock_auth, setup_brief_data, db: AsyncSession):
    user, ad_acc, campaign = setup_brief_data
    yesterday = date.today() - timedelta(days=1)
    yesterday_str = yesterday.strftime("%Y-%m-%d")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Get brief (automatically compiles if missing)
        response = await client.get(f"/api/v1/recommendations/brief/daily?ad_account_id={ad_acc.id}&report_date={yesterday_str}")
        assert response.status_code == 200
        data = response.json()
        assert data["spend"] == 3000.00
        assert data["results"] == 30
        assert data["primary_kpi_value"] == 100.00

        # Refresh brief
        refresh_response = await client.post(f"/api/v1/recommendations/brief/daily/refresh?ad_account_id={ad_acc.id}&report_date={yesterday_str}")
        assert refresh_response.status_code == 200
        refresh_data = refresh_response.json()
        assert refresh_data["spend"] == 3000.00


@pytest.mark.asyncio
async def test_get_weekly_brief_api(mock_auth, setup_brief_data, db: AsyncSession):
    user, ad_acc, campaign = setup_brief_data
    start_date = date.today() - timedelta(days=7)
    start_date_str = start_date.strftime("%Y-%m-%d")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Get weekly brief
        response = await client.get(f"/api/v1/recommendations/brief/weekly?ad_account_id={ad_acc.id}&start_date={start_date_str}")
        assert response.status_code == 200
        data = response.json()
        assert "spend" in data
        assert "results" in data
        assert "winning_pattern" in data
        assert "creative_fatigue_items" in data
