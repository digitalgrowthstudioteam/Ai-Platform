"""
Digital Growth Studio — Campaign Plan Acquisition Funnel and PDF Generation Tests
"""
import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.main import app
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ads_service import CampaignPlan
from tests.test_admin import STANDARD_CLAIMS

@pytest.fixture
def mock_standard_auth():
    app.dependency_overrides[get_current_user] = lambda: STANDARD_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)

@pytest.fixture
async def setup_test_user(db: AsyncSession):
    # Cleanup previous records
    await db.execute(delete(CampaignPlan))
    await db.execute(delete(User).where(User.email == STANDARD_CLAIMS["email"]))
    await db.commit()

    # Create standard user
    std_user = User(
        firebase_uid=STANDARD_CLAIMS["uid"],
        email=STANDARD_CLAIMS["email"],
        name=STANDARD_CLAIMS["name"],
        plan_id="starter",
        status="active",
    )
    db.add(std_user)
    await db.commit()
    await db.refresh(std_user)
    return std_user

@pytest.mark.asyncio
async def test_generate_campaign_plan_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/ads-service/campaign-plans/generate",
            json={
                "business_name": "Suvarna Beauty Shop",
                "industry": "Beauty & Personal Care",
                "product_or_service": "Organic lipsticks",
                "campaign_objective": "Website Sales",
                "conversion_location": "Website",
                "target_location": "Mumbai",
                "target_customer": "Women aged 18-35",
                "budget": "₹500–₹1,000/day",
                "duration": "14 Days",
                "creative_availability": "I need static creatives",
                "website": "https://suvarnabeauty.in",
                "offer": "Buy 1 Get 1 Free",
                "previous_ads_experience": "None",
                "main_challenge": "Driving sales on site"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "business_summary" in data
        assert "recommended_objective" in data
        assert "readiness_score" in data
        assert data["recommended_objective"] == "Sales"

@pytest.mark.asyncio
async def test_generate_campaign_plan_restricted():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/ads-service/campaign-plans/generate",
            json={
                "business_name": "Golden Betting App",
                "industry": "Technology",
                "product_or_service": "Online casino and sports betting",
                "campaign_objective": "Website Sales",
                "conversion_location": "Website",
                "target_location": "Mumbai",
                "target_customer": "Adults",
                "budget": "₹500–₹1,000/day",
                "duration": "14 Days",
                "creative_availability": "I have finished creatives ready",
                "website": "https://goldenbetting.in",
                "offer": "100% deposit bonus",
                "previous_ads_experience": "None",
                "main_challenge": "Driving casino signups"
            }
        )
        assert response.status_code == 400
        assert "unavailable for this business category" in response.json()["detail"]

@pytest.mark.asyncio
async def test_save_and_retrieve_campaign_plan(mock_standard_auth, setup_test_user):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Save a plan
        response = await ac.post(
            "/api/v1/ads-service/campaign-plans/save",
            json={
                "business_name": "Suvarna Beauty Shop",
                "campaign_profile": {"industry": "Beauty"},
                "report_data": {"business_summary": "Test Summary", "readiness_score": 85},
                "readiness_score": 85
            }
        )
        assert response.status_code == 200
        plan_id = response.json()["plan_id"]
        assert plan_id is not None

        # List plans
        list_resp = await ac.get("/api/v1/ads-service/campaign-plans")
        assert list_resp.status_code == 200
        plans = list_resp.json()
        assert len(plans) == 1
        assert plans[0]["id"] == plan_id

        # Get plan details
        detail_resp = await ac.get(f"/api/v1/ads-service/campaign-plans/{plan_id}")
        assert detail_resp.status_code == 200
        assert detail_resp.json()["business_name"] == "Suvarna Beauty Shop"

        # Download PDF
        pdf_resp = await ac.get(f"/api/v1/ads-service/campaign-plans/{plan_id}/pdf")
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers["content-type"] == "application/pdf"
        assert len(pdf_resp.content) > 0
