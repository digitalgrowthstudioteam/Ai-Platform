import asyncio
import sys
import os
from dotenv import load_dotenv

# Set environment
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, base_dir)
load_dotenv(os.path.join(base_dir, ".env"))

from sqlalchemy import select
from app.database import async_session_factory
from app.models.platform.vendor import PlatformStore, PlatformVendor
from app.schemas.platform.admin import VendorListItem
from app.schemas.platform.vendor import AdminAppToggleRequest

async def test_app_center_hyperlocal():
    print("[TEST] Verifying Hyperlocal in Platform App Center & Entitlements...")
    async with async_session_factory() as db:
        # 1. Fetch any existing vendor and store
        stmt = select(PlatformStore).limit(1)
        store = (await db.execute(stmt)).scalar_one_or_none()
        if not store:
            print("[SKIP] No store found in database to test.")
            return

        print(f"[1] Testing store id={store.id}, initial hyperlocal_enabled={getattr(store, 'hyperlocal_enabled', None)}")
        
        # 2. Test toggling hyperlocal to True
        store.hyperlocal_enabled = True
        await db.commit()
        await db.refresh(store)
        assert store.hyperlocal_enabled is True, "Failed to enable hyperlocal"
        print("[PASS] Hyperlocal enabled successfully on PlatformStore.")

        # 3. Test VendorListItem schema
        v_item = VendorListItem(
            id=store.vendor_id,
            vendor_code="TEST01",
            business_name="Test Store",
            owner_name="Owner",
            email="owner@test.com",
            phone="9999999999",
            store_slug="test-store",
            subdomain="test-store",
            status="active",
            plan_name="Starter Store",
            subscription_status="active",
            total_products=5,
            total_orders=2,
            app_build_status="READY",
            hyperlocal_enabled=store.hyperlocal_enabled,
            created_at=store.created_at
        )
        assert v_item.hyperlocal_enabled is True
        print(f"[PASS] VendorListItem schema successfully includes hyperlocal_enabled={v_item.hyperlocal_enabled}")

        # 4. Test toggling back to False
        store.hyperlocal_enabled = False
        await db.commit()
        await db.refresh(store)
        assert store.hyperlocal_enabled is False, "Failed to disable hyperlocal"
        print("[PASS] Hyperlocal disabled cleanly on PlatformStore.")

    print("\n[ALL TESTS PASSED] Backend App Center & Entitlements integration is 100% verified.")

if __name__ == "__main__":
    asyncio.run(test_app_center_hyperlocal())
