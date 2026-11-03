"""
Digital Growth Studio — Vendor Analytics & Tracking Pixels Backend Tests
Tests pixel settings (Meta Pixel, GA4, GTM), public storefront event ingestion,
and multi-dimensional analytics calculation.
"""
import pytest
import uuid
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models.platform.vendor import (
    PlatformVendor,
    PlatformVendorProfile,
    PlatformStore,
    PlatformStoreEvent,
    PlatformUser,
)
from app.core.platform_auth import require_vendor_admin, CurrentVendor


@pytest.fixture
async def setup_test_vendor(db: AsyncSession):
    """Seed test vendor, user, profile and store in database."""
    # Check if user already exists
    res_user = await db.execute(select(PlatformUser).where(PlatformUser.email == "testvendor@example.com"))
    user = res_user.scalars().first()
    if not user:
        user = PlatformUser(
            email="testvendor@example.com",
            hashed_password="mockhashedpassword123",
            name="Test Vendor Owner",
            role="VENDOR_ADMIN",
            status="active",
        )
        db.add(user)
        await db.flush()

        vendor = PlatformVendor(
            vendor_code="VND9999",
            user_id=user.id,
            status="active",
        )
        db.add(vendor)
        await db.flush()

        profile = PlatformVendorProfile(
            vendor_id=vendor.id,
            business_name="Test Pixel Boutique",
            owner_name="Test Vendor Owner",
            email="testvendor@example.com",
            phone="+919876543210",
            category="Fashion & Apparel",
        )
        db.add(profile)

        store = PlatformStore(
            vendor_id=vendor.id,
            store_name="Test Pixel Store",
            store_slug="test-pixel-store",
            subdomain="test-pixel-store",
            status="active",
            meta_pixel_id="998877665544332",
            ga4_id="G-TEST12345",
            gtm_id="GTM-TEST999",
            tracking_enabled=True,
        )
        db.add(store)
        await db.commit()
    else:
        res_v = await db.execute(select(PlatformVendor).where(PlatformVendor.user_id == user.id))
        vendor = res_v.scalars().first()
        res_s = await db.execute(select(PlatformStore).where(PlatformStore.vendor_id == vendor.id))
        store = res_s.scalars().first()

    return {"vendor": vendor, "store": store, "user": user}


@pytest.mark.asyncio
async def test_public_store_config_includes_pixels(setup_test_vendor):
    """Test GET /api/store/{slug}/config returns pixel IDs."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/store/test-pixel-store/config")
        assert resp.status_code == 200
        data = resp.json()
        assert data["store_slug"] == "test-pixel-store"
        assert data["meta_pixel_id"] == "998877665544332"
        assert data["ga4_id"] == "G-TEST12345"
        assert data["gtm_id"] == "GTM-TEST999"
        assert data["tracking_enabled"] is True


@pytest.mark.asyncio
async def test_public_store_event_ingestion(setup_test_vendor, db: AsyncSession):
    """Test POST /api/store/{slug}/events logs customer actions."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. PageView
        r1 = await client.post("/api/store/test-pixel-store/events", json={
            "event_type": "page_view",
            "source": "instagram",
            "device": "mobile",
        })
        assert r1.status_code == 200
        assert r1.json()["success"] is True

        # 2. Add to Cart
        r2 = await client.post("/api/store/test-pixel-store/events", json={
            "event_type": "add_to_cart",
            "product_name": "Silk Saree",
            "value": 4500,
            "source": "whatsapp",
            "device": "mobile",
        })
        assert r2.status_code == 200

        # 3. WhatsApp click
        r3 = await client.post("/api/store/test-pixel-store/events", json={
            "event_type": "whatsapp_click",
            "product_name": "Bridal Blouse",
            "value": 6500,
            "source": "meta",
            "device": "mobile",
        })
        assert r3.status_code == 200


@pytest.mark.asyncio
async def test_vendor_pixels_crud(setup_test_vendor):
    """Test GET and PUT /api/v1/platform/vendor/pixels."""
    vendor_data = setup_test_vendor
    vendor = vendor_data["vendor"]
    user = vendor_data["user"]

    # Mock require_vendor_admin
    app.dependency_overrides[require_vendor_admin] = lambda: CurrentVendor(user=user, vendor=vendor)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # GET
        get_res = await client.get("/api/v1/platform/vendor/pixels")
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["meta_pixel_id"] == "998877665544332"

        # PUT: Update pixels
        put_res = await client.put("/api/v1/platform/vendor/pixels", json={
            "meta_pixel_id": "112233445566778",
            "gtm_id": "GTM-UPDATED1",
            "ga4_id": "G-UPDATED2",
            "tracking_enabled": True,
        })
        assert put_res.status_code == 200
        updated = put_res.json()
        assert updated["meta_pixel_id"] == "112233445566778"
        assert updated["gtm_id"] == "GTM-UPDATED1"
        assert updated["ga4_id"] == "G-UPDATED2"

    app.dependency_overrides.pop(require_vendor_admin, None)


@pytest.mark.asyncio
async def test_vendor_analytics_summary(setup_test_vendor):
    """Test GET /api/v1/platform/vendor/analytics returns comprehensive metrics."""
    vendor_data = setup_test_vendor
    vendor = vendor_data["vendor"]
    user = vendor_data["user"]

    app.dependency_overrides[require_vendor_admin] = lambda: CurrentVendor(user=user, vendor=vendor)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/platform/vendor/analytics?date_range=30d")
        assert res.status_code == 200
        data = res.json()
        assert "gross_revenue" in data
        assert "conversion_rate" in data
        assert "funnel_steps" in data
        assert len(data["funnel_steps"]) >= 4
        assert "traffic_sources" in data
        assert "device_breakdown" in data
        assert "pixel_status" in data

    app.dependency_overrides.pop(require_vendor_admin, None)


@pytest.mark.asyncio
async def test_admin_detailed_analytics(setup_test_vendor):
    """Test GET /api/v1/platform/admin/analytics returns platform leaderboards, totals, and catalog stats."""
    from app.core.platform_auth import require_super_admin

    admin_user = PlatformUser(
        id=uuid.uuid4(),
        email="superadmin@dgs.com",
        name="Super Admin",
        role="SUPER_ADMIN",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    app.dependency_overrides[require_super_admin] = lambda: admin_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/platform/admin/analytics?date_range=30d")
        assert res.status_code == 200
        data = res.json()
        assert "total_vendors" in data
        assert data["total_vendors"] >= 1
        assert "vendor_leaderboard" in data
        assert isinstance(data["vendor_leaderboard"], list)
        assert len(data["vendor_leaderboard"]) >= 1
        assert "top_selling_products" in data
        assert "category_distribution" in data
        assert "growth_trend" in data
        assert len(data["growth_trend"]) == 6
        assert "meta_pixels_connected" in data
        assert "total_tracking_events_logged" in data

    app.dependency_overrides.pop(require_super_admin, None)

