import pytest
from httpx import AsyncClient, ASGITransport
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from app.main import app
from app.database import get_db
from app.models.platform.vendor import PlatformUser, PlatformVendor, PlatformVendorProfile, PlatformStore
from app.models.platform.subscription import PlatformCoupon, PlatformAddon, PlatformVendorAddon, PlatformPayment
from app.core.platform_auth import hash_password, create_platform_access_token


@pytest.mark.asyncio
async def test_addon_specific_promo_code_flow(db):
    now = datetime.now(timezone.utc)

    # 1. Setup Super Admin
    admin_user = PlatformUser(
        id=uuid.uuid4(),
        email=f"admin_{uuid.uuid4().hex[:6]}@digitalgrowthstudio.in",
        name="Super Admin",
        hashed_password=hash_password("AdminPass123!"),
        role="SUPER_ADMIN",
        status="active",
    )
    db.add(admin_user)

    # 2. Setup Vendor A and Vendor B
    vendor_a_user = PlatformUser(
        id=uuid.uuid4(),
        email=f"vendor_a_{uuid.uuid4().hex[:6]}@example.com",
        name="Boutique Owner A",
        hashed_password=hash_password("VendorPass123!"),
        role="VENDOR_ADMIN",
        status="active",
    )
    db.add(vendor_a_user)
    await db.flush()

    vendor_a = PlatformVendor(
        id=uuid.uuid4(),
        vendor_code=f"VND_{uuid.uuid4().hex[:6]}",
        user_id=vendor_a_user.id,
        status="active",
    )
    db.add(vendor_a)
    await db.flush()

    profile_a = PlatformVendorProfile(
        id=uuid.uuid4(),
        vendor_id=vendor_a.id,
        business_name="Boutique A",
        owner_name="Boutique Owner A",
        email=vendor_a_user.email,
        phone="9876543210",
        category="Fashion",
    )
    db.add(profile_a)

    store_a = PlatformStore(
        id=uuid.uuid4(),
        vendor_id=vendor_a.id,
        store_name="Boutique A Store",
        subdomain="boutique-a.digitalgrowthstudio.in",
        store_slug="boutique-a",
        custom_domain_enabled=False,
    )
    db.add(store_a)

    # 3. Create Addons: Custom Domain (₹999) and Storage (₹299)
    addon_domain = PlatformAddon(
        id=uuid.uuid4(),
        name="Custom Domain Setup",
        code="custom-domain",
        price_inr=999.0,
        billing_type="ONE_TIME",
        is_active=True,
    )
    addon_storage = PlatformAddon(
        id=uuid.uuid4(),
        name="Additional 5GB Storage",
        code="storage-5gb",
        price_inr=299.0,
        billing_type="MONTHLY",
        is_active=True,
    )
    db.add(addon_domain)
    db.add(addon_storage)
    await db.commit()

    admin_token = create_platform_access_token({"sub": str(admin_user.id), "role": "SUPER_ADMIN"})
    vendor_a_token = create_platform_access_token({"sub": str(vendor_a_user.id), "role": "VENDOR_ADMIN"})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Step A: Admin creates a promo code specifically for Custom Domain with one_time_per_vendor=True
        coupon_code = f"DOMAINFREE_{uuid.uuid4().hex[:6].upper()}"
        res_create = await ac.post(
            "/api/v1/platform/admin/coupons",
            json={
                "code": coupon_code,
                "discount_type": "FIXED_INR",
                "discount_value": 999.0,
                "applicable_to": "ADDON",
                "addon_id": str(addon_domain.id),
                "max_uses": 50,
                "valid_days": 30,
                "one_time_per_vendor": True,
            },
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_create.status_code == 201
        created_coupon = res_create.json()
        assert created_coupon["code"] == coupon_code
        assert created_coupon["addon_id"] == str(addon_domain.id)
        assert created_coupon["one_time_per_vendor"] is True

        # Step B: Vendor validates coupon for Storage Add-on -> MUST BE REJECTED
        res_val_wrong = await ac.post(
            "/api/v1/platform/payments/validate-addon-coupon",
            json={
                "addon_id": str(addon_storage.id),
                "coupon_code": coupon_code,
            },
            headers={"Authorization": f"Bearer {vendor_a_token}"},
        )
        assert res_val_wrong.status_code == 400
        assert "only valid for a specific service" in res_val_wrong.json()["detail"]

        # Step C: Vendor validates coupon for Custom Domain Add-on -> SUCCESS (100% Free)
        res_val_right = await ac.post(
            "/api/v1/platform/payments/validate-addon-coupon",
            json={
                "addon_id": str(addon_domain.id),
                "coupon_code": coupon_code,
            },
            headers={"Authorization": f"Bearer {vendor_a_token}"},
        )
        assert res_val_right.status_code == 200
        val_data = res_val_right.json()
        assert val_data["valid"] is True
        assert val_data["is_free"] is True
        assert val_data["final_price_inr"] == 0.0

        # Step D: Vendor redeems coupon to unlock Custom Domain directly (₹0 Free)
        res_order = await ac.post(
            "/api/v1/platform/payments/create-addon-order",
            json={
                "addon_id": str(addon_domain.id),
                "coupon_code": coupon_code,
            },
            headers={"Authorization": f"Bearer {vendor_a_token}"},
        )
        assert res_order.status_code == 200
        order_data = res_order.json()
        assert order_data["is_free"] is True
        assert order_data["amount"] == 0

        # Verify entitlement via API: custom_domain_enabled MUST BE TRUE
        res_info = await ac.get(
            "/api/v1/platform/vendor/custom-domain",
            headers={"Authorization": f"Bearer {vendor_a_token}"},
        )
        assert res_info.status_code == 200
        assert res_info.json()["custom_domain_enabled"] is True

        # Step E: Vendor tries to use the one-time coupon a second time -> MUST BE REJECTED
        res_repeat = await ac.post(
            "/api/v1/platform/payments/validate-addon-coupon",
            json={
                "addon_id": str(addon_domain.id),
                "coupon_code": coupon_code,
            },
            headers={"Authorization": f"Bearer {vendor_a_token}"},
        )
        assert res_repeat.status_code == 400
        assert "already redeemed this coupon code once" in res_repeat.json()["detail"]

