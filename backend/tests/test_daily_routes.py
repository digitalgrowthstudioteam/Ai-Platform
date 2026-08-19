"""
Digital Growth Studio — Daily Performance Routes Tests
"""
import pytest
import uuid
from datetime import datetime, date, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.dependencies import get_current_user
from app.models.user import User
from app.models.meta import MetaAdAccount
from app.models.campaign import Campaign, AdSet, Ad
from app.models.metrics import CampaignDailyMetrics, AdSetDailyMetrics, AdDailyMetrics

# Mock user claims
MOCK_CLAIMS = {
    "uid": "mock_firebase_uid_daily_123",
    "email": "daily_test@example.com",
    "name": "Daily Test User",
}


@pytest.fixture
def mock_auth():
    """Mock get_current_user dependency."""
    app.dependency_overrides[get_current_user] = lambda: MOCK_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_daily_metrics_routes(db: AsyncSession, mock_auth):
    """
    Verify that campaign, adset, and ad level daily performance logs
    can be queried successfully and assert authorization/security filters.
    """
    # 1. Pre-register test User
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

    # 2. Setup mock MetaConnection and MetaAdAccount
    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_daily_user_888",
        status="connected",
        access_token="mock_access_token",
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)

    ad_acc = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_daily_test_123",
        account_name="Daily Test Ad Account",
        currency="INR",
        timezone="Asia/Kolkata",
    )
    db.add(ad_acc)
    await db.commit()
    await db.refresh(ad_acc)

    # 3. Create Campaign, AdSet, Ad
    camp = Campaign(
        ad_account_id=ad_acc.id,
        meta_campaign_id="camp_daily_123",
        name="Test Campaign Daily",
        objective="OUTCOMES",
        status="ACTIVE",
    )
    db.add(camp)
    await db.commit()
    await db.refresh(camp)

    adset = AdSet(
        campaign_id=camp.id,
        meta_adset_id="adset_daily_123",
        name="Test AdSet Daily",
        status="ACTIVE",
        optimization_goal="OFFSITE_CONVERSIONS",
        billing_event="IMPRESSIONS",
    )
    db.add(adset)
    await db.commit()
    await db.refresh(adset)

    ad = Ad(
        ad_set_id=adset.id,
        meta_ad_id="ad_daily_123",
        name="Test Ad Daily",
        status="ACTIVE",
    )
    db.add(ad)
    await db.commit()
    await db.refresh(ad)

    # 4. Insert Daily Metrics
    today_date = date.today()
    yesterday_date = today_date - timedelta(days=1)

    c_metric = CampaignDailyMetrics(
        campaign_id=camp.id,
        date=yesterday_date,
        spend=150.00,
        impressions=1000,
        clicks=25,
        purchases=2,
        revenue=500.00,
        roas=3.33,
    )
    as_metric = AdSetDailyMetrics(
        ad_set_id=adset.id,
        date=yesterday_date,
        spend=100.00,
        impressions=700,
        clicks=15,
        purchases=1,
        revenue=250.00,
        roas=2.50,
    )
    ad_metric = AdDailyMetrics(
        ad_id=ad.id,
        date=yesterday_date,
        spend=50.00,
        impressions=300,
        clicks=10,
        purchases=1,
        revenue=250.00,
        roas=5.00,
    )
    db.add_all([c_metric, as_metric, ad_metric])
    await db.commit()

    # 5. Execute API requests via client
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # A. Campaign Daily Route
        r = await client.get(
            f"/api/v1/campaigns/{camp.id}/daily?start_date={yesterday_date}&end_date={today_date}"
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["spend"] == 150.0
        assert data[0]["roas"] == 3.33

        # B. AdSet Daily Route
        r = await client.get(
            f"/api/v1/campaigns/{camp.id}/adsets/{adset.id}/daily?start_date={yesterday_date}&end_date={today_date}"
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["spend"] == 100.0
        assert data[0]["roas"] == 2.50

        # C. Ad Daily Route
        r = await client.get(
            f"/api/v1/ads/{ad.id}/daily?start_date={yesterday_date}&end_date={today_date}"
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["spend"] == 50.0
        assert data[0]["roas"] == 5.0

        # D. Test access restriction (Non-existent UUID should 404)
        bad_id = uuid.uuid4()
        r = await client.get(
            f"/api/v1/campaigns/{bad_id}/daily?start_date={yesterday_date}&end_date={today_date}"
        )
        assert r.status_code == 404
