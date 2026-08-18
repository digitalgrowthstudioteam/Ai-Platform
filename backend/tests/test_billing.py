"""
Digital Growth Studio — Subscription Billing Integration Tests
"""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.dependencies import get_current_user
from app.models.user import User
from app.models.subscription import Subscription

# Mock user claims
MOCK_CLAIMS = {
    "uid": "mock_firebase_uid_billing_123",
    "email": "billing_test@example.com",
    "name": "Billing Test User",
}


@pytest.fixture
def mock_auth():
    """Mock get_current_user dependency."""
    app.dependency_overrides[get_current_user] = lambda: MOCK_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
async def setup_billing_data(db: AsyncSession):
    """
    Sets up user record and cleans up any existing subscriptions.
    """
    # 0. Clean up existing test records if any
    await db.execute(delete(Subscription).where(Subscription.razorpay_customer_id.like("cust_%")))
    await db.execute(delete(User).where(User.email == MOCK_CLAIMS["email"]))
    await db.commit()

    # 1. User
    user = User(
        firebase_uid=MOCK_CLAIMS["uid"],
        email=MOCK_CLAIMS["email"],
        name=MOCK_CLAIMS["name"],
        plan_id="starter",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    yield {
        "user": user,
    }

    # Cleanup
    await db.execute(delete(Subscription).where(Subscription.user_id == user.id))
    await db.delete(user)
    await db.commit()


@pytest.mark.asyncio
async def test_subscription_details_query(mock_auth, setup_billing_data):
    """
    Verify querying user subscription details returns plan defaults.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/billing/subscription")
        assert response.status_code == 200
        sub = response.json()
        assert sub["plan"] == "starter"
        assert sub["status"] == "active"


@pytest.mark.asyncio
async def test_order_creation_flows(mock_auth, setup_billing_data):
    """
    Verify creating order generates mock Razorpay order IDs.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/billing/order", json={"plan_id": "growth"})
        assert response.status_code == 200
        order = response.json()
        assert order["is_mock"] is True
        assert "order_mock_" in order["order_id"]
        assert order["amount"] == 99900  # 999 INR in Paise
        assert order["currency"] == "INR"


@pytest.mark.asyncio
async def test_payment_verification_and_plan_upgrade(mock_auth, setup_billing_data, db: AsyncSession):
    """
    Verify captured payment updates database plan_id and registers subscription duration correctly.
    """
    data = setup_billing_data
    user = data["user"]
    user_id = user.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        verify_data = {
            "razorpay_order_id": "order_mock_test_12345",
            "razorpay_payment_id": "pay_mock_test_54321",
            "razorpay_signature": "mock_signature_abcde",
            "plan_id": "pro",
        }
        response = await client.post("/api/v1/billing/verify", json=verify_data)
        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify DB changes
        db.expire_all()
        stmt = select(User).where(User.id == user_id)
        db_res = await db.execute(stmt)
        updated_user = db_res.scalar_one()
        assert updated_user.plan_id == "pro"

        stmt_sub = select(Subscription).where(Subscription.user_id == user_id)
        db_sub_res = await db.execute(stmt_sub)
        sub = db_sub_res.scalar_one()
        assert sub.plan == "pro"
        assert sub.status == "active"
        assert sub.razorpay_subscription_id == "pay_mock_test_54321"
