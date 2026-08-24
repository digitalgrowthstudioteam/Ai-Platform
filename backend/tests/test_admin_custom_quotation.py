import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ads_service import MetaAdServiceRequest, ServiceQuotation
from app.models.ticket import SupportTicket

# Mock Admin user claims
ADMIN_CLAIMS = {
    "uid": "mock_firebase_uid_admin_123",
    "email": "flasshgames2026@gmail.com",
    "name": "Admin Owner User",
}

# Mock Standard user claims
STANDARD_CLAIMS = {
    "uid": "mock_firebase_uid_non_admin_456",
    "email": "standard_user_test@example.com",
    "name": "Standard User",
}


@pytest.fixture
def mock_admin_auth():
    app.dependency_overrides[get_current_user] = lambda: ADMIN_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def mock_standard_auth():
    app.dependency_overrides[get_current_user] = lambda: STANDARD_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
async def setup_test_data(db: AsyncSession):
    # Clean up standard target user if existing
    await db.execute(delete(User).where(User.email == STANDARD_CLAIMS["email"]))
    await db.commit()

    # Seed user
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


@pytest.mark.anyio
async def test_raise_quotation_and_ticket_unauthorized(setup_test_data, mock_standard_auth):
    """Verify standard users cannot hit admin raise endpoints."""
    user = setup_test_data
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # Raise quotation attempt
        res_quote = await ac.post(
            f"/api/v1/admin/users/{user.id}/raise-quotation",
            json={
                "number_of_ads": 5,
                "price_per_ad": 500,
                "validity_days": 15,
                "include_setup": True,
                "setup_price": 1000,
                "include_creative": False,
                "creative_price": 0,
            },
        )
        assert res_quote.status_code == 403

        # Raise ticket attempt
        res_ticket = await ac.post(
            f"/api/v1/admin/users/{user.id}/raise-ticket",
            json={
                "subject": "Admin generated ticket",
                "description": "Admin test ticket",
                "category": "Billing Issue",
            },
        )
        assert res_ticket.status_code == 403


@pytest.mark.anyio
async def test_admin_raise_quotation_success(db: AsyncSession, setup_test_data, mock_admin_auth):
    """Verify administrator can successfully raise a custom quotation for a user."""
    user = setup_test_data
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        payload = {
            "number_of_ads": 8,
            "price_per_ad": 600,
            "validity_days": 30,
            "include_setup": True,
            "setup_price": 1500,
            "include_creative": True,
            "creative_price": 999,
            "custom_item_name": "Special Copywriting Bonus",
            "custom_item_price": 500,
        }

        # Call endpoint
        res = await ac.post(f"/api/v1/admin/users/{user.id}/raise-quotation", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "quotation_id" in data

        # Check DB quotation record exists
        stmt = select(ServiceQuotation).where(ServiceQuotation.user_id == user.id)
        r = await db.execute(stmt)
        quote = r.scalar_one_or_none()
        assert quote is not None
        assert quote.status == "pending"

        # Check final total calculation in Paise:
        # ads: 8 * 600 = 4800
        # setup: 1500
        # creative: 999
        # custom: 500
        # Total = 4800 + 1500 + 999 + 500 = 7799 Rupees = 779900 Paise
        assert quote.final_total == 779900
        assert len(quote.items) == 4
        assert quote.items[0]["service_name"] == "8 Meta Ads Campaign Management"


@pytest.mark.anyio
async def test_admin_raise_ticket_success(db: AsyncSession, setup_test_data, mock_admin_auth):
    """Verify administrator can successfully raise a support ticket on behalf of a user."""
    user = setup_test_data
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        payload = {
            "subject": "Missing Payment Record",
            "description": "Customer reported billing issues. Double checking stripe events.",
            "category": "Billing Issue",
        }

        res = await ac.post(f"/api/v1/admin/users/{user.id}/raise-ticket", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "ticket_id" in data

        # Check DB support ticket record exists
        stmt = select(SupportTicket).where(SupportTicket.user_id == user.id)
        r = await db.execute(stmt)
        ticket = r.scalar_one_or_none()
        assert ticket is not None
        assert ticket.subject == "Missing Payment Record"
        assert ticket.status == "open"
