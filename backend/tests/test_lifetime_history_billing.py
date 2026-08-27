"""
Digital Growth Studio — Lifetime History Billing & Slot Assignment Tests
"""
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from app.models.user import User
from app.models.meta import MetaAdAccount, MetaConnection
from app.models.subscription import Subscription
from app.models.subscription_addon import SubscriptionAddOn
from app.services.entitlement_engine import EntitlementEngine


@pytest.mark.anyio
async def test_lifetime_history_resolution(db):
    """
    Verifies that the Entitlement Engine correctly resolves Lifetime History
    under different user subscription combinations.
    """
    # 1. Setup User and Connection
    user = User(
        email="test_lh_billing@gmail.com",
        name="LH Billing Tester",
        plan_id="starter",
        firebase_uid="uid_lh_billing_test",
    )
    db.add(user)
    await db.commit()

    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_usr_456",
        access_token="mock_access_token_lh",
        status="connected",
    )
    db.add(conn)
    await db.commit()

    # Create active subscription for the user to starter plan
    sub_starter = Subscription(
        user_id=user.id,
        plan="starter",
        status="active",
        started_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(sub_starter)
    await db.commit()

    # Create two Meta Ad accounts
    acc_a = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_lh_aaa",
        account_name="Account LH A",
        ai_intelligence_status="none",
        historical_intelligence_status="none",
    )
    acc_b = MetaAdAccount(
        user_id=user.id,
        meta_connection_id=conn.id,
        meta_account_id="act_lh_bbb",
        account_name="Account LH B",
        ai_intelligence_status="none",
        historical_intelligence_status="none",
    )
    db.add_all([acc_a, acc_b])
    await db.commit()

    # Case A: Base plan only -> enforce_historical_days should cap at base plan limit (30 days)
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=90)
    capped_date = await EntitlementEngine.enforce_historical_days(start_date, user, db, "act_lh_aaa")
    assert capped_date == today - timedelta(days=30)

    # Case B: Purchased 1 Lifetime History monthly slot, but not yet assigned
    now = datetime.now(timezone.utc)
    addon_ind = SubscriptionAddOn(
        user_id=user.id,
        addon_id="lifetime_history_monthly",
        quantity=1,
        status="active",
        expires_at=now + timedelta(days=30),
    )
    db.add(addon_ind)
    await db.commit()

    # It's not assigned yet (none), so should still cap at 30 days
    capped_date = await EntitlementEngine.enforce_historical_days(start_date, user, db, "act_lh_aaa")
    assert capped_date == today - timedelta(days=30)

    # Case C: Assigned to Account A
    acc_a.historical_intelligence_status = "active"
    db.add(acc_a)
    await db.commit()

    # Account A should now have unlimited history (start_date uncapped)
    capped_date = await EntitlementEngine.enforce_historical_days(start_date, user, db, "act_lh_aaa")
    assert capped_date == start_date

    # Account B should still be capped at 30 days
    capped_date_b = await EntitlementEngine.enforce_historical_days(start_date, user, db, "act_lh_bbb")
    assert capped_date_b == today - timedelta(days=30)
