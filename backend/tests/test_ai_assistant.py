"""
Digital Growth Studio — AI Assistant Feature Integration Tests
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
from app.models.campaign import Campaign
from app.models.metrics import CampaignDailyMetrics
from app.models.ai_assistant import AIChatConversation, AIChatMessage, AICreditTransaction
from app.models.subscription import Subscription
from app.services.ai_assistant_service import AIAssistantService


@pytest.mark.anyio
async def test_ai_assistant_credits_endpoint(db):
    """
    Verify that GET /assistant/credits returns the correct credit balance.
    """
    # 1. Setup mock user
    user = User(
        email="credits_assistant@gmail.com",
        name="Credit Test",
        plan_id="starter",
        firebase_uid="uid_credits_assistant",
        credits=50
    )
    db.add(user)
    await db.commit()

    mock_claims = {
        "uid": user.firebase_uid,
        "email": user.email,
        "name": user.name
    }
    headers = {"Authorization": "Bearer mock_valid_token"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.dependencies.verify_firebase_token", return_value=mock_claims):
            resp = await client.get("/api/v1/assistant/credits", headers=headers)
            assert resp.status_code == 200
            data = resp.json()
            assert data["credits"] == 50


@pytest.mark.anyio
async def test_ai_assistant_conversation_lifecycle(db):
    """
    Verify conversation creation, listing (scoped to account), loading, and deletion.
    """
    user = User(
        email="lifecycle_assistant@gmail.com",
        name="Lifecycle Test",
        plan_id="starter",
        firebase_uid="uid_lifecycle_assistant",
        credits=10
    )
    db.add(user)
    await db.commit()

    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_lifecycle_user",
        status="connected",
        access_token="mock_token"
    )
    db.add(conn)
    await db.commit()

    ad_acc = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_lifecycle_acc",
        account_name="Lifecycle Account",
        currency="INR",
        timezone="Asia/Kolkata",
        account_status=1
    )
    db.add(ad_acc)
    await db.commit()

    mock_claims = {
        "uid": user.firebase_uid,
        "email": user.email,
        "name": user.name
    }
    headers = {"Authorization": "Bearer mock_valid_token"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.dependencies.verify_firebase_token", return_value=mock_claims):
            
            # --- 1. Create a conversation ---
            payload = {
                "ad_account_id": str(ad_acc.id),
                "title": "Ad Audit Chat"
            }
            resp_create = await client.post("/api/v1/assistant/conversations", json=payload, headers=headers)
            assert resp_create.status_code == 200
            convo = resp_create.json()
            assert convo["title"] == "Ad Audit Chat"
            assert "id" in convo

            # --- 2. List conversations (scoped to ad account) ---
            resp_list = await client.get(f"/api/v1/assistant/conversations?ad_account_id={ad_acc.id}", headers=headers)
            assert resp_list.status_code == 200
            convos_list = resp_list.json()
            assert len(convos_list) == 1
            assert convos_list[0]["id"] == convo["id"]

            # --- 3. Get messages (empty list initially) ---
            resp_msg = await client.get(f"/api/v1/assistant/conversations/{convo['id']}/messages", headers=headers)
            assert resp_msg.status_code == 200
            assert resp_msg.json() == []

            # --- 4. Delete the conversation ---
            resp_del = await client.delete(f"/api/v1/assistant/conversations/{convo['id']}", headers=headers)
            assert resp_del.status_code == 200

            # List again, should be empty
            resp_list_after = await client.get(f"/api/v1/assistant/conversations?ad_account_id={ad_acc.id}", headers=headers)
            assert resp_list_after.json() == []


@pytest.mark.anyio
async def test_ai_assistant_message_flow_and_atomic_credits(db):
    """
    Verify message flows: credit check, atomic deduction on success, and exhaustion constraints.
    """
    user = User(
        email="message_assistant@gmail.com",
        name="Message Test",
        plan_id="starter",
        firebase_uid="uid_message_assistant",
        credits=1  # Has exactly 1 credit
    )
    db.add(user)
    await db.commit()

    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_message_user",
        status="connected",
        access_token="mock_token"
    )
    db.add(conn)
    await db.commit()

    ad_acc = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_message_acc",
        account_name="Message Account",
        currency="INR",
        timezone="Asia/Kolkata",
        account_status=1
    )
    db.add(ad_acc)
    await db.commit()

    campaign = Campaign(
        ad_account_id=ad_acc.id,
        meta_campaign_id="888888",
        name="Lead Scaling Camp",
        status="ACTIVE",
        objective="LEAD_GENERATION",
        daily_budget=3000
    )
    db.add(campaign)
    await db.commit()

    # Add metrics showing CPL spike
    today = date.today()
    for i in range(7):
        db.add(CampaignDailyMetrics(
            campaign_id=campaign.id,
            date=today - timedelta(days=i),
            spend=1000.0,
            impressions=5000,
            clicks=100,
            leads=2,
            purchases=0,
            revenue=0.0
        ))
    await db.commit()

    mock_claims = {
        "uid": user.firebase_uid,
        "email": user.email,
        "name": user.name
    }
    headers = {"Authorization": "Bearer mock_valid_token"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.dependencies.verify_firebase_token", return_value=mock_claims):
            
            # Create a conversation
            payload = {
                "ad_account_id": str(ad_acc.id),
                "title": "New Conversation"
            }
            resp_convo = await client.post("/api/v1/assistant/conversations", json=payload, headers=headers)
            convo = resp_convo.json()
            convo_id = convo["id"]

            # --- 1. Send first message (deducts 1 credit, uses local fallback fallback) ---
            msg_payload = {
                "content": "Why did CPL increase?",
                "ad_account_id": str(ad_acc.id)
            }
            resp_send = await client.post(
                f"/api/v1/assistant/conversations/{convo_id}/messages", 
                json=msg_payload, 
                headers=headers
            )
            assert resp_send.status_code == 200
            res_send = resp_send.json()
            assert res_send["role"] == "model"
            assert "Lead Scaling Camp" in res_send["content"]
            assert f"entity:campaign:{campaign.id}" in res_send["content"]
            assert res_send["credits_remaining"] == 0

            # Verify transaction log exists in DB
            stmt_txn = select(AICreditTransaction).where(AICreditTransaction.user_id == user.id)
            res_txn = await db.execute(stmt_txn)
            txns = res_txn.scalars().all()
            assert len(txns) == 1
            assert txns[0].credit_amount == 1
            assert txns[0].reason == "AI Assistant response"

            # --- 2. Send second message (should fail since credits are 0) ---
            resp_send_fail = await client.post(
                f"/api/v1/assistant/conversations/{convo_id}/messages", 
                json=msg_payload, 
                headers=headers
            )
            assert resp_send_fail.status_code == 400
            assert "AI Credits" in resp_send_fail.json()["detail"]


@pytest.mark.anyio
async def test_ai_assistant_cross_account_isolation(db):
    """
    Verify that conversations are isolated strictly by ad account boundaries.
    """
    user = User(
        email="isolation_assistant@gmail.com",
        name="Isolation Test",
        plan_id="starter",
        firebase_uid="uid_isolation_assistant",
        credits=5
    )
    db.add(user)
    await db.commit()

    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_isolation_user",
        status="connected",
        access_token="mock_token"
    )
    db.add(conn)
    await db.commit()

    ad_acc_a = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_acc_a",
        account_name="Account A",
        currency="INR",
        timezone="Asia/Kolkata",
        account_status=1
    )
    ad_acc_b = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_acc_b",
        account_name="Account B",
        currency="INR",
        timezone="Asia/Kolkata",
        account_status=1
    )
    db.add_all([ad_acc_a, ad_acc_b])
    await db.commit()

    mock_claims = {
        "uid": user.firebase_uid,
        "email": user.email,
        "name": user.name
    }
    headers = {"Authorization": "Bearer mock_valid_token"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        with patch("app.dependencies.verify_firebase_token", return_value=mock_claims):
            
            # Create a conversation scoped to Account A
            payload = {
                "ad_account_id": str(ad_acc_a.id),
                "title": "Account A Chat"
            }
            resp_convo = await client.post("/api/v1/assistant/conversations", json=payload, headers=headers)
            convo = resp_convo.json()
            convo_id = convo["id"]

            # Try to send message to convo under Account A context but passing ad_account_id = Account B
            msg_payload = {
                "content": "Analyze performance",
                "ad_account_id": str(ad_acc_b.id)
            }
            resp_send_fail = await client.post(
                f"/api/v1/assistant/conversations/{convo_id}/messages", 
                json=msg_payload, 
                headers=headers
            )
            # Should fail as the conversation boundary belongs to Account A
            assert resp_send_fail.status_code == 400
            assert "Conversation context does not match" in resp_send_fail.json()["detail"]
