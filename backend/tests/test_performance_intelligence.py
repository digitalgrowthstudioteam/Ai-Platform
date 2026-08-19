"""
Digital Growth Studio — Performance Intelligence & Budget Analytics Tests
"""
import pytest
import uuid
from datetime import date, timedelta
from app.services.metric_engine import MetricEngine
from app.api.v1.dashboard import calculate_rates, calculate_trend

def test_metric_engine_calculations():
    # 1. Normal values test
    raw = {
        "spend": 1000.0,
        "impressions": 50000,
        "reach": 20000,
        "clicks": 1500,
        "link_clicks": 1200,
        "leads": 240,
        "purchases": 50,
        "revenue": 5000.0,
        "landing_page_views": 800,
        "video_views": 10000,
        "thruplays": 4000,
        "video_play_25": 8000,
        "video_play_50": 5000,
        "video_play_75": 3000,
        "video_play_95": 2000,
        "video_play_100": 1000,
        "comments": 15,
        "shares": 10,
        "saves": 5,
        "reactions": 100
    }
    
    out = MetricEngine.calculate_derived_metrics(raw)
    assert out["spend"] == 1000.0
    assert out["frequency"] == 2.5
    assert out["cpm"] == 20.0
    assert out["cpc"] == 1000.0 / 1200
    assert out["lpv_rate"] == 800.0 / 1200 * 100.0
    assert out["landing_page_to_lead_conversion_rate"] == 240.0 / 800 * 100.0
    assert out["video_starts"] == 10000
    assert out["video_25_rate"] == 80.0
    assert out["video_50_rate"] == 50.0
    assert out["video_100_rate"] == 10.0
    assert out["video_hold_rate"] == 40.0
    assert out["comments"] == 15
    assert out["shares"] == 10
    assert out["saves"] == 5
    assert out["reactions"] == 100

def test_zero_denominator_handling():
    # 2. Zero values test
    raw = {
        "spend": 0.0,
        "impressions": 0,
        "reach": 0,
        "clicks": 0,
        "link_clicks": 0,
        "leads": 0,
        "purchases": 0,
        "revenue": 0.0,
        "landing_page_views": 0,
        "video_views": 0,
        "thruplays": 0,
    }
    out = MetricEngine.calculate_derived_metrics(raw)
    assert out["frequency"] is None
    assert out["cpm"] is None
    assert out["cpc"] is None
    assert out["lpv_rate"] is None
    assert out["landing_page_to_lead_conversion_rate"] is None
    assert out["video_25_rate"] is None
    assert out["video_hold_rate"] is None

def test_rates_and_trends():
    data = {
        "spend": 500.0,
        "impressions": 10000,
        "clicks": 300,
        "purchases": 10,
        "revenue": 1000.0,
        "reach": 5000,
        "leads": 50,
        "link_clicks": 200,
        "add_to_cart": 40,
        "initiate_checkout": 20,
        "thruplays": 800,
        "video_views": 2000,
        "post_engagement": 500,
        "video_play_25": 1600,
        "video_play_50": 1000,
        "video_play_75": 600,
        "video_play_95": 400,
        "video_play_100": 200,
        "comments": 2,
        "shares": 1,
        "saves": 0,
        "reactions": 10,
        "landing_page_views": 150,
    }
    rates = calculate_rates(data)
    assert rates["lpv_rate"] == 150 / 200
    assert rates["landing_page_to_lead_conversion_rate"] == 50 / 150
    assert rates["comments"] == 2
    assert rates["shares"] == 1
    
    # Trend calculations
    assert calculate_trend(100.0, 50.0) == 100.0
    assert calculate_trend(25.0, 50.0) == -50.0
    assert calculate_trend(10.0, 0.0) == 0.0
