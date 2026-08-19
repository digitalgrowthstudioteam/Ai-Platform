import pytest
import uuid
from datetime import date
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.meta import MetaConnection, MetaAdAccount
from app.models.campaign import Campaign, AdSet
from app.services.metric_engine import MetricEngine
from app.core.performance_goals import get_goal_profile, PERFORMANCE_GOAL_REGISTRY
from app.main import app


@pytest.mark.asyncio
async def test_metric_engine_calculations():
    # Test division by zero prevention
    empty_data = {
        "spend": 0.0,
        "impressions": 0,
        "clicks": 0,
        "leads": 0,
        "purchases": 0,
        "revenue": 0.0,
    }
    derived = MetricEngine.calculate_derived_metrics(empty_data)
    assert derived["cpm"] is None
    assert derived["ctr"] is None
    assert derived["cpc"] is None
    assert derived["cpl"] is None
    assert derived["cpa"] is None
    assert derived["roas"] is None

    # Test conversion calculations
    normal_data = {
        "spend": 1000.0,
        "impressions": 50000,
        "clicks": 500,
        "leads": 50,
        "purchases": 10,
        "revenue": 5000.0,
        "calls": 20,
        "conversations": 40,
        "thruplays": 300,
    }
    res = MetricEngine.calculate_derived_metrics(normal_data)
    assert res["cpm"] == 20.0
    assert res["ctr"] == 1.0  # (500 / 50000) * 100
    assert res["cpc"] == 2.0  # 1000 / 500
    assert res["cpl"] == 20.0  # 1000 / 50
    assert res["cpa"] == 100.0  # 1000 / 10
    assert res["roas"] == 5.0  # 5000 / 1000
    assert res["cost_per_call"] == 50.0  # 1000 / 20
    assert res["cost_per_conversation"] == 25.0  # 1000 / 40
    assert res["cost_per_thruplay"] == (1000.0 / 300)


@pytest.mark.asyncio
async def test_performance_goal_registry():
    # Verify profile retrieval and metadata mapping
    profile = get_goal_profile("leads")
    assert profile is not None
    assert profile["name"] == "Maximise number of leads"
    assert "cpl" in profile["primary_metrics"]
    assert "ctr" in profile["diagnostic_metrics"]

    # Check fallback profile mapping
    fallback = get_goal_profile("non_existent_goal")
    assert fallback["id"] == "non_existent_goal"


@pytest.mark.asyncio
async def test_dynamic_performance_api_endpoint(db: AsyncSession):
    # 1. Create a dummy User
    user_uuid = uuid.uuid4()
    user = User(
        id=user_uuid,
        email="digitalgrowthstudioteam@gmail.com",
        name="Goals Tester",
        firebase_uid=f"firebase_goals_{user_uuid}",
    )
    db.add(user)
    await db.flush()

    # 2. Create a dummy MetaConnection
    conn = MetaConnection(
        id=uuid.uuid4(),
        user_id=user.id,
        meta_user_id="meta_usr_goals_test",
        status="connected",
        access_token_encrypted="encrypted_token_dummy",
    )
    db.add(conn)
    await db.flush()

    # 3. Create a dummy MetaAdAccount
    ad_acc = MetaAdAccount(
        id=uuid.uuid4(),
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_999888777",
        account_name="Goals Meta Account",
        currency="INR",
        timezone="Asia/Kolkata",
    )
    db.add(ad_acc)
    await db.flush()

    # 4. Create a Campaign and AdSet with motive/performance goal columns
    camp = Campaign(
        id=uuid.uuid4(),
        ad_account_id=ad_acc.id,
        meta_campaign_id="camp_101010",
        name="Test Leads Performance Campaign",
        status="ACTIVE",
        objective="OUTCOME_LEADS",
    )
    db.add(camp)
    await db.flush()

    adset = AdSet(
        id=uuid.uuid4(),
        campaign_id=camp.id,
        meta_adset_id="adset_202020",
        name="Leads Ad Set Focus",
        status="ACTIVE",
        optimization_goal="LEAD",
        billing_event="IMPRESSIONS",
        motive="lead",
        performance_goal="leads",
        optimization_event="LEAD",
        performance_goal_profile_id="leads",
    )
    db.add(adset)
    await db.commit()

    # 5. Invoke GET endpoint via FastAPI AsyncClient
    from app.dependencies import get_current_user
    
    async def mock_get_current_user():
        return {"uid": user.firebase_uid, "email": user.email}

    app.dependency_overrides[get_current_user] = mock_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        url = f"/api/v1/campaigns/{camp.id}/adsets/{adset.id}/performance?start_date=2026-08-10&end_date=2026-08-17"
        response = await ac.get(url)
        assert response.status_code == 200
        
        data = response.json()
        assert data["adset_id"] == str(adset.id)
        assert data["performance_goal"]["id"] == "leads"
        assert data["performance_goal"]["motive"] == "leads"
        assert "health_score" in data
        assert isinstance(data["primary_metrics"], list)
        assert len(data["primary_metrics"]) > 0
        
        # Verify CPL is mapped in unavailable metrics since there is no data to compute it
        unavailable_names = [m["metric"] for m in data["unavailable_metrics"]]
        assert "cpl" in unavailable_names

    # Clean dependency overrides
    app.dependency_overrides.pop(get_current_user, None)
