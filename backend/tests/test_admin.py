"""
Digital Growth Studio — Admin Panel Integration Tests
"""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.dependencies import get_current_user
from app.models.user import User

# Mock Admin user claims
ADMIN_CLAIMS = {
    "uid": "mock_firebase_uid_admin_123",
    "email": "flasshgames2026@gmail.com",  # Matches Admin owner email rules
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
    """Mock get_current_user dependency as Admin."""
    app.dependency_overrides[get_current_user] = lambda: ADMIN_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def mock_standard_auth():
    """Mock get_current_user dependency as Standard User."""
    app.dependency_overrides[get_current_user] = lambda: STANDARD_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
async def setup_admin_test_data(db: AsyncSession):
    """
    Seeds a standard test user in database.
    """
    # 0. Clean up existing test records if any
    await db.execute(delete(User).where(User.email.in_([ADMIN_CLAIMS["email"], STANDARD_CLAIMS["email"]])))
    await db.commit()

    # 1. Seed standard target user
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

    yield {
        "target_user": std_user,
    }

    # Cleanup
    await db.delete(std_user)
    await db.commit()


@pytest.mark.asyncio
async def test_admin_authorization_guard(mock_standard_auth, setup_admin_test_data):
    """
    Verify standard user query to Admin endpoints returns 403 Forbidden.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Standard user query
        response = await client.get("/api/v1/admin/stats")
        assert response.status_code == 403
        assert "Admin authorization required" in response.json()["detail"]


@pytest.mark.asyncio
async def test_admin_stats_query_success(mock_admin_auth, setup_admin_test_data):
    """
    Verify admin user query to Admin stats returns 200 and platform counts.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/admin/stats")
        assert response.status_code == 200
        stats = response.json()
        assert stats["total_users"] >= 1
        assert "plan_distribution" in stats


@pytest.mark.asyncio
async def test_admin_plan_override(mock_admin_auth, setup_admin_test_data, db: AsyncSession):
    """
    Verify admin plan overrides update user record plan values.
    """
    data = setup_admin_test_data
    target_user = data["target_user"]
    user_id = target_user.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/admin/users/{user_id}/plan",
            json={"plan_id": "growth"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify DB changes
        db.expire_all()
        stmt = select(User).where(User.id == user_id)
        db_res = await db.execute(stmt)
        updated_user = db_res.scalar_one()
        assert updated_user.plan_id == "growth"


@pytest.mark.asyncio
async def test_admin_user_suspension_override(mock_admin_auth, setup_admin_test_data, db: AsyncSession):
    """
    Verify admin suspension changes user record status to suspended.
    """
    data = setup_admin_test_data
    target_user = data["target_user"]
    user_id = target_user.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/admin/users/{user_id}/status",
            json={"status": "suspended"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify DB changes
        db.expire_all()
        stmt = select(User).where(User.id == user_id)
        db_res = await db.execute(stmt)
        updated_user = db_res.scalar_one()
        assert updated_user.status == "suspended"
