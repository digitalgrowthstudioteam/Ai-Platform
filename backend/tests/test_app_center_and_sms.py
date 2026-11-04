import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.models.platform.vendor import PlatformUser
from app.services.platform_seeder import seed_platform_database
from app.core.platform_auth import create_platform_access_token


@pytest.mark.asyncio
async def test_app_center_toggle_and_sms_settings(db: AsyncSession):
    await seed_platform_database(db)
    admin_user = (await db.execute(select(PlatformUser).where(PlatformUser.role == "SUPER_ADMIN"))).scalars().first()
    vendor_user = (await db.execute(select(PlatformUser).where(PlatformUser.role == "VENDOR_ADMIN"))).scalars().first()
    assert admin_user is not None
    assert vendor_user is not None
    admin_token = create_platform_access_token({"sub": str(admin_user.id), "role": admin_user.role})
    vendor_token = create_platform_access_token({"sub": str(vendor_user.id), "role": vendor_user.role})

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    vendor_headers = {"Authorization": f"Bearer {vendor_token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch vendor list as admin
        v_res = await client.get("/api/v1/platform/admin/vendors", headers=admin_headers)
        assert v_res.status_code == 200
        vendors = v_res.json()
        assert len(vendors) > 0
        target_vendor = vendors[0]
        vendor_id = target_vendor["id"]

        # 2. Toggle Razorpay to True
        t_res = await client.post(
            f"/api/v1/platform/admin/vendors/{vendor_id}/toggle-app",
            headers=admin_headers,
            json={"app_code": "razorpay", "enabled": True},
        )
        assert t_res.status_code == 200
        assert t_res.json()["enabled"] is True
        assert t_res.json()["store"]["razorpay_enabled"] is True

        # 3. Toggle SMS Gateway to True
        sms_toggle_res = await client.post(
            f"/api/v1/platform/admin/vendors/{vendor_id}/toggle-app",
            headers=admin_headers,
            json={"app_code": "sms_gateway", "enabled": True},
        )
        assert sms_toggle_res.status_code == 200
        assert sms_toggle_res.json()["store"]["sms_gateway_enabled"] is True

        # 4. Vendor gets SMS settings
        sms_get = await client.get("/api/v1/platform/vendor/sms-settings", headers=vendor_headers)
        assert sms_get.status_code == 200
        assert sms_get.json()["sms_gateway_enabled"] is True

        # 5. Vendor updates SMS settings with custom URL (e.g. Way2SMS or generic gateway)
        sms_put = await client.put(
            "/api/v1/platform/vendor/sms-settings",
            headers=vendor_headers,
            json={
                "sms_provider": "CUSTOM_HTTP",
                "sms_api_key": "my_api_key_xyz",
                "sms_sender_id": "KCAARI",
                "sms_custom_url": "https://api.way2sms.com/send?apikey={api_key}&mobile={phone}&message={message}",
                "sms_order_placed_active": True,
                "sms_order_dispatched_active": True,
            },
        )
        assert sms_put.status_code == 200
        assert sms_put.json()["sms_provider"] == "CUSTOM_HTTP"
        assert sms_put.json()["sms_sender_id"] == "KCAARI"

        # 6. Deactivate SMS Gateway as Admin
        sms_deact = await client.post(
            f"/api/v1/platform/admin/vendors/{vendor_id}/toggle-app",
            headers=admin_headers,
            json={"app_code": "sms_gateway", "enabled": False},
        )
        assert sms_deact.status_code == 200
        assert sms_deact.json()["store"]["sms_gateway_enabled"] is False

        # 7. Vendor should now be strictly blocked with 403 Forbidden
        sms_blocked = await client.get("/api/v1/platform/vendor/sms-settings", headers=vendor_headers)
        assert sms_blocked.status_code == 403
