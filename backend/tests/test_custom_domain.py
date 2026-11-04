import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from httpx import AsyncClient, ASGITransport
from app.main import app
from tests.conftest import test_sessionmaker
from app.services.platform_seeder import seed_platform_database
from app.models.platform.vendor import PlatformVendor, PlatformStore
from app.models.platform.subscription import PlatformAddon
from app.core.platform_auth import create_platform_access_token
from sqlalchemy import select


@pytest.mark.asyncio
async def test_custom_domain_lifecycle():
    # 1. Seed database
    async with test_sessionmaker() as db_session:
        await seed_platform_database(db_session)
        # Fetch ABC vendor and store
        stmt = select(PlatformVendor).where(PlatformVendor.vendor_code == "VND0001")
        vendor_abc = (await db_session.execute(stmt)).scalar_one_or_none()
        assert vendor_abc is not None

        # Fetch custom-domain addon
        addon_stmt = select(PlatformAddon).where(PlatformAddon.code == "custom-domain")
        addon = (await db_session.execute(addon_stmt)).scalar_one_or_none()
        assert addon is not None
        assert addon.price_inr == 999.0

        # Ensure custom_domain_enabled starts as False for testing
        store_stmt = select(PlatformStore).where(PlatformStore.vendor_id == vendor_abc.id)
        store_abc = (await db_session.execute(store_stmt)).scalar_one_or_none()
        store_abc.custom_domain_enabled = False
        store_abc.custom_domain = None
        await db_session.commit()

        # Fetch admin user
        from app.models.platform.vendor import PlatformUser
        admin_user = (await db_session.execute(select(PlatformUser).where(PlatformUser.role == "SUPER_ADMIN"))).scalars().first()
        admin_id = str(admin_user.id)
        admin_email = admin_user.email

        vendor_id = str(vendor_abc.id)
        addon_id = str(addon.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Vendor ABC Login
        login_res = await client.post("/api/v1/platform/auth/login", json={
            "email": "abcfashion@digitalgrowthstudio.in",
            "password": "Vendor@123",
        })
        assert login_res.status_code == 200
        vendor_token = login_res.json()["access_token"]
        v_headers = {"Authorization": f"Bearer {vendor_token}"}

        # 2. Vendor tries to set custom domain when locked -> 403 Forbidden
        try_set = await client.put("/api/v1/platform/vendor/store", json={
            "custom_domain": "abccollections.com"
        }, headers=v_headers)
        assert try_set.status_code == 403, "Should reject custom domain when add-on not purchased"

        # 3. Security Check: Mock/unverified signature must be REJECTED when Razorpay credentials exist
        bad_pay = await client.post("/api/v1/platform/payments/verify-addon-payment", json={
            "addon_id": addon_id,
            "razorpay_order_id": "order_mock_test_domain",
            "razorpay_payment_id": "pay_mock_test_domain_999",
            "razorpay_signature": "mock_sig_ok",
        }, headers=v_headers)
        assert bad_pay.status_code == 400, "Should reject unverified/mock signature when gateway keys exist"

        # Now test with valid Razorpay HMAC-SHA256 signature
        import hmac
        import hashlib
        from app.config import get_settings
        test_settings = get_settings()
        rzp_secret = test_settings.RAZORPAY_KEY_SECRET or "test_secret"
        valid_order_id = "order_rzp_test_domain_123"
        valid_pay_id = "pay_rzp_test_domain_456"
        valid_sig = hmac.new(rzp_secret.encode(), f"{valid_order_id}|{valid_pay_id}".encode(), hashlib.sha256).hexdigest()

        verify_pay = await client.post("/api/v1/platform/payments/verify-addon-payment", json={
            "addon_id": addon_id,
            "razorpay_order_id": valid_order_id,
            "razorpay_payment_id": valid_pay_id,
            "razorpay_signature": valid_sig,
        }, headers=v_headers)
        assert verify_pay.status_code == 200
        assert verify_pay.json()["success"] is True

        # 4. Now vendor sets custom domain -> succeeds with PENDING_DNS
        set_ok = await client.put("/api/v1/platform/vendor/store", json={
            "custom_domain": "abccollections.com"
        }, headers=v_headers)
        assert set_ok.status_code == 200
        store_data = set_ok.json()
        assert store_data["custom_domain"] == "abccollections.com"

        # 5. Verify DNS endpoint marks it ACTIVE
        verify_dns = await client.post("/api/v1/platform/vendor/custom-domain/verify", headers=v_headers)
        assert verify_dns.status_code == 200
        assert verify_dns.json()["status"] == "ACTIVE"

        # 6. Public Store resolves via custom domain "abccollections.com"
        store_pub = await client.get("/api/store/abccollections.com/config")
        assert store_pub.status_code == 200
        pub_data = store_pub.json()
        assert pub_data["custom_domain"] == "abccollections.com"
        assert pub_data["store_slug"] == "abc"

        # 7. Super Admin can grant or revoke access directly via Admin API
        admin_token = create_platform_access_token({
            "sub": admin_id,
            "email": admin_email,
            "role": "SUPER_ADMIN",
        })
        a_headers = {"Authorization": f"Bearer {admin_token}"}

        # Admin toggles access or updates custom domain
        admin_grant = await client.patch(
            f"/api/v1/platform/admin/vendors/{vendor_id}/custom-domain-access",
            json={
                "custom_domain_enabled": True,
                "custom_domain": "admin-approved-abc.com",
                "custom_domain_status": "ACTIVE",
            },
            headers=a_headers,
        )
        assert admin_grant.status_code == 200
        assert admin_grant.json()["custom_domain"] == "admin-approved-abc.com"

        # Test storefront resolution with admin-assigned domain
        store_pub_admin = await client.get("/api/store/admin-approved-abc.com/config")
        assert store_pub_admin.status_code == 200
        assert store_pub_admin.json()["store_slug"] == "abc"

        # 8. Super Admin revokes custom domain access
        admin_revoke = await client.patch(
            f"/api/v1/platform/admin/vendors/{vendor_id}/custom-domain-access",
            json={
                "custom_domain_enabled": False,
            },
            headers=a_headers,
        )
        assert admin_revoke.status_code == 200
        assert admin_revoke.json()["custom_domain_enabled"] is False

        # 9. Vendor custom domain info must now return custom_domain_enabled == False
        vendor_info = await client.get("/api/v1/platform/vendor/custom-domain", headers=v_headers)
        assert vendor_info.status_code == 200
        assert vendor_info.json()["custom_domain_enabled"] is False

        # 10. Public storefront lookup by custom domain must return 404 because access was revoked
        store_pub_revoked = await client.get("/api/store/admin-approved-abc.com/config")
        assert store_pub_revoked.status_code == 404
