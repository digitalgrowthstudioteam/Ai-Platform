"""
Digital Growth Studio — AI Optimization Feature Integration Tests
"""
import pytest
import uuid
from datetime import datetime, timezone, timedelta, date
from unittest.mock import patch
from sqlalchemy import select
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.models.user import User
from app.models.meta import MetaConnection, MetaAdAccount
from app.models.campaign import Campaign, AdSet, Ad
from app.models.metrics import CampaignDailyMetrics, AdDailyMetrics
from app.models.ai_optimization import AIOptimizationConfig, AIOptimizationLog
from app.models.recommendation import AIRecommendation
from app.models.subscription import Subscription
from app.services.entitlement_engine import EntitlementEngine
from app.services.ai_optimization_service import AIOptimizationService


@pytest.mark.anyio
async def test_entitlement_engine_ai_optimization_limits(db):
    """
    Verify that plans have the correct AI Optimization limits.
    """
    user_free = User(email="free_opt@gmail.com", name="Free", plan_id="free", firebase_uid="free_opt_uid")
    user_starter = User(email="starter_opt@gmail.com", name="Starter", plan_id="starter", firebase_uid="starter_opt_uid")
    user_growth = User(email="growth_opt@gmail.com", name="Growth", plan_id="growth", firebase_uid="growth_opt_uid")
    user_pro = User(email="pro_opt@gmail.com", name="Pro", plan_id="pro", firebase_uid="pro_opt_uid")
    user_agency = User(email="agency_opt@gmail.com", name="Agency", plan_id="agency", firebase_uid="agency_opt_uid")
    
    db.add_all([user_free, user_starter, user_growth, user_pro, user_agency])
    await db.commit()

    # Create active subscription records for starter, growth, pro, agency users
    now = datetime.now(timezone.utc)
    sub_starter = Subscription(user_id=user_starter.id, plan="starter", status="active", started_at=now, expires_at=now + timedelta(days=30))
    sub_growth = Subscription(user_id=user_growth.id, plan="growth", status="active", started_at=now, expires_at=now + timedelta(days=30))
    sub_pro = Subscription(user_id=user_pro.id, plan="pro", status="active", started_at=now, expires_at=now + timedelta(days=30))
    sub_agency = Subscription(user_id=user_agency.id, plan="agency", status="active", started_at=now, expires_at=now + timedelta(days=30))
    db.add_all([sub_starter, sub_growth, sub_pro, sub_agency])
    await db.commit()

    ent_free = await EntitlementEngine.resolve_entitlements(user_free, db)
    assert ent_free["ai_optimization_campaign_limit"] == 0

    ent_starter = await EntitlementEngine.resolve_entitlements(user_starter, db)
    assert ent_starter["ai_optimization_campaign_limit"] == 1

    ent_growth = await EntitlementEngine.resolve_entitlements(user_growth, db)
    assert ent_growth["ai_optimization_campaign_limit"] == 3

    assert (await EntitlementEngine.resolve_entitlements(user_pro, db))["ai_optimization_campaign_limit"] == 5
    assert (await EntitlementEngine.resolve_entitlements(user_agency, db))["ai_optimization_campaign_limit"] == 10


@pytest.mark.anyio
async def test_ai_optimization_routes_and_limits(db):
    """
    Verify API endpoints: get status, activate (enforcing limits), deactivate, and dashboard.
    """
    # 1. Setup mock user and metadata
    user = User(
        email="test_opt_endpoints@gmail.com",
        name="Test Endpoints",
        plan_id="starter", # limit = 1
        firebase_uid="uid_opt_endpoints"
    )
    db.add(user)
    await db.commit()

    now = datetime.now(timezone.utc)
    sub = Subscription(
        user_id=user.id,
        plan="starter",
        status="active",
        started_at=now,
        expires_at=now + timedelta(days=30)
    )
    db.add(sub)
    await db.commit()

    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_opt_endpoints_user",
        status="connected",
        access_token="mock_token"
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)

    ad_acc = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_123456789_opt",
        account_name="Endpoints Ad Account",
        currency="INR",
        timezone="Asia/Kolkata",
        account_status=1
    )
    db.add(ad_acc)
    await db.commit()

    campaign_1 = Campaign(
        ad_account_id=ad_acc.id,
        meta_campaign_id="1111111111",
        name="Campaign One",
        status="ACTIVE",
        objective="LEAD_GENERATION",
        daily_budget=2000
    )
    campaign_2 = Campaign(
        ad_account_id=ad_acc.id,
        meta_campaign_id="2222222222",
        name="Campaign Two",
        status="ACTIVE",
        objective="OUTCOMES_CONVERSIONS",
        daily_budget=4000
    )
    db.add_all([campaign_1, campaign_2])
    await db.commit()

    # Define mock authentication patch
    mock_claims = {
        "uid": user.firebase_uid,
        "email": user.email,
        "name": user.name
    }
    headers = {"Authorization": "Bearer mock_valid_token"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.dependencies.verify_firebase_token", return_value=mock_claims):
            
            # --- Test 1: Get Status when config doesn't exist ---
            resp = await client.get(f"/api/v1/campaigns/{campaign_1.id}/ai-optimization", headers=headers)
            assert resp.status_code == 200
            json_res = resp.json()
            assert json_res["is_active"] is False
            assert json_res["limit"] == 1
            assert json_res["active_count"] == 0

            # --- Test 2: Activate Campaign One ---
            payload = {
                "business_objective": "Increase high quality leads",
                "primary_kpi": "CPL",
                "target_cpl": 120.0
            }
            resp_act = await client.post(
                f"/api/v1/campaigns/{campaign_1.id}/ai-optimization/activate",
                headers=headers,
                json=payload
            )
            assert resp_act.status_code == 200
            res_act = resp_act.json()
            assert res_act["is_active"] is True
            assert res_act["active_count"] == 1
            assert res_act["target_cpl"] == 120.0

            # Check db config
            stmt = select(AIOptimizationConfig).where(AIOptimizationConfig.campaign_id == campaign_1.id)
            db_cfg = (await db.execute(stmt)).scalar_one()
            assert db_cfg.is_active is True
            assert db_cfg.target_cpl == 120.0

            # --- Test 3: Activate Campaign Two (should fail because starter limit is 1) ---
            resp_act_fail = await client.post(
                f"/api/v1/campaigns/{campaign_2.id}/ai-optimization/activate",
                headers=headers,
                json=payload
            )
            assert resp_act_fail.status_code == 400
            assert "reached your AI Optimization limit" in resp_act_fail.json()["detail"]

            # --- Test 4: Get Dashboard ---
            resp_dash = await client.get(f"/api/v1/campaigns/ai-optimization/dashboard?ad_account_id={ad_acc.id}", headers=headers)
            assert resp_dash.status_code == 200
            dash_res = resp_dash.json()
            assert dash_res["active_count"] == 1
            assert len(dash_res["campaigns"]) == 2
            
            # Find item in campaigns array
            active_item = next((c for c in dash_res["campaigns"] if c["campaign_id"] == str(campaign_1.id)), None)
            assert active_item is not None
            assert active_item["is_active"] is True

            # --- Test 5: Deactivate Campaign One ---
            resp_deact = await client.post(f"/api/v1/campaigns/{campaign_1.id}/ai-optimization/deactivate", headers=headers)
            assert resp_deact.status_code == 200
            assert resp_deact.json()["is_active"] is False
            assert resp_deact.json()["active_count"] == 0


@pytest.mark.anyio
async def test_ai_optimization_service_triggers_and_deduplication(db):
    """
    Verify AIOptimizationService analysis thresholds, recommendations generation,
    memory snapshot updating, audit logs, and fingerprint-based deduplication.
    """
    # 1. Setup mock user and metadata
    user = User(email="test_service@gmail.com", name="Test Service", plan_id="starter", firebase_uid="uid_service")
    db.add(user)
    await db.commit()

    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_opt_service_user",
        status="connected",
        access_token="mock_token"
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)

    ad_acc = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_service_acc",
        account_name="Service Ad Account",
        currency="INR",
        timezone="Asia/Kolkata",
        account_status=1
    )
    db.add(ad_acc)
    await db.commit()

    campaign = Campaign(
        ad_account_id=ad_acc.id,
        meta_campaign_id="999999",
        name="Scaling Campaign",
        status="ACTIVE",
        objective="LEAD_GENERATION",
        daily_budget=5000
    )
    db.add(campaign)
    await db.commit()

    ad_set = AdSet(
        campaign_id=campaign.id,
        meta_adset_id="555555",
        name="Core Audience AdSet",
        status="ACTIVE",
        optimization_goal="LEADS",
        performance_goal="MAXIMIZE_LEADS",
        billing_event="IMPRESSIONS"
    )
    db.add(ad_set)
    await db.commit()

    ad = Ad(
        ad_set_id=ad_set.id,
        meta_ad_id="333333",
        name="Winning Image Ad",
        status="ACTIVE"
    )
    db.add(ad)
    await db.commit()

    # 2. Add campaign optimization config
    config = AIOptimizationConfig(
        user_id=user.id,
        ad_account_id=ad_acc.id,
        campaign_id=campaign.id,
        is_active=True,
        target_cpl=150.0,
        memory={}
    )
    db.add(config)
    await db.commit()

    # 3. Add Campaign and Ad daily metrics
    today = date.today()
    # Add historical daily metrics for last 7 days (current period) showing CPL SPIKE
    # Current period: spend=7000, leads=20 -> CPL = 350 (exceeds ₹150 target, and represents spike)
    for i in range(7):
        db.add(CampaignDailyMetrics(
            campaign_id=campaign.id,
            date=today - timedelta(days=i),
            spend=1000.0,
            impressions=5000,
            clicks=150,
            leads=3,
            purchases=0,
            revenue=0.0
        ))
        
        # Add ad-level metrics showing this ad is a winner
        db.add(AdDailyMetrics(
            ad_id=ad.id,
            date=today - timedelta(days=i),
            spend=400.0,
            impressions=2000,
            clicks=70,
            leads=2,
            purchases=0,
            revenue=0.0
        ))

    # Add historical daily metrics for previous 7 days (previous period)
    # Previous period: spend=7000, leads=70 -> CPL = 100
    for i in range(7, 14):
        db.add(CampaignDailyMetrics(
            campaign_id=campaign.id,
            date=today - timedelta(days=i),
            spend=1000.0,
            impressions=6000,
            clicks=250,
            leads=10,
            purchases=0,
            revenue=0.0
        ))
        db.add(AdDailyMetrics(
            ad_id=ad.id,
            date=today - timedelta(days=i),
            spend=500.0,
            impressions=3000,
            clicks=120,
            leads=5,
            purchases=0,
            revenue=0.0
        ))
    
    await db.commit()

    # 4. Trigger AI Optimization Service runner manually
    triggered = await AIOptimizationService.analyze_campaign(db, config, user.id)
    assert triggered is True

    # 5. Verify recommendations generated
    stmt_recs = select(AIRecommendation).where(AIRecommendation.campaign_id == campaign.id)
    recs = (await db.execute(stmt_recs)).scalars().all()
    
    assert len(recs) > 0
    cpl_spike_rec = next((r for r in recs if r.fingerprint == f"{campaign.id}_CPL_SPIKE"), None)
    assert cpl_spike_rec is not None
    assert cpl_spike_rec.priority in ("critical", "warning")
    assert cpl_spike_rec.confidence_score > 0.85
    assert cpl_spike_rec.status == "new"
    
    # Must have logged audit log
    stmt_logs = select(AIOptimizationLog).where(AIOptimizationLog.campaign_id == campaign.id)
    logs = (await db.execute(stmt_logs)).scalars().all()
    assert len(logs) == 1
    assert logs[0].status == "SUCCESS"
    assert logs[0].recommendations_generated >= 1

    # 6. Verify duplicate recommendation prevention
    original_rec_id = cpl_spike_rec.id
    
    triggered_again = await AIOptimizationService.analyze_campaign(db, config, user.id)
    assert triggered_again is True

    recs_after = (await db.execute(stmt_recs)).scalars().all()
    assert len(recs_after) == len(recs)
    
    cpl_spike_rec_after = next((r for r in recs_after if r.id == original_rec_id), None)
    assert cpl_spike_rec_after is not None
