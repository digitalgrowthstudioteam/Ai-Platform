"""
Digital Growth Studio — Phase 10 Data Quality & ML Feature Store Integration Tests
"""
import pytest
import uuid
from datetime import date, datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.dependencies import get_current_user
from app.models.user import User
from app.models.meta import MetaConnection, MetaAdAccount
from app.models.campaign import Campaign, AdSet, Ad
from app.models.creative import Creative
from app.models.metrics import AdDailyMetrics
from app.models.ml_features import MLFeatureRecord, OptimizationAction
from app.services.data_quality_guard import DataQualityGuard, DataQualityVerdict
from app.services.ml_feature_extractor import MLFeatureExtractor

# Mock user claims
MOCK_CLAIMS = {
    "uid": "mock_firebase_uid_phase10_123",
    "email": "phase10_test@example.com",
    "name": "Phase 10 Test User",
}


@pytest.fixture
def mock_auth():
    """Mock get_current_user dependency."""
    app.dependency_overrides[get_current_user] = lambda: MOCK_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
async def setup_phase10_data(db: AsyncSession):
    """
    Sets up campaigns, ads, creatives, metrics, and models for testing Phase 10.
    """
    # 0. Clean up existing records
    await db.execute(delete(MLFeatureRecord))
    await db.execute(delete(OptimizationAction))
    await db.execute(delete(AdDailyMetrics))
    await db.execute(delete(Creative))
    await db.execute(delete(Ad))
    await db.execute(delete(AdSet))
    await db.execute(delete(Campaign).where(Campaign.meta_campaign_id == "camp_phase10_1"))
    await db.execute(delete(MetaAdAccount).where(MetaAdAccount.meta_account_id == "act_phase10_888"))
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
        meta_user_id="meta_phase10_user_999",
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
        meta_account_id="act_phase10_888",
        account_name="DG Test Phase 10 Account",
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
        meta_campaign_id="camp_phase10_1",
        name="Lead Generation Campaign Phase 10",
        objective="OUTCOMES",
        status="ACTIVE",
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)

    # 5. AdSet
    adset = AdSet(
        campaign_id=campaign.id,
        meta_adset_id="adset_phase10_1",
        name="Broad Audience AdSet",
        status="ACTIVE",
        optimization_goal="LEADS",
        billing_event="IMPRESSIONS"
    )
    db.add(adset)
    await db.commit()
    await db.refresh(adset)

    # 6. Ad
    ad = Ad(
        ad_set_id=adset.id,
        meta_ad_id="ad_phase10_1",
        name="Short Video Variant A"
    )
    db.add(ad)
    await db.commit()
    await db.refresh(ad)

    # 7. Creative
    creative = Creative(
        meta_creative_id="creative_phase10_1",
        ad_id=ad.id,
        headline="Are you tired of rising client acquisition costs?",
        primary_text="Get our free checklist off our main portal now. Trusted by 5,000 businesses.",
        call_to_action="LEARN_MORE",
        creative_type="video"
    )
    db.add(creative)
    await db.commit()
    await db.refresh(creative)

    # 8. Ad Metrics for yesterday
    yesterday = date.today() - timedelta(days=1)
    metric = AdDailyMetrics(
        ad_id=ad.id,
        date=yesterday,
        spend=1500.00,
        impressions=12000,
        clicks=180,
        leads=8,
        purchases=0,
        revenue=0.0
    )
    db.add(metric)
    await db.commit()

    return user, ad_acc, campaign, ad, creative, metric


@pytest.mark.asyncio
async def test_data_quality_guard():
    # Test case: Sufficient data
    verdict_sufficient = DataQualityGuard.check_entity(
        impressions=5000,
        spend=600.0,
        conversions=5,
        clicks=50,
        days_active=5
    )
    assert verdict_sufficient.is_sufficient is True
    assert verdict_sufficient.verdict == "SUFFICIENT"
    assert verdict_sufficient.confidence_modifier >= 0.7

    # Test case: Insufficient impressions and spend (Learning period/Not enough data)
    verdict_insufficient = DataQualityGuard.check_entity(
        impressions=100,
        spend=50.0,
        conversions=0,
        clicks=1,
        days_active=1
    )
    assert verdict_insufficient.is_sufficient is False
    assert verdict_insufficient.verdict in ("LEARNING_PERIOD", "NOT_ENOUGH_DATA")

    # Test downgrade recommendation
    new_priority, new_type = DataQualityGuard.should_downgrade_recommendation(
        verdict_insufficient, "critical"
    )
    assert new_priority == "low"
    assert new_type == "DONT_CHANGE"


@pytest.mark.asyncio
async def test_ml_feature_extractor(setup_phase10_data, db: AsyncSession):
    user, ad_acc, campaign, ad, creative, metric = setup_phase10_data
    yesterday = date.today() - timedelta(days=1)

    # 1. Verify Hook Classification and regex detectors
    hook_type = MLFeatureExtractor.classify_hook_type(creative.headline)
    assert hook_type == "problem"  # matches 'tired' first

    combined_text = f"{creative.headline} {creative.primary_text}"
    has_offer = MLFeatureExtractor.detect_text_feature(combined_text, ["off", "discount", "free"])
    assert has_offer is True  # has 'free' and 'off'

    has_social_proof = MLFeatureExtractor.detect_text_feature(combined_text, ["trusted by", "reviews"])
    assert has_social_proof is True  # has 'Trusted by'

    # 2. Test extraction service
    records_count = await MLFeatureExtractor.extract_features_for_account(db, ad_acc.id, yesterday)
    assert records_count == 1

    # Check persistence in database
    stmt = select(MLFeatureRecord).where(MLFeatureRecord.ad_id == ad.id).where(MLFeatureRecord.feature_date == yesterday)
    res = await db.execute(stmt)
    persisted = res.scalar_one_or_none()
    assert persisted is not None
    assert persisted.hook_type == "direct"
    assert persisted.has_offer is True
    assert persisted.has_social_proof is True
    assert persisted.spend == 1500.00
    assert persisted.ctr > 0.01


@pytest.mark.asyncio
async def test_phase10_api_endpoints(mock_auth, setup_phase10_data, db: AsyncSession):
    user, ad_acc, campaign, ad, creative, metric = setup_phase10_data
    yesterday = date.today() - timedelta(days=1)
    yesterday_str = yesterday.strftime("%Y-%m-%d")

    # Seed an OptimizationAction first
    action = OptimizationAction(
        ad_account_id=ad_acc.id,
        user_id=user.id,
        action_type="PAUSE_AD",
        entity_type="ad",
        entity_id=str(ad.id),
        description="Pause Short Video Variant A due to high CPL",
        status="PENDING_APPROVAL"
    )
    db.add(action)
    await db.commit()
    await db.refresh(action)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Test 1: Extract ML features via API
        response_extract = await client.post(f"/api/v1/recommendations/features/extract?ad_account_id={ad_acc.id}&feature_date={yesterday_str}")
        assert response_extract.status_code == 200
        assert response_extract.json()["features_extracted"] == 1

        # Test 2: Get ML features via API
        response_get_feat = await client.get(f"/api/v1/recommendations/features?ad_account_id={ad_acc.id}&feature_date={yesterday_str}")
        assert response_get_feat.status_code == 200
        features = response_get_feat.json()
        assert len(features) >= 1
        assert features[0]["hook_type"] == "direct"

        # Test 3: Get Optimization actions via API
        response_actions = await client.get(f"/api/v1/recommendations/actions?ad_account_id={ad_acc.id}")
        assert response_actions.status_code == 200
        actions = response_actions.json()
        assert len(actions) >= 1
        assert actions[0]["action_type"] == "PAUSE_AD"

        # Test 4: Approve action
        response_approve = await client.post(f"/api/v1/recommendations/actions/approve/{action.id}")
        assert response_approve.status_code == 200
        assert response_approve.json()["new_status"] == "APPROVED"
