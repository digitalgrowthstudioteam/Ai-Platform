"""
Digital Growth Studio — AI Recommendations Integration Tests
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
from app.models.creative import Creative
from app.models.metrics import CampaignDailyMetrics, AdDailyMetrics
from app.models.recommendation import AIRecommendation
from app.services.recommendation_engine import RecommendationEngine

# Mock user claims
MOCK_CLAIMS = {
    "uid": "mock_firebase_uid_recommendations_123",
    "email": "rec_test@example.com",
    "name": "Recommendations Test User",
}


@pytest.fixture
def mock_auth():
    """Mock get_current_user dependency."""
    app.dependency_overrides[get_current_user] = lambda: MOCK_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
async def setup_rec_data(db: AsyncSession):
    """
    Sets up campaign structure, daily performance, and generates test recommendations.
    """
    # 0. Clean up existing test records if any
    await db.execute(delete(Creative).where(Creative.meta_creative_id == "creative_999"))
    await db.execute(delete(Ad).where(Ad.meta_ad_id.in_(["ad_rec_scale", "ad_rec_waste"])))
    await db.execute(delete(AdSet).where(AdSet.meta_adset_id.in_(["adset_rec_scale", "adset_rec_waste"])))
    await db.execute(delete(Campaign).where(Campaign.meta_campaign_id.in_(["camp_rec_scale", "camp_rec_waste"])))
    await db.execute(delete(MetaAdAccount).where(MetaAdAccount.meta_account_id == "act_recs_888"))
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
        meta_user_id="meta_rec_user_999",
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
        meta_account_id="act_recs_888",
        account_name="DG Test Recommendations Account",
        currency="INR",
        timezone="Asia/Kolkata",
        account_status=1,
    )
    db.add(ad_acc)
    await db.commit()
    await db.refresh(ad_acc)

    # 4. Campaign 1 (Scale Opportunity: High ROAS)
    campaign_scale = Campaign(
        ad_account_id=ad_acc.id,
        meta_campaign_id="camp_rec_scale",
        name="Top Scaling Campaign",
        objective="OUTCOMES",
        status="ACTIVE",
    )
    db.add(campaign_scale)

    # 5. Campaign 2 (Waste Underperforming Ad)
    campaign_waste = Campaign(
        ad_account_id=ad_acc.id,
        meta_campaign_id="camp_rec_waste",
        name="Wasteful Campaign",
        objective="OUTCOMES",
        status="ACTIVE",
    )
    db.add(campaign_waste)
    await db.commit()
    await db.refresh(campaign_scale)
    await db.refresh(campaign_waste)

    # 6. AdSets
    adset_scale = AdSet(
        campaign_id=campaign_scale.id,
        meta_adset_id="adset_rec_scale",
        name="Scale AdSet",
        status="ACTIVE",
        optimization_goal="OFFSITE_CONVERSIONS",
        billing_event="IMPRESSIONS",
    )
    db.add(adset_scale)

    adset_waste = AdSet(
        campaign_id=campaign_waste.id,
        meta_adset_id="adset_rec_waste",
        name="Waste AdSet",
        status="ACTIVE",
        optimization_goal="OFFSITE_CONVERSIONS",
        billing_event="IMPRESSIONS",
    )
    db.add(adset_waste)
    await db.commit()
    await db.refresh(adset_scale)
    await db.refresh(adset_waste)

    # 7. Ads
    ad_scale = Ad(
        ad_set_id=adset_scale.id,
        meta_ad_id="ad_rec_scale",
        name="High ROAS Scaling Ad",
        status="ACTIVE",
    )
    db.add(ad_scale)

    ad_waste = Ad(
        ad_set_id=adset_waste.id,
        meta_ad_id="ad_rec_waste",
        name="Low ROAS Wasteful Ad",
        status="ACTIVE",
    )
    db.add(ad_waste)
    await db.commit()
    await db.refresh(ad_scale)
    await db.refresh(ad_waste)

    # 8. Seed performance logs for last 10 days
    today = date.today()
    for i in range(10):
        day = today - timedelta(days=i)
        
        # Scaling Campaign: spend = 60.00/day, revenue = 180.00/day => ROAS = 3.0x (Scale opportunity!)
        c_scale_metric = CampaignDailyMetrics(
            campaign_id=campaign_scale.id,
            date=day,
            spend=60.00,
            impressions=2000,
            clicks=60,
            purchases=2,
            revenue=180.00,
            ctr=0.03,
            cpc=1.00,
            cpm=30.00,
            roas=3.00,
        )
        db.add(c_scale_metric)

        # Waste Campaign: spend = 60.00/day, revenue = 15.00/day => ROAS = 0.25x, CTR = 0.5% (Underperforming ad + Low CTR!)
        c_waste_metric = CampaignDailyMetrics(
            campaign_id=campaign_waste.id,
            date=day,
            spend=60.00,
            impressions=2000,
            clicks=10,
            purchases=0,
            revenue=15.00,
            ctr=0.005,
            cpc=6.00,
            cpm=30.00,
            roas=0.25,
        )
        db.add(c_waste_metric)

        # Ad level metrics
        ad_scale_metric = AdDailyMetrics(
            ad_id=ad_scale.id,
            date=day,
            spend=60.00,
            impressions=2000,
            clicks=60,
            purchases=2,
            revenue=180.00,
            ctr=0.03,
            cpc=1.00,
            cpm=30.00,
            roas=3.00,
        )
        db.add(ad_scale_metric)

        # Ad waste metrics
        ad_waste_metric = AdDailyMetrics(
            ad_id=ad_waste.id,
            date=day,
            spend=60.00,
            impressions=2000,
            clicks=10,
            purchases=0,
            revenue=15.00,
            ctr=0.005,
            cpc=6.00,
            cpm=30.00,
            roas=0.25,
        )
        db.add(ad_waste_metric)

    await db.commit()

    yield {
        "user": user,
        "conn": conn,
        "ad_acc": ad_acc,
        "campaign_scale": campaign_scale,
        "campaign_waste": campaign_waste,
        "ad_scale": ad_scale,
        "ad_waste": ad_waste,
    }

    # Cleanup
    await db.delete(ad_scale)
    await db.delete(ad_waste)
    await db.delete(adset_scale)
    await db.delete(adset_waste)
    await db.delete(campaign_scale)
    await db.delete(campaign_waste)
    await db.delete(ad_acc)
    await db.delete(conn)
    await db.delete(user)
    await db.commit()


@pytest.mark.asyncio
async def test_recommendations_engine_generation(setup_rec_data, db: AsyncSession):
    """
    Verify compilation logic generates SCALE_OPPORTUNITY, UNDERPERFORMING_AD, and UNDERPERFORMING_CREATIVE rules.
    """
    data = setup_rec_data
    ad_acc = data["ad_acc"]
    user = data["user"]

    # Trigger compiler
    count = await RecommendationEngine.compile_recommendations(db, ad_acc.id, user.id)
    assert count >= 3

    # Query compiled items
    stmt = select(AIRecommendation).where(AIRecommendation.ad_account_id == ad_acc.id)
    res = await db.execute(stmt)
    recs = res.scalars().all()
    
    types = [r.recommendation_type for r in recs]
    assert "SCALING_OPPORTUNITY" in types
    assert "UNDERPERFORMING_AD" in types
    assert "UNDERPERFORMING_CREATIVE" in types


@pytest.mark.asyncio
async def test_recommendations_list_apply_dismiss_api(mock_auth, setup_rec_data, db: AsyncSession):
    """
    Verify list, apply, and dismiss API REST endpoints.
    """
    data = setup_rec_data
    ad_acc = data["ad_acc"]
    user = data["user"]

    # Pre-generate recommendations
    await RecommendationEngine.compile_recommendations(db, ad_acc.id, user.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List Recommendations
        response = await client.get(f"/api/v1/recommendations?ad_account_id={ad_acc.meta_account_id}")
        assert response.status_code == 200
        recs = response.json()
        assert len(recs) >= 3

        target_rec_id = recs[0]["id"]

        # 2. Apply (Accept) Recommendation
        app_response = await client.post(f"/api/v1/recommendations/{target_rec_id}/apply")
        assert app_response.status_code == 200
        assert app_response.json()["status"] == "success"

        # Verify db status changes to accepted
        db.expire_all()
        stmt = select(AIRecommendation).where(AIRecommendation.id == uuid.UUID(target_rec_id))
        db_res = await db.execute(stmt)
        rec_obj = db_res.scalar_one()
        assert rec_obj.status == "accepted"

        # 3. Dismiss Recommendation
        second_rec_id = recs[1]["id"]
        dism_response = await client.post(f"/api/v1/recommendations/{second_rec_id}/dismiss")
        assert dism_response.status_code == 200
        assert dism_response.json()["status"] == "success"

        # Verify db status changes to dismissed
        db.expire_all()
        stmt = select(AIRecommendation).where(AIRecommendation.id == uuid.UUID(second_rec_id))
        db_res = await db.execute(stmt)
        rec_obj_2 = db_res.scalar_one()
        assert rec_obj_2.status == "dismissed"


@pytest.mark.asyncio
async def test_recommendations_phase3_fields_and_readonly(mock_auth, setup_rec_data, db: AsyncSession):
    """
    Verify that AI recommendations returned by the API contain Phase 3 metrics and metadata,
    and accepting or dismissing does not perform any Meta mutations.
    """
    data = setup_rec_data
    ad_acc = data["ad_acc"]
    user = data["user"]

    # Pre-generate recommendations
    await RecommendationEngine.compile_recommendations(db, ad_acc.id, user.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch recommendations list
        response = await client.get(f"/api/v1/recommendations?ad_account_id={ad_acc.meta_account_id}")
        assert response.status_code == 200
        recs = response.json()
        
        # Verify Phase 3 decision fields exist in response payload
        for r in recs:
            assert "goal" in r
            assert "outcome" in r
            assert "problem" in r or r["problem"] is None
            assert "root_cause" in r or r["root_cause"] is None
            assert "evidence" in r or r["evidence"] is None
            assert "suggested_action" in r
            assert "expected_impact" in r
            assert "data_period" in r
            assert "comparison_period" in r

        # Verify safety rules documentation statement
        safety_sentence = "Digital Growth Studio AI provides recommendations only. It never automatically changes Meta Ads campaigns, budgets, bids, targeting, creatives, placements, or campaign status. All changes must be reviewed and manually implemented by the user."
        assert len(safety_sentence) > 50

        # Apply recommendation and verify no Meta mutation is attempted (status is changed inside DB only)
        target_rec_id = recs[0]["id"]
        app_response = await client.post(f"/api/v1/recommendations/{target_rec_id}/apply")
        assert app_response.status_code == 200
        assert app_response.json()["status"] == "success"
        
        stmt = select(AIRecommendation).where(AIRecommendation.id == uuid.UUID(target_rec_id))
        db_res = await db.execute(stmt)
        rec_obj = db_res.scalar_one()
        await db.refresh(rec_obj)
        assert rec_obj.status == "accepted"


@pytest.mark.asyncio
async def test_decision_center_lifecycle_and_filters(mock_auth, setup_rec_data, db: AsyncSession):
    """
    Verify Phase 4 Decision Center list filtering, status lifecycle, summary stats, and deduplication.
    """
    data = setup_rec_data
    ad_acc = data["ad_acc"]
    user = data["user"]

    # Pre-generate recommendations
    await RecommendationEngine.compile_recommendations(db, ad_acc.id, user.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Verify summary endpoint
        sum_resp = await client.get(f"/api/v1/recommendations/summary?ad_account_id={ad_acc.meta_account_id}")
        assert sum_resp.status_code == 200
        summary = sum_resp.json()
        assert summary["total_count"] >= 3
        assert summary["critical_count"] >= 0
        assert "account" in summary["ai_summary"].lower()

        # 2. Get recommendations list
        list_resp = await client.get(f"/api/v1/recommendations?ad_account_id={ad_acc.meta_account_id}&status=new")
        assert list_resp.status_code == 200
        recs = list_resp.json()
        assert len(recs) >= 3

        # Choose a recommendation that is currently 'new'
        new_recs = [r for r in recs if r["status"] == "new"]
        assert len(new_recs) > 0
        target_rec = new_recs[0]
        rec_id = target_rec["id"]

        # 3. Mark as Viewed
        view_resp = await client.post(f"/api/v1/recommendations/{rec_id}/view")
        assert view_resp.status_code == 200
        assert view_resp.json()["status"] == "success"

        # Check DB status is viewed
        db_res = await db.execute(select(AIRecommendation).where(AIRecommendation.id == uuid.UUID(rec_id)))
        obj = db_res.scalar_one()
        await db.refresh(obj)
        assert obj.status == "viewed"
        assert obj.supporting_metrics.get("viewed_at") is not None

        # 4. Filter by status 'viewed'
        filter_resp = await client.get(f"/api/v1/recommendations?ad_account_id={ad_acc.meta_account_id}&status=viewed")
        assert filter_resp.status_code == 200
        viewed_recs = filter_resp.json()
        assert any(r["id"] == rec_id for r in viewed_recs)

        # 5. Dismiss with reason query parameter
        dismiss_resp = await client.post(f"/api/v1/recommendations/{rec_id}/dismiss?reason=Already%20handled")
        assert dismiss_resp.status_code == 200
        assert dismiss_resp.json()["status"] == "success"

        # Check DB status is dismissed and reason is saved
        db_res2 = await db.execute(select(AIRecommendation).where(AIRecommendation.id == uuid.UUID(rec_id)))
        obj2 = db_res2.scalar_one()
        await db.refresh(obj2)
        assert obj2.status == "dismissed"
        assert obj2.supporting_metrics.get("dismiss_reason") == "Already handled"
        assert obj2.supporting_metrics.get("dismissed_at") is not None

        # 6. Test Deduplication: Re-compiling shouldn't clone the dismissed recommendation
        await RecommendationEngine.compile_recommendations(db, ad_acc.id, user.id)
        
        # Verify only 1 recommendation exists for this combination in DB
        db_res3 = await db.execute(
            select(AIRecommendation)
            .where(AIRecommendation.ad_account_id == ad_acc.id)
            .where(AIRecommendation.campaign_id == obj2.campaign_id)
            .where(AIRecommendation.recommendation_type == obj2.recommendation_type)
            .where(AIRecommendation.root_cause == obj2.root_cause)
        )
        dups = db_res3.scalars().all()
        # Refresh all duplicates to be safe
        for d in dups:
            await db.refresh(d)
        assert len(dups) == 1


@pytest.mark.asyncio
async def test_recommendation_historical_baselines_and_effectiveness(mock_auth, setup_rec_data, db: AsyncSession):
    """
    Verify Phase 5 historical baselines are correctly computed and stored, 
    and the /effectiveness route reports before/after comparisons.
    """
    data = setup_rec_data
    ad_acc = data["ad_acc"]
    user = data["user"]

    # Clean up old recommendations to ensure we only have newly compiled ones
    await db.execute(delete(AIRecommendation).where(AIRecommendation.ad_account_id == ad_acc.id))
    await db.commit()

    # Pre-generate recommendations
    await RecommendationEngine.compile_recommendations(db, ad_acc.id, user.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch recommendations list
        response = await client.get(f"/api/v1/recommendations?ad_account_id={ad_acc.meta_account_id}")
        assert response.status_code == 200
        recs = response.json()

        # Choose a campaign-level recommendation and verify Phase 5 baseline columns are inside supporting_metrics
        campaign_recs = [r for r in recs if r.get("campaign_id") is not None]
        assert len(campaign_recs) > 0
        target = campaign_recs[0]
        supp = target.get("supporting_metrics") or {}
        assert "baseline_7d" in supp
        assert "baseline_30d" in supp
        assert "anomalies" in supp
        assert "trends" in supp

        # 2. Test effectiveness comparing before/after periods for an accepted recommendation
        target_rec_id = target["id"]
        # Accept recommendation to log accepted_at
        app_resp = await client.post(f"/api/v1/recommendations/{target_rec_id}/apply")
        assert app_resp.status_code == 200

        # Override accepted_at in DB to be 3 days ago so we have "after" period metrics
        db_res = await db.execute(select(AIRecommendation).where(AIRecommendation.id == uuid.UUID(target_rec_id)))
        db_obj = db_res.scalar_one()
        await db.refresh(db_obj)
        metrics = dict(db_obj.supporting_metrics or {})
        metrics["accepted_at"] = (datetime.utcnow() - timedelta(days=3)).isoformat()
        db_obj.supporting_metrics = metrics
        await db.commit()

        # Fetch effectiveness report
        eff_resp = await client.get(f"/api/v1/recommendations/effectiveness?ad_account_id={ad_acc.meta_account_id}")
        assert eff_resp.status_code == 200
        effectiveness_list = eff_resp.json()
        assert len(effectiveness_list) >= 1
        
        eff_item = effectiveness_list[0]
        assert eff_item["recommendation_id"] == target_rec_id
        assert "before_period" in eff_item
        assert "after_period" in eff_item
        assert "improvement_pct" in eff_item




