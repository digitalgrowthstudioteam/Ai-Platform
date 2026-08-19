"""
Digital Growth Studio — Messaging & Conversations Performance Intelligence Tests
"""
import pytest
import uuid
from datetime import date, timedelta, datetime
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.meta import MetaConnection, MetaAdAccount
from app.models.campaign import Campaign, AdSet, Ad
from app.models.metrics import CampaignDailyMetrics
from app.models.recommendation import AIRecommendation
from app.services.recommendation_engine import RecommendationEngine
from app.services.metric_engine import MetricEngine, METRIC_CATALOG
from app.api.v1.dashboard import query_aggregated_metrics, calculate_rates

MOCK_EMAIL = "messaging_test_user@example.com"
MOCK_UID = "firebase_uid_messaging_test_999"


@pytest.fixture(scope="function")
async def setup_messaging_data(db: AsyncSession):
    """
    Sets up messaging vs sales test database state.
    """
    # 0. Cleanup existing test data
    await db.execute(delete(CampaignDailyMetrics))
    await db.execute(delete(Ad))
    await db.execute(delete(AdSet))
    await db.execute(delete(Campaign))
    await db.execute(delete(MetaAdAccount).where(MetaAdAccount.meta_account_id == "act_messaging_test_999"))
    await db.execute(delete(User).where(User.email == MOCK_EMAIL))
    await db.commit()

    # 1. Test User
    user = User(
        firebase_uid=MOCK_UID,
        email=MOCK_EMAIL,
        name="Messaging Tester",
        trial_status="active",
        trial_started_at=datetime.utcnow(),
        trial_ends_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 2. Connection
    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_messaging_user",
        status="connected",
        access_token="mock_messaging_token",
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)

    # 3. Ad Account
    ad_acc = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_messaging_test_999",
        account_name="Messaging Test Account",
        currency="INR",
        timezone="Asia/Kolkata",
        account_status=1,
    )
    db.add(ad_acc)
    await db.commit()
    await db.refresh(ad_acc)

    yield user, ad_acc

    # Cleanup
    await db.execute(delete(CampaignDailyMetrics))
    await db.execute(delete(Ad))
    await db.execute(delete(AdSet))
    await db.execute(delete(Campaign))
    await db.execute(delete(MetaAdAccount).where(MetaAdAccount.meta_account_id == "act_messaging_test_999"))
    await db.execute(delete(User).where(User.email == MOCK_EMAIL))
    await db.commit()


@pytest.mark.asyncio
async def test_messaging_metrics_catalog():
    """Verify core & additional business metrics labeling in METRIC_CATALOG."""
    assert "conversations" in METRIC_CATALOG
    assert "cost_per_conversation" in METRIC_CATALOG
    assert "conversation_rate" in METRIC_CATALOG
    assert "cost_per_qualified_conversation" in METRIC_CATALOG

    # Verify group labeling
    assert METRIC_CATALOG["spend"]["catalog_group"] == "CORE_51"
    assert METRIC_CATALOG["conversations"]["catalog_group"] == "ADDITIONAL_BUSINESS_METRICS"
    assert METRIC_CATALOG["conversations"]["category"] == "MESSAGING"
    assert METRIC_CATALOG["cost_per_qualified_conversation"]["availability_status"] == "unavailable"
    assert METRIC_CATALOG["cost_per_qualified_conversation"]["requires_crm"] is True


@pytest.mark.asyncio
async def test_messaging_calculations(db: AsyncSession, setup_messaging_data):
    """Test messaging calculations under various spend and conversation configurations."""
    user, ad_acc = setup_messaging_data

    # A. conversations > 0
    data_positive = {"spend": 1000.0, "impressions": 10000, "clicks": 500, "purchases": 0, "revenue": 0.0, "reach": 5000, "leads": 0, "link_clicks": 300, "add_to_cart": 0, "initiate_checkout": 0, "thruplays": 0, "video_views": 0, "post_engagement": 0, "video_play_25": 0, "video_play_50": 0, "video_play_75": 0, "video_play_95": 0, "video_play_100": 0, "comments": 0, "shares": 0, "saves": 0, "reactions": 0, "conversations": 50, "landing_page_views": 100}
    rates_pos = calculate_rates(data_positive)
    assert rates_pos["conversations"] == 50
    assert rates_pos["cost_per_conversation"] == 20.0  # 1000 / 50
    assert rates_pos["conversation_rate"] == pytest.approx(16.666666666666668)

    # B. conversations = 0
    data_zero = data_positive.copy()
    data_zero["conversations"] = 0
    rates_zero = calculate_rates(data_zero)
    assert rates_zero["conversations"] == 0
    assert rates_zero["cost_per_conversation"] == 0.0

    # C. zero spend
    data_zero_spend = data_positive.copy()
    data_zero_spend["spend"] = 0.0
    rates_zero_spend = calculate_rates(data_zero_spend)
    assert rates_zero_spend["spend"] == 0.0
    assert rates_zero_spend["cost_per_conversation"] == 0.0

    # D. null values safety check
    data_null = {k: None for k in data_positive.keys()}
    data_null["spend"] = 0.0
    data_null["impressions"] = 0
    data_null["clicks"] = 0
    data_null["reach"] = 0
    data_null["purchases"] = 0
    data_null["revenue"] = 0.0
    data_null["leads"] = 0
    data_null["link_clicks"] = 0
    data_null["conversations"] = 0
    rates_null = calculate_rates(data_null)
    assert rates_null["conversations"] == 0
    assert rates_null["cost_per_conversation"] == 0.0


@pytest.mark.asyncio
async def test_messaging_recommendations_logic(db: AsyncSession, setup_messaging_data):
    """Test AI Decision Engine detection of Messaging Performance Decline and Scaling Opportunities."""
    user, ad_acc = setup_messaging_data

    # Create messaging campaign
    campaign = Campaign(
        ad_account_id=ad_acc.id,
        meta_campaign_id="camp_messaging_test",
        name="Conversations Scaling Campaign",
        objective="OUTCOME_ENGAGEMENT",
        status="ACTIVE"
    )
    db.add(campaign)
    await db.commit()

    ad_set = AdSet(
        campaign_id=campaign.id,
        meta_adset_id="adset_messaging_test",
        name="Target AdSet",
        status="ACTIVE",
        optimization_goal="OUTCOME_ENGAGEMENT",
        billing_event="IMPRESSIONS",
        performance_goal="conversations"
    )
    db.add(ad_set)
    await db.commit()

    # Define past and current metrics to trigger MESSAGING_PERFORMANCE_DECLINE
    # Past 7 Days: conversations = 50, spend = 5000, CTR = 2.4% (clicks=240, impressions=10000)
    # Current 7 Days: conversations = 28, spend = 5000, CTR = 1.7% (clicks=170, impressions=10000)
    # This matches conv_change = -44% (<= -15%), cost_per_conv_change = +78.5% (>= +15%), ctr_change = -29.1% (<= -10%)
    today = date.today()
    for i in range(7):
        curr_day = CampaignDailyMetrics(
            campaign_id=campaign.id,
            date=today - timedelta(days=i),
            spend=714.28,  # Total ~5000
            impressions=1428,
            clicks=24,
            link_clicks=24,
            reach=1000,
            frequency=1.2,
            actions={"conversations": 4}  # Total 28
        )
        prev_day = CampaignDailyMetrics(
            campaign_id=campaign.id,
            date=today - timedelta(days=i+7),
            spend=714.28,  # Total ~5000
            impressions=1428,
            clicks=34,
            link_clicks=34,
            reach=1000,
            frequency=1.2,
            actions={"conversations": 7}  # Total 49
        )
        db.add(curr_day)
        db.add(prev_day)
    await db.commit()

    # Compile recommendations
    await RecommendationEngine.compile_recommendations(db, ad_acc.id, user.id)
    
    # Query database for recommendations
    res = await db.execute(select(AIRecommendation).where(AIRecommendation.ad_account_id == ad_acc.id))
    recs = res.scalars().all()
    
    # Assert decline alert generated
    decline_alerts = [r for r in recs if r.recommendation_type == "MESSAGING_PERFORMANCE_DECLINE"]
    assert len(decline_alerts) > 0
    assert "Declining" in decline_alerts[0].title
    assert "Conversations fell by" in decline_alerts[0].description
    assert decline_alerts[0].supporting_metrics["conversations_change"] < 0
    assert decline_alerts[0].supporting_metrics["cost_per_conversation_change"] > 0


@pytest.mark.asyncio
async def test_messaging_scaling_opportunity(db: AsyncSession, setup_messaging_data):
    """Test AI scaling logic under stable frequency, cost, and high pacing."""
    user, ad_acc = setup_messaging_data

    # Create messaging campaign
    campaign = Campaign(
        ad_account_id=ad_acc.id,
        meta_campaign_id="camp_messaging_scale",
        name="Conversations Scaling Campaign",
        objective="OUTCOME_ENGAGEMENT",
        status="ACTIVE"
    )
    db.add(campaign)
    await db.commit()

    ad_set = AdSet(
        campaign_id=campaign.id,
        meta_adset_id="adset_messaging_scale",
        name="Target AdSet",
        status="ACTIVE",
        optimization_goal="OUTCOME_ENGAGEMENT",
        billing_event="IMPRESSIONS",
        performance_goal="conversations"
    )
    db.add(ad_set)
    await db.commit()

    # Current 14 Days: conversations = 30, spend = 600 (Cost per conv = ₹20.00 <= ₹25.00, frequency = 1.1 <= 2.2)
    # This qualifies as scaling candidate
    today = date.today()
    for i in range(14):
        day = CampaignDailyMetrics(
            campaign_id=campaign.id,
            date=today - timedelta(days=i),
            spend=42.85,  # Total ~600
            impressions=1000,
            clicks=40,
            link_clicks=30,
            reach=900,
            frequency=1.1,
            actions={"conversations": 2}  # Total 28
        )
        db.add(day)
    await db.commit()

    # Compile scaling recommendations
    await RecommendationEngine.compile_recommendations(db, ad_acc.id, user.id)
    
    # Query database for recommendations
    res = await db.execute(select(AIRecommendation).where(AIRecommendation.ad_account_id == ad_acc.id))
    recs = res.scalars().all()
    
    scaling_alerts = [r for r in recs if r.recommendation_type == "SCALING_OPPORTUNITY"]
    assert len(scaling_alerts) > 0
    assert "Scaling Opportunity" in scaling_alerts[0].title
    assert "conversations" in scaling_alerts[0].description.lower() or "messaging" in scaling_alerts[0].description.lower()
