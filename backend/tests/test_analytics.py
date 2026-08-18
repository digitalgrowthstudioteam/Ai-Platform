"""
Digital Growth Studio — Dashboard & ROI Analytics Tests
"""
import pytest
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.dependencies import get_current_user
from app.models.user import User
from app.models.meta import MetaConnection, MetaAdAccount
from app.models.campaign import Campaign, AdSet, Ad
from app.models.creative import Creative
from app.models.metrics import CampaignDailyMetrics, AdSetDailyMetrics, AdDailyMetrics

# Mock user claims
MOCK_CLAIMS = {
    "uid": "mock_firebase_uid_analytics_123",
    "email": "analytics_test@example.com",
    "name": "Analytics Test User",
}


@pytest.fixture
def mock_auth():
    """Mock get_current_user dependency."""
    app.dependency_overrides[get_current_user] = lambda: MOCK_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
async def setup_analytics_data(db: AsyncSession):
    """
    Sets up a full campaign tree and daily performance logs for testing.
    """
    # 0. Clean up existing test records if any
    await db.execute(delete(Creative).where(Creative.meta_creative_id == "creative_999"))
    await db.execute(delete(Ad).where(Ad.meta_ad_id == "ad_999"))
    await db.execute(delete(AdSet).where(AdSet.meta_adset_id == "adset_999"))
    await db.execute(delete(Campaign).where(Campaign.meta_campaign_id == "camp_999"))
    await db.execute(delete(MetaAdAccount).where(MetaAdAccount.meta_account_id == "act_999999999"))
    await db.execute(delete(User).where(User.email == MOCK_CLAIMS["email"]))
    await db.commit()

    # 1. User
    user = User(
        firebase_uid=MOCK_CLAIMS["uid"],
        email=MOCK_CLAIMS["email"],
        name=MOCK_CLAIMS["name"],
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 2. Connection
    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_analytics_user_999",
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
        meta_account_id="act_999999999",
        account_name="DG Test Analytics Account",
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
        meta_campaign_id="camp_999",
        name="Test Analytics Campaign",
        objective="OUTCOMES",
        status="ACTIVE",
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)

    # 5. AdSet
    adset = AdSet(
        campaign_id=campaign.id,
        meta_adset_id="adset_999",
        name="Test Analytics AdSet",
        status="ACTIVE",
        optimization_goal="OFFSITE_CONVERSIONS",
        billing_event="IMPRESSIONS",
    )
    db.add(adset)
    await db.commit()
    await db.refresh(adset)

    # 6. Ad and Creative
    ad = Ad(
        ad_set_id=adset.id,
        meta_ad_id="ad_999",
        name="Test Analytics Ad",
        status="ACTIVE",
    )
    db.add(ad)
    await db.commit()
    await db.refresh(ad)

    creative = Creative(
        meta_creative_id="creative_999",
        ad_id=ad.id,
        headline="Test Headline",
        primary_text="Test Body",
        image_url="http://example.com/image.jpg",
    )
    db.add(creative)
    await db.commit()

    # 7. Seed 5 days of daily metrics
    # Dates: Today-4 to Today
    today = date.today()
    for i in range(5):
        day = today - timedelta(days=i)
        
        # Current period (today-4 to today) gets spend = 100.00 each day
        # Total Current Spend = 500.00
        # Total Current Impressions = 10000 (2000/day)
        # Total Current Clicks = 200 (40/day)
        # Total Current Purchases = 10 (2/day)
        # Total Current Revenue = 1000.00 (200.00/day) => ROAS = 2.0x
        # CPA = 50.00, CPC = 2.50
        c_metric = CampaignDailyMetrics(
            campaign_id=campaign.id,
            date=day,
            spend=100.00,
            impressions=2000,
            clicks=40,
            purchases=2,
            revenue=200.00,
            ctr=0.02,
            cpc=2.50,
            cpm=50.00,
            roas=2.00,
        )
        db.add(c_metric)

        ad_metric = AdDailyMetrics(
            ad_id=ad.id,
            date=day,
            spend=100.00,
            impressions=2000,
            clicks=40,
            purchases=2,
            revenue=200.00,
            ctr=0.02,
            cpc=2.50,
            cpm=50.00,
            roas=2.00,
        )
        db.add(ad_metric)

        # Seed previous period (Today-9 to Today-5) with spend = 50.00 each day
        # Total Previous Spend = 250.00, Purchases = 5, Revenue = 250.00 => ROAS = 1.0x
        prev_day = today - timedelta(days=i + 5)
        prev_metric = CampaignDailyMetrics(
            campaign_id=campaign.id,
            date=prev_day,
            spend=50.00,
            impressions=1000,
            clicks=20,
            purchases=1,
            revenue=50.00,
            ctr=0.02,
            cpc=2.50,
            cpm=50.00,
            roas=1.00,
        )
        db.add(prev_metric)

    await db.commit()

    yield {
        "user": user,
        "conn": conn,
        "ad_acc": ad_acc,
        "campaign": campaign,
        "adset": adset,
        "ad": ad,
    }

    # Cleanup
    await db.delete(creative)
    await db.delete(ad)
    await db.delete(adset)
    await db.delete(campaign)
    await db.delete(ad_acc)
    await db.delete(conn)
    await db.delete(user)
    await db.commit()


@pytest.mark.asyncio
async def test_dashboard_overview_metrics(mock_auth, setup_analytics_data, db: AsyncSession):
    """
    Verify aggregated ROI math calculations and previous period comparison trends.
    """
    data = setup_analytics_data
    ad_acc = data["ad_acc"]
    
    today = date.today()
    start = today - timedelta(days=4)
    end = today

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/dashboard/overview?ad_account_id={ad_acc.meta_account_id}&start_date={start}&end_date={end}"
        )
        assert response.status_code == 200
        metrics = response.json()
        
        # Verify Current Period Aggregated Math
        assert metrics["spend"]["value"] == 500.00
        assert metrics["impressions"]["value"] == 10000
        assert metrics["clicks"]["value"] == 200
        assert metrics["purchases"]["value"] == 10
        assert metrics["revenue"]["value"] == 1000.00
        
        # Verify Calculated Rates
        assert metrics["roas"]["value"] == 2.0  # 1000.00 revenue / 500.00 spend
        assert metrics["cpa"]["value"] == 50.0  # 500.00 spend / 10 purchases
        assert metrics["cpc"]["value"] == 2.50  # 500.00 spend / 200 clicks
        assert metrics["ctr"]["value"] == 0.02  # 200 clicks / 10000 impressions

        # Verify Trends Comparison Deltas (Current Spend 500.00 vs Previous Spend 250.00 => +100% change)
        assert metrics["spend"]["trend"] == 100.0
        assert metrics["purchases"]["trend"] == 100.0
        assert metrics["roas"]["trend"] == 100.0  # Current ROAS 2.0x vs Previous ROAS 1.0x => +100% change


@pytest.mark.asyncio
async def test_dashboard_chart_analytics(mock_auth, setup_analytics_data):
    """
    Verify daily breakdown chart data lists.
    """
    data = setup_analytics_data
    ad_acc = data["ad_acc"]
    
    today = date.today()
    start = today - timedelta(days=4)
    end = today

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/dashboard/chart?ad_account_id={ad_acc.meta_account_id}&start_date={start}&end_date={end}"
        )
        assert response.status_code == 200
        points = response.json()
        assert len(points) == 5
        assert points[0]["spend"] == 100.0
        assert points[0]["roas"] == 2.0


@pytest.mark.asyncio
async def test_dashboard_account_health_score(mock_auth, setup_analytics_data):
    """
    Verify account health scoring evaluation logs.
    """
    data = setup_analytics_data
    ad_acc = data["ad_acc"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/dashboard/health?ad_account_id={ad_acc.meta_account_id}")
        assert response.status_code == 200
        health = response.json()
        assert "score" in health
        assert len(health["items"]) == 6


@pytest.mark.asyncio
async def test_list_campaigns_aggregations(mock_auth, setup_analytics_data):
    """
    Verify campaign metrics aggregation.
    """
    data = setup_analytics_data
    ad_acc = data["ad_acc"]
    
    today = date.today()
    start = today - timedelta(days=4)
    end = today

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/campaigns?ad_account_id={ad_acc.meta_account_id}&start_date={start}&end_date={end}"
        )
        assert response.status_code == 200
        camps = response.json()
        assert len(camps) == 1
        assert camps[0]["name"] == "Test Analytics Campaign"
        assert camps[0]["metrics"]["spend"] == 500.0


@pytest.mark.asyncio
async def test_list_ads_creatives_aggregations(mock_auth, setup_analytics_data):
    """
    Verify ad listing, creative variation details, and aggregated performance stats.
    """
    data = setup_analytics_data
    ad_acc = data["ad_acc"]
    
    today = date.today()
    start = today - timedelta(days=4)
    end = today

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/ads?ad_account_id={ad_acc.meta_account_id}&start_date={start}&end_date={end}"
        )
        assert response.status_code == 200
        ads = response.json()
        assert len(ads) == 1
        assert ads[0]["name"] == "Test Analytics Ad"
        assert ads[0]["creative"]["headline"] == "Test Headline"
        assert ads[0]["metrics"]["spend"] == 500.0
