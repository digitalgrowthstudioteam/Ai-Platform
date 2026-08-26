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


@pytest.mark.asyncio
async def test_admin_ad_packs_and_service_requests_override(mock_admin_auth, setup_admin_test_data, db: AsyncSession):
    from app.models.ads_service import AdPack, MetaAdServiceRequest
    data = setup_admin_test_data
    target_user = data["target_user"]
    user_id = target_user.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Add Ad Pack
        ad_pack_payload = {
            "pack_type": "pack_15",
            "total_ad_credits": 15,
            "used_ad_credits": 0,
            "remaining_ad_credits": 15,
            "expires_at_days": 60,
            "price_paid": 748500,
        }
        res_pack = await client.post(
            f"/api/v1/admin/users/{user_id}/ad-packs",
            json=ad_pack_payload
        )
        assert res_pack.status_code == 200
        assert res_pack.json()["status"] == "success"

        # Verify pack created in DB
        db.expire_all()
        stmt = select(AdPack).where(AdPack.user_id == user_id)
        res_db = await db.execute(stmt)
        pack = res_db.scalar_one()
        assert pack.pack_type == "pack_15"
        assert pack.total_ad_credits == 15
        assert pack.remaining_ad_credits == 15

        # 2. Create ad onboarding request in DB first (so admin can edit/delete it)
        req_obj = MetaAdServiceRequest(
            user_id=user_id,
            full_name="John Doe",
            business_name="JD Store",
            email="john@jd.com",
            whatsapp_number="1234567890",
            website="http://jd.com",
            business_location="Mumbai",
            industry="Retail",
            industry_other="",
            business_description="Retail selling",
            advertised_product="Soap",
            campaign_objective="Sales",
            daily_budget="₹500/day",
            number_of_ads=3,
            creative_required=True,
            additional_services=["pixel_setup"],
            status="submitted",
        )
        db.add(req_obj)
        await db.commit()
        await db.refresh(req_obj)
        req_id = req_obj.id

        # 3. Override request status and services
        override_payload = {
            "status": "campaign_live",
            "additional_services": ["pixel_setup", "conversions_api"],
        }
        res_override = await client.post(
            f"/api/v1/admin/users/{user_id}/ad-service-requests/{req_id}",
            json=override_payload
        )
        assert res_override.status_code == 200
        assert res_override.json()["status"] == "success"

        # Verify DB changes
        db.expire(req_obj)
        stmt_req = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == req_id)
        res_req_db = await db.execute(stmt_req)
        updated_req = res_req_db.scalar_one()
        assert updated_req.status == "campaign_live"
        assert "conversions_api" in updated_req.additional_services

        # 4. Check user details payload contains these new tables
        res_details = await client.get(f"/api/v1/admin/users/{user_id}/details")
        assert res_details.status_code == 200
        details = res_details.json()
        assert "ad_packs" in details
        assert "ad_service_requests" in details
        assert len(details["ad_packs"]) == 1
        assert len(details["ad_service_requests"]) == 1

        # 5. Delete ad onboarding request
        res_del = await client.delete(f"/api/v1/admin/users/{user_id}/ad-service-requests/{req_id}")
        assert res_del.status_code == 200
        assert res_del.json()["status"] == "success"

        stmt_del = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == req_id)
        res_del_db = await db.execute(stmt_del)
        assert res_del_db.scalar_one_or_none() is None

        # Cleanup created AdPack
        await db.delete(pack)
        await db.commit()


@pytest.mark.asyncio
async def test_admin_delete_user_success(mock_admin_auth, setup_admin_test_data, db: AsyncSession):
    """
    Verify that an admin can delete a user permanently.
    """
    user_id = setup_admin_test_data["target_user"].id
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Delete user
        response = await client.delete(f"/api/v1/admin/users/{user_id}")
        assert response.status_code == 200
        assert response.json()["status"] == "success"

        # Verify database user is deleted
        stmt = select(User).where(User.id == user_id)
        res = await db.execute(stmt)
        assert res.scalar_one_or_none() is None
