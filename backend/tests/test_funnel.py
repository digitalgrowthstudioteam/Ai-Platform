import pytest
import uuid
from unittest.mock import patch
from fastapi import status
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.meta import MetaConnection, MetaAdAccount
from app.services.funnel_service import calculate_readiness_score, generate_recommendations
from app.services.pdf_generator import PDFReportGenerator
from app.main import app

def test_strategy_score_calculation():
    """Verify strategy readiness score calculation is deterministic."""
    answers = {
        "q1": "Ecommerce / Products",
        "q2": "Get Sales",
        "q3": "₹1 Lakh – ₹5 Lakhs",
        "q4": "More than 1 year",
        "q5": "ROAS is poor",
        "q6": "11–25",
        "q7": "Every day",
        "q8": ["Daily budgets", "Creative assets"],
        "q9": "Wasting ad budget",
        "q10": "Which campaigns to scale"
    }
    score = calculate_readiness_score(answers)
    assert score == 94 # 10 + 10 + 10 + 10 + 10 + 10 + 10 + 4 + 10 + 10 = 94

    answers_low = {
        "q1": "Other",
        "q2": "Brand Awareness",
        "q3": "Under ₹25,000",
        "q4": "I'm just starting",
        "q5": "Results are inconsistent",
        "q6": "None",
        "q7": "Almost never",
        "q8": ["I'm not sure"],
        "q9": "Understanding analytics",
        "q10": "Audience growth options"
    }
    score_low = calculate_readiness_score(answers_low)
    assert score_low == 62 # Actual score based on calculation formula


def test_recommendations_mapping():
    """Verify strategic priorities are generated correctly based on answers."""
    answers = {
        "q1": "Ecommerce / Products",
        "q5": "ROAS is poor",
        "q7": "Once a week"
    }
    recs = generate_recommendations(answers)
    assert len(recs) >= 2
    ids = [r["id"] for r in recs]
    assert "poor_roas" in ids
    assert "ind_ecom" in ids


def test_pdf_generation_bytes():
    """Verify ReportLab PDF service compiles report into a stream."""
    metrics = {
        "spend": 50000.0,
        "roas": 2.5,
        "cpl": 120.0,
        "ctr": 1.8,
        "leads": 400
    }
    campaigns = [
        {"name": "Scale Winner Ecom", "spend": 25000.0, "results": 200, "cpl": 125.0, "ctr": 2.1, "status": "active"},
        {"name": "High CPL Review", "spend": 15000.0, "results": 80, "cpl": 187.5, "ctr": 1.2, "status": "active"}
    ]
    findings = [
        {"title": "Weak Outbound CTR", "type": "Creative Performance", "recommendation": "Refresh creative ad copies.", "expected_impact": "Higher CTR."}
    ]
    
    pdf_stream = PDFReportGenerator.generate_audit_report(
        user_name="Vikram",
        ad_account_name="Primary Store Account",
        health_score=85,
        metrics=metrics,
        campaigns=campaigns,
        findings=findings
    )
    
    assert pdf_stream is not None
    pdf_bytes = pdf_stream.getvalue()
    assert pdf_bytes.startswith(b"%PDF") # Standard PDF file header signature


@pytest.mark.asyncio
async def test_funnel_endpoints(
    db: AsyncSession,
):
    """Test authenticated funnel router endpoints."""
    # Create mock user
    user_uid = f"mock-uid-{uuid.uuid4().hex[:10]}"
    user = User(
        firebase_uid=user_uid,
        email="funnel-test@dgs.in",
        name="Lead Tester",
        trial_status="not_started",
        trial_used=False
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Set mock user credentials
    headers = {"Authorization": f"Bearer mock_token_for_{user_uid}"}
    mock_claims = {"uid": user_uid, "email": "funnel-test@dgs.in"}

    # 1. Post Strategy Questionnaire answers
    payload = {
        "answers": {
            "q1": "Lead Generation",
            "q2": "Generate Leads",
            "q3": "₹50,000 – ₹1 Lakh",
            "q4": "3–6 months",
            "q5": "CPL / CPA is too high",
            "q6": "4–10",
            "q7": "A few times a week",
            "q8": ["Audience parameters"],
            "q9": "Reducing lead/sale costs",
            "q10": "How to reduce acquisition cost"
        }
    }
    
    transport = ASGITransport(app=app)
    with patch("app.dependencies.verify_firebase_token", return_value=mock_claims):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            r = await client.post("/api/v1/funnel/recommendation", json=payload, headers=headers)
            assert r.status_code == status.HTTP_200_OK
            data = r.json()
            assert data["score"] > 0
            assert len(data["priorities"]) > 0

            # 2. Get Latest Strategy Results
            r_get = await client.get("/api/v1/funnel/recommendation/latest", headers=headers)
            assert r_get.status_code == status.HTTP_200_OK
            assert r_get.json()["score"] == data["score"]

            # 3. Log Funnel Event
            r_evt = await client.post("/api/v1/funnel/event", json={"event_name": "lead_funnel_completed"}, headers=headers)
            assert r_evt.status_code == status.HTTP_200_OK
