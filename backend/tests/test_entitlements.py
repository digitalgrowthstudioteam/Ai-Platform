"""
Digital Growth Studio — Entitlements & Add-On Integration Tests
"""
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from app.models.user import User
from app.models.subscription import Subscription
from app.models.subscription_addon import SubscriptionAddOn
from app.services.entitlement_engine import EntitlementEngine


@pytest.mark.anyio
async def test_base_entitlements_by_plan(db):
    """
    Verifies that the Entitlement Engine correctly resolves core settings
    for Free vs Starter plans.
    """
    # Create test user for Free plan
    user_free = User(
        email="test_free_limits@gmail.com",
        name="Free User",
        plan_id="free",
        firebase_uid="uid_free_limits",
    )
    db.add(user_free)
    await db.commit()

    ent_free = await EntitlementEngine.resolve_entitlements(user_free, db)
    assert ent_free["plan_id"] == "free"
    assert ent_free["max_meta_accounts"] == 1
    assert ent_free["sync_interval_hours"] == 48
    assert ent_free["historical_days"] == 7
    assert ent_free["feature_gates"]["creative_analysis"] is False

    # Create test user for Starter plan
    user_starter = User(
        email="test_starter_limits@gmail.com",
        name="Starter User",
        plan_id="starter",
        firebase_uid="uid_starter_limits",
    )
    db.add(user_starter)
    await db.commit()

    ent_starter = await EntitlementEngine.resolve_entitlements(user_starter, db)
    assert ent_starter["plan_id"] == "starter"
    assert ent_starter["max_meta_accounts"] == 1
    assert ent_starter["sync_interval_hours"] == 48
    assert ent_starter["historical_days"] == 30
    assert ent_starter["feature_gates"]["creative_analysis"] is True


@pytest.mark.anyio
async def test_addons_resolve_entitlements_combination(db):
    """
    Verifies that active add-ons (additional accounts, faster sync, lifetime history)
    correctly scale resolved user entitlements limits.
    """
    user = User(
        email="test_addon_combos@gmail.com",
        name="Combo User",
        plan_id="starter",
        firebase_uid="uid_addon_combos",
    )
    db.add(user)
    await db.commit()

    now = datetime.now(timezone.utc)

    # Add-on 1: Additional Meta Account (+2 accounts)
    addon_acc = SubscriptionAddOn(
        user_id=user.id,
        addon_id="additional_account",
        quantity=2,
        status="active",
        expires_at=now + timedelta(days=30),
    )
    # Add-on 2: Faster Sync (3-Hour Sync)
    addon_sync = SubscriptionAddOn(
        user_id=user.id,
        addon_id="faster_sync",
        quantity=1,
        status="active",
        expires_at=now + timedelta(days=30),
    )
    # Add-on 3: Lifetime History (Annual)
    addon_history = SubscriptionAddOn(
        user_id=user.id,
        addon_id="lifetime_history_annual",
        quantity=1,
        status="active",
        expires_at=now + timedelta(days=365),
    )

    db.add_all([addon_acc, addon_sync, addon_history])
    await db.commit()

    # Resolve combined entitlements
    ent = await EntitlementEngine.resolve_entitlements(user, db)
    
    # Assert accounts scaled: Base (1) + AddOn (2) = 3 accounts
    assert ent["max_meta_accounts"] == 3
    # Assert sync scaled: 3 hours instead of default 48
    assert ent["sync_interval_hours"] == 3
    # Assert history scaled: Lifetime (99999 days)
    assert ent["historical_days"] == 99999
    # Starter still has creative analysis gates open
    assert ent["feature_gates"]["creative_analysis"] is True


@pytest.mark.anyio
async def test_expired_addons_excluded(db):
    """
    Ensures that expired or cancelled add-ons are excluded from entitlement scaling.
    """
    user = User(
        email="test_expired_addons@gmail.com",
        name="Expired User",
        plan_id="starter",
        firebase_uid="uid_expired_addons",
    )
    db.add(user)
    await db.commit()

    now = datetime.now(timezone.utc)

    # Add-on 1: Cancelled but NOT expired yet (entitlement remains active)
    addon_cancelled_active = SubscriptionAddOn(
        user_id=user.id,
        addon_id="additional_account",
        quantity=1,
        status="active",
        expires_at=now + timedelta(days=10),
    )
    # Add-on 2: Expired 5 days ago (should be ignored)
    addon_expired = SubscriptionAddOn(
        user_id=user.id,
        addon_id="faster_sync",
        quantity=1,
        status="active",
        expires_at=now - timedelta(days=5),
    )

    db.add_all([addon_cancelled_active, addon_expired])
    await db.commit()

    ent = await EntitlementEngine.resolve_entitlements(user, db)
    # Excludes expired fast sync
    assert ent["sync_interval_hours"] == 48
    # Retains not-yet-expired additional account limit (Base 1 + AddOn 1 = 2)
    assert ent["max_meta_accounts"] == 2


@pytest.mark.anyio
async def test_billing_addon_endpoints(db):
    """
    Tests order generation, payment verification, and auto-renewal cancellation endpoints.
    """
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    from app.dependencies import get_current_user
    
    # 1. Onboard test user
    user_email = "test_billing_endpoints@gmail.com"
    user = User(
        email=user_email,
        name="Billing User",
        plan_id="starter",
        firebase_uid="uid_billing_endpoints",
    )
    db.add(user)
    await db.commit()

    from app.database import get_db
    
    # Mock user auth claims and shared DB session
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: {
        "uid": "uid_billing_endpoints",
        "email": user_email,
        "name": "Billing User",
    }

    # Set mock Firebase auth header
    headers = {"Authorization": f"Bearer mock_token_for_{user_email}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 2. Get billing details overview
        res_details = await client.get("/api/v1/billing/subscription", headers=headers)
        assert res_details.status_code == 200
        data = res_details.json()
        assert data["plan"] == "starter"
        assert data["monthly_total_cost"] == 99  # Starter base cost (₹99)

        # 3. Create Add-on payment order
        order_payload = {
            "addon_id": "faster_sync",
            "quantity": 1,
        }
        res_order = await client.post("/api/v1/billing/order", json=order_payload, headers=headers)
        assert res_order.status_code == 200
        order_data = res_order.json()
        assert order_data["amount"] == 99900  # ₹999 in Paise
        assert "order_id" in order_data
        assert isinstance(order_data["is_mock"], bool)

        # 4. Verify payment callback
        verify_payload = {
            "razorpay_order_id": order_data["order_id"],
            "razorpay_payment_id": "pay_mock_123456",
            "razorpay_signature": "signature_mock_123456",
            "addon_id": "faster_sync",
            "quantity": 1,
        }
        res_verify = await client.post("/api/v1/billing/verify", json=verify_payload, headers=headers)
        assert res_verify.status_code == 200
        assert "Successfully activated add-on" in res_verify.json()["message"]

        # 5. Query subscription details again to verify add-on is listed
        res_details2 = await client.get("/api/v1/billing/subscription", headers=headers)
        data2 = res_details2.json()
        assert len(data2["active_addons_list"]) == 1
        assert data2["active_addons_list"][0]["addon_id"] == "faster_sync"
        assert data2["monthly_total_cost"] == 99 + 999  # Base (99) + Faster Sync (999) = ₹1,098

        # 6. Cancel auto-renewal of add-on
        res_cancel = await client.post("/api/v1/billing/addon/cancel?addon_id=faster_sync", headers=headers)
        assert res_cancel.status_code == 200
        assert "Successfully cancelled auto-renewal" in res_cancel.json()["message"]

    # Query DB directly to check status is updated
    stmt = select(SubscriptionAddOn).where(SubscriptionAddOn.user_id == user.id)
    res = await db.execute(stmt)
    addons = res.scalars().all()
    assert len(addons) == 1
    assert addons[0].status == "cancelled"

    # Cleanup overrides
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)

