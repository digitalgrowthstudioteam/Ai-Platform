import pytest
from app.services.goal_engine import PerformanceGoalEngine

def test_awareness_reach_profile():
    profile = PerformanceGoalEngine.get_metric_profile("awareness", outcome="reach")
    assert "reach" in profile["primary"]
    assert "impressions" in profile["primary"]
    assert "frequency" in profile["primary"]
    assert "cpm" in profile["supporting"]
    assert "spend" in profile["supporting"]
    assert profile["metric_statuses"]["reach"] == "AVAILABLE"
    # Invalid metrics like roas/purchases/leads should not be primary/supporting
    assert "roas" not in profile["primary"]
    assert "leads" not in profile["supporting"]

def test_sales_purchases_profile():
    profile = PerformanceGoalEngine.get_metric_profile("sales", outcome="website_purchases")
    assert "purchases" in profile["primary"]
    assert "revenue" in profile["primary"]
    assert "roas" in profile["primary"]
    assert "add_to_cart" in profile["supporting"]
    assert profile["metric_statuses"]["purchases"] == "AVAILABLE"

def test_engagement_calls_no_revenue():
    profile = PerformanceGoalEngine.get_metric_profile("engagement", outcome="calls")
    assert "calls" in profile["primary"]
    assert "cost_per_call" in profile["primary"]
    assert "call_rate" in profile["primary"]
    
    # Verify no revenue or customer metrics
    all_metrics = (
        profile["primary"] + profile["supporting"] + 
        profile["diagnostic"] + profile["guardrail"]
    )
    for m in all_metrics:
        assert "revenue" not in m
        assert "roas" not in m
        assert "customer" not in m
        assert "purchase" not in m

def test_leads_website_crm_metrics():
    profile = PerformanceGoalEngine.get_metric_profile("leads", outcome="website_leads")
    assert "leads" in profile["primary"]
    assert "qualified_leads" in profile["metric_statuses"]
    assert profile["metric_statuses"]["qualified_leads"] == "CRM_REQUIRED"
    assert profile["metric_statuses"]["lead_to_customer_rate"] == "CRM_REQUIRED"

def test_messaging_no_revenue():
    profile = PerformanceGoalEngine.get_metric_profile("messaging", outcome="messenger")
    assert "conversations" in profile["primary"]
    assert "cost_per_conversation" in profile["primary"]
    
    all_metrics = (
        profile["primary"] + profile["supporting"] + 
        profile["diagnostic"] + profile["guardrail"]
    )
    for m in all_metrics:
        assert "revenue" not in m
        assert "roas" not in m
        assert "customer" not in m
        assert "purchase" not in m


import uuid
from unittest.mock import AsyncMock
from app.models.campaign import Campaign, AdSet
from app.models.metrics import CampaignDailyMetrics
from app.services.recommendation_engine import RecommendationEngine

class MockScalars:
    def __init__(self, data):
        self._data = data
    def all(self):
        return self._data

class MockResult:
    def __init__(self, data):
        self._scalars = MockScalars(data)
    def scalars(self):
        return self._scalars

@pytest.mark.asyncio
async def test_reusable_calls_profile():
    p_eng = PerformanceGoalEngine.get_metric_profile("engagement", outcome="calls")
    p_lead = PerformanceGoalEngine.get_metric_profile("leads", outcome="calls_lead")
    assert "calls" in p_eng["primary"]
    assert "calls" in p_lead["primary"]
    assert "cost_per_call" in p_eng["primary"]
    assert "cost_per_call" in p_lead["primary"]

@pytest.mark.asyncio
async def test_regression_recommendation_engine_mixed_account():
    db_mock = AsyncMock()
    user_id = uuid.uuid4()
    account_id = uuid.uuid4()

    # Define common metrics to populate 7 days
    metrics_curr = [
        CampaignDailyMetrics(spend=100.0, impressions=1000, clicks=50, purchases=5, revenue=500.0, leads=10)
    ]
    metrics_prev = [
        CampaignDailyMetrics(spend=100.0, impressions=1000, clicks=50, purchases=5, revenue=500.0, leads=10)
    ]
    # Set the mock to return these metrics
    db_mock.execute.side_effect = [
        MockResult(metrics_curr),
        MockResult(metrics_prev),
        MockResult(metrics_curr),
        MockResult(metrics_prev),
        MockResult(metrics_curr),
        MockResult(metrics_prev),
        MockResult(metrics_curr),
        MockResult(metrics_prev),
        MockResult(metrics_curr),
        MockResult(metrics_prev)
    ]

    # Campaign A: Sales -> Purchases
    camp_a = Campaign(id=uuid.uuid4(), name="Sales Campaign", objective="SALES", status="ACTIVE")
    camp_a.ad_sets = [AdSet(performance_goal="website_purchases")]

    # Campaign B: Leads -> Leads
    camp_b = Campaign(id=uuid.uuid4(), name="Leads Campaign", objective="LEADS", status="ACTIVE")
    camp_b.ad_sets = [AdSet(performance_goal="website_leads")]

    # Campaign C: Messaging -> WhatsApp
    camp_c = Campaign(id=uuid.uuid4(), name="WhatsApp Campaign", objective="MESSAGING", status="ACTIVE")
    camp_c.ad_sets = [AdSet(performance_goal="whatsapp")]

    # Campaign D: Calls -> Calls
    camp_d = Campaign(id=uuid.uuid4(), name="Calls Campaign", objective="LEADS", status="ACTIVE")
    camp_d.ad_sets = [AdSet(performance_goal="calls_lead")]

    # Campaign E: Traffic -> Website
    camp_e = Campaign(id=uuid.uuid4(), name="Traffic Campaign", objective="TRAFFIC", status="ACTIVE")
    camp_e.ad_sets = [AdSet(performance_goal="website")]

    # Execute recommendations diagnosis for Campaign A
    res_a = await RecommendationEngine.evaluate_root_cause_diagnosis(db_mock, camp_a, user_id, account_id)
    # The spend is 100.0 (curr + prev), which triggers DONT_CHANGE due to c_spend < 500
    assert len(res_a) == 1
    assert res_a[0].recommendation_type == "DONT_CHANGE"
    # Verify that the metrics in evidence reference purchases and not conversations
    assert "spend" in res_a[0].supporting_metrics
    assert "conversions" in res_a[0].supporting_metrics

