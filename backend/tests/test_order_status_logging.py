"""
Digital Growth Studio — Individual Order Status Updates and Logging Tests
"""
import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.main import app
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ads_service import MetaAdServiceRequest, AdPack
from tests.test_admin import ADMIN_CLAIMS, STANDARD_CLAIMS

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
    # Cleanup previous records
    await db.execute(delete(AdPack))
    await db.execute(delete(MetaAdServiceRequest))
    await db.execute(delete(User).where(User.email.in_([ADMIN_CLAIMS["email"], STANDARD_CLAIMS["email"]])))
    await db.commit()

    # Create users
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

    # Create a manual AdPack
    manual_pack = AdPack(
        user_id=std_user.id,
        pack_type="manual_pack",
        total_ad_credits=2,
        used_ad_credits=0,
        remaining_ad_credits=2,
        price_paid=0,
        purchased_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=30),
        status="active",
        order_statuses={}
    )
    db.add(manual_pack)

    # Create a Service Request
    service_req = MetaAdServiceRequest(
        user_id=std_user.id,
        full_name="Suvarna Kharat",
        business_name="Suvarna Business",
        email=std_user.email,
        whatsapp_number="1234567890",
        business_location="India",
        industry="Retail",
        advertised_product="Ad Campaign",
        campaign_objective="Leads",
        daily_budget="1000",
        number_of_ads=2,
        creative_required=False,
        status="whatsapp_pending",
    )
    db.add(service_req)
    await db.commit()
    await db.refresh(service_req)

    # Create an AdPack associated with service request
    request_pack = AdPack(
        user_id=std_user.id,
        service_request_id=service_req.id,
        pack_type="pack_2",
        total_ad_credits=2,
        used_ad_credits=0,
        remaining_ad_credits=2,
        price_paid=0,
        purchased_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=30),
        status="active",
        order_statuses={}
    )
    db.add(request_pack)
    await db.commit()

    yield {
        "user": std_user,
        "manual_pack": manual_pack,
        "service_request": service_req,
        "request_pack": request_pack,
    }

    # Cleanup
    await db.execute(delete(AdPack))
    await db.execute(delete(MetaAdServiceRequest))
    await db.delete(std_user)
    await db.commit()

@pytest.mark.asyncio
async def test_admin_update_order_status_auth(mock_standard_auth, setup_test_data, db: AsyncSession):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        from app.api.v1.ads_service import get_custom_id_for_pack
        custom_id = await get_custom_id_for_pack(setup_test_data['manual_pack'], db)
        order_id = f"{custom_id}-ad-1"
        response = await client.post(
            f"/api/v1/ads-service/admin/orders/{order_id}/status",
            json={"status": "ready_for_setup", "comment": "Checking authorization"}
        )
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

@pytest.mark.asyncio
async def test_admin_update_order_status_manual_pack(mock_admin_auth, setup_test_data, db: AsyncSession):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        from app.api.v1.ads_service import get_custom_id_for_pack
        custom_id = await get_custom_id_for_pack(setup_test_data['manual_pack'], db)
        order_id = f"{custom_id}-ad-1"
        
        # 1. Update status to ready_for_setup
        response = await client.post(
            f"/api/v1/ads-service/admin/orders/{order_id}/status",
            json={"status": "ready_for_setup", "comment": "Ready to launch"}
        )
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["order_status"] == "ready_for_setup"
        assert res_data["comment"] == "Ready to launch"
        assert len(res_data["history"]) == 1
        assert res_data["history"][0]["status"] == "ready_for_setup"
        assert res_data["history"][0]["comment"] == "Ready to launch"
        assert res_data["history"][0]["updated_by"] == ADMIN_CLAIMS["email"]

        # Fetch from DB, refresh and verify
        db_pack = await db.get(AdPack, setup_test_data["manual_pack"].id)
        await db.refresh(db_pack)
        assert db_pack.order_statuses[order_id]["status"] == "ready_for_setup"
        assert db_pack.used_ad_credits == 0
        assert db_pack.remaining_ad_credits == 2

        # 2. Update status to completed (should consume credit)
        response = await client.post(
            f"/api/v1/ads-service/admin/orders/{order_id}/status",
            json={"status": "completed", "comment": "Ad delivered successfully"}
        )
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["order_status"] == "completed"
        assert len(res_data["history"]) == 2

        # Verify credit consumption
        await db.refresh(db_pack)
        assert db_pack.used_ad_credits == 1
        assert db_pack.remaining_ad_credits == 1

        # 3. Revert status back (should credit back)
        response = await client.post(
            f"/api/v1/ads-service/admin/orders/{order_id}/status",
            json={"status": "whatsapp_pending", "comment": "Client requested change"}
        )
        assert response.status_code == 200
        
        await db.refresh(db_pack)
        assert db_pack.used_ad_credits == 0
        assert db_pack.remaining_ad_credits == 2

@pytest.mark.asyncio
async def test_admin_update_order_status_request_pack(mock_admin_auth, setup_test_data, db: AsyncSession):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        from app.api.v1.ads_service import get_custom_id_for_request
        custom_id = await get_custom_id_for_request(setup_test_data["service_request"], db)
        order_id = f"{custom_id}-ad-1"
        
        response = await client.post(
            f"/api/v1/ads-service/admin/orders/{order_id}/status",
            json={"status": "ads_initiated", "comment": "Ad initiated"}
        )
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["order_status"] == "ads_initiated"

        # Check in orders listing as standard user
        app.dependency_overrides[get_current_user] = lambda: STANDARD_CLAIMS
        get_orders_resp = await client.get("/api/v1/ads-service/orders")
        assert get_orders_resp.status_code == 200
        orders_list = get_orders_resp.json()["orders"]
        matched_order = next((o for o in orders_list if o["id"] == order_id), None)
        assert matched_order is not None
        assert matched_order["status"] == "ads_initiated"
        assert matched_order["comment"] == "Ad initiated"
        assert len(matched_order["history"]) == 1
        
        # Cleanup override
        app.dependency_overrides.pop(get_current_user, None)
