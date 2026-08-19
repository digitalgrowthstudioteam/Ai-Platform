"""
Digital Growth Studio — AI Intelligence Billing & Slot Assignment Tests
"""
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from app.models.user import User
from app.models.meta import MetaAdAccount, MetaConnection
from app.models.subscription_addon import SubscriptionAddOn
from app.services.entitlement_engine import EntitlementEngine
from httpx import AsyncClient


@pytest.mark.anyio
async def test_has_full_ai_intelligence_resolution(db):
    """
    Verifies that the Entitlement Engine correctly resolves Full AI Intelligence
    under different user subscription combinations.
    """
    # 1. Setup User and Connection
    user = User(
        email="test_ai_billing@gmail.com",
        name="AI Billing Tester",
        plan_id="starter",
        firebase_uid="uid_ai_billing_test",
    )
    db.add(user)
    await db.commit()

    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_usr_123",
        access_token="mock_access_token",
        status="connected",
    )
    db.add(conn)
    await db.commit()

    # Create two Meta Ad accounts
    acc_a = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_aaa",
        account_name="Account A",
        ai_intelligence_status="none",
        historical_intelligence_status="none",
    )
    acc_b = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_bbb",
        account_name="Account B",
        ai_intelligence_status="none",
        historical_intelligence_status="none",
    )
    db.add_all([acc_a, acc_b])
    await db.commit()

    # Case A: Base plan only -> Full AI Intelligence should be disabled
    check_a = await EntitlementEngine.has_full_ai_intelligence(db, user.id, "act_aaa")
    assert check_a["enabled"] is False
    assert check_a["scope"] == "BASE_LIMIT"

    # Case B: Purchased 1 Individual monthly slot, but not yet assigned
    now = datetime.now(timezone.utc)
    addon_ind = SubscriptionAddOn(
        user_id=user.id,
        addon_id="AI_INTELLIGENCE_INDIVIDUAL_MONTHLY",
        quantity=1,
        status="active",
        expires_at=now + timedelta(days=30),
    )
    db.add(addon_ind)
    await db.commit()

    # It's not assigned yet (none), so should still return disabled
    check_a = await EntitlementEngine.has_full_ai_intelligence(db, user.id, "act_aaa")
    assert check_a["enabled"] is False

    # Case C: Assigned to Account A
    acc_a.ai_intelligence_status = "active"
    acc_a.historical_intelligence_status = "active"
    db.add(acc_a)
    await db.commit()

    # Account A should now be enabled with scope "ACCOUNT"
    check_a = await EntitlementEngine.has_full_ai_intelligence(db, user.id, "act_aaa")
    assert check_a["enabled"] is True
    assert check_a["scope"] == "ACCOUNT"
    assert check_a["source"] == "AI_INTELLIGENCE_INDIVIDUAL"

    # Account B should still be disabled
    check_b = await EntitlementEngine.has_full_ai_intelligence(db, user.id, "act_bbb")
    assert check_b["enabled"] is False

    # Case D: All Accounts subscription purchased
    addon_all = SubscriptionAddOn(
        user_id=user.id,
        addon_id="AI_INTELLIGENCE_ALL_MONTHLY",
        quantity=1,
        status="active",
        expires_at=now + timedelta(days=30),
    )
    db.add(addon_all)
    await db.commit()

    # Now BOTH accounts should automatically return enabled under "ALL_ACCOUNTS" scope
    check_a = await EntitlementEngine.has_full_ai_intelligence(db, user.id, "act_aaa")
    assert check_a["enabled"] is True
    assert check_a["scope"] == "ALL_ACCOUNTS"

    check_b = await EntitlementEngine.has_full_ai_intelligence(db, user.id, "act_bbb")
    assert check_b["enabled"] is True
    assert check_b["scope"] == "ALL_ACCOUNTS"
    
    # Self-healing database assertion
    assert acc_b.ai_intelligence_status == "active"
