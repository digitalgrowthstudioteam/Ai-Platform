"""
Digital Growth Studio — Meta Sync Engine Integration Tests
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.dependencies import get_current_user
from app.models.user import User
from app.models.meta import MetaConnection, MetaAdAccount
from app.models.campaign import Campaign, AdSet, Ad
from app.models.creative import Creative
from app.models.metrics import CampaignDailyMetrics, AdSetDailyMetrics, AdDailyMetrics
from app.services.meta_sync import MetaSyncService

# Mock user claims
MOCK_CLAIMS = {
    "uid": "mock_firebase_uid_sync_123",
    "email": "sync_test@example.com",
    "name": "Sync Test User",
}


@pytest.fixture
def mock_auth():
    """Mock get_current_user dependency."""
    app.dependency_overrides[get_current_user] = lambda: MOCK_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_meta_sync_service_mock_pipeline(db: AsyncSession):
    """
    Verify that MetaSyncService successfully executes the mock synchronization pipeline,
    populates campaign trees, creatives, and daily historical performance metrics.
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

    # 2. Setup mock MetaConnection using EAAGm0PX mock token prefix
    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_sync_user_999",
        status="connected",
        access_token="EAAGm0PX_mock_token_abc123",
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)

    # 3. Setup mock MetaAdAccount linked to connection
    ad_acc = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_101010101",
        account_name="DGS Primary Ad Account",
        currency="INR",
        timezone="Asia/Kolkata",
        account_status=1,
    )
    db.add(ad_acc)
    await db.commit()
    await db.refresh(ad_acc)

    # 4. Trigger MetaSyncService sync
    service = MetaSyncService()
    await service.sync_ad_account(db, str(ad_acc.id))

    # 5. Verify database records are successfully created
    # Verify Campaigns
    stmt = select(Campaign).where(Campaign.ad_account_id == ad_acc.id)
    res = await db.execute(stmt)
    campaigns = res.scalars().all()
    assert len(campaigns) == 2
    assert {c.meta_campaign_id for c in campaigns} == {"camp_111_act_101010101", "camp_222_act_101010101"}

    # Verify AdSets
    stmt = select(AdSet).where(AdSet.meta_adset_id == "adset_111_act_101010101")
    res = await db.execute(stmt)
    adset = res.scalar_one_or_none()
    assert adset is not None
    assert adset.name == "Broad Audience (India)"

    # Verify Ads
    stmt = select(Ad).where(Ad.meta_ad_id == "ad_111_1_act_101010101")
    res = await db.execute(stmt)
    ad = res.scalar_one_or_none()
    assert ad is not None
    assert ad.name == "Summer Sale - Video 1"

    # Verify Creative linked to Ad
    stmt = select(Creative).where(Creative.ad_id == ad.id)
    res = await db.execute(stmt)
    creative = res.scalar_one_or_none()
    assert creative is not None
    assert creative.meta_creative_id == "creative_ad_111_1_act_101010101"
    assert creative.creative_type == "video"

    # Verify 30 Days of Historical Metrics populated
    stmt = select(CampaignDailyMetrics).where(CampaignDailyMetrics.campaign_id == campaigns[0].id)
    res = await db.execute(stmt)
    metrics = res.scalars().all()
    assert len(metrics) == 30

    # 6. Verify Idempotency: re-running the sync upserts instead of throwing duplicate key errors
    await service.sync_ad_account(db, str(ad_acc.id))
    
    # Confirm count is still 30 (not 60)
    stmt = select(CampaignDailyMetrics).where(CampaignDailyMetrics.campaign_id == campaigns[0].id)
    res = await db.execute(stmt)
    metrics_recheck = res.scalars().all()
    assert len(metrics_recheck) == 30

    # Cleanup DB records
    await db.delete(ad_acc)
    await db.delete(conn)
    await db.delete(user)
    await db.commit()


@pytest.mark.asyncio
@patch("app.workers.tasks.sync_ad_account_task.delay")
async def test_trigger_sync_route(mock_delay, mock_auth, db: AsyncSession):
    """
    Verify that triggering manual sync through /sync/trigger endpoint
    successfully enqueues a Celery background worker task.
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

    # 2. Setup MetaConnection & Ad Account
    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_sync_user_777",
        status="connected",
        access_token="EAAGm0PX_mock_token_xyz987",
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)

    ad_acc = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_202020202",
        account_name="Brand Growth Sandbox",
        currency="USD",
        timezone="America/New_York",
        account_status=1,
    )
    db.add(ad_acc)
    await db.commit()
    await db.refresh(ad_acc)

    # 3. Call POST /sync/trigger route
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/meta/sync/trigger")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "triggered in the background" in data["message"]
        
        # Verify background Celery task enqueued with ad account DB UUID string
        mock_delay.assert_called_once_with(str(ad_acc.id))

        # Check sync status route
        status_response = await client.get("/api/v1/meta/sync/status")
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert "last_sync_status" in status_data

    # Cleanup DB records
    await db.delete(ad_acc)
    await db.delete(conn)
    await db.delete(user)
    await db.commit()
