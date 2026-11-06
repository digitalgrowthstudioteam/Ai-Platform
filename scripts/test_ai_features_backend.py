"""
Backend Test Script: 1-Click AI Importer, AI Image Studio & Super Admin Credit Pricing
Tests all endpoints directly via FastAPI ASGI transport without opening any browser.
"""
import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import async_session_factory
from app.core.platform_auth import create_platform_access_token
from app.models.platform.vendor import PlatformVendor, PlatformUser
from sqlalchemy import select

async def run_tests():
    print("=" * 60)
    print("STARTING BACKEND TESTS: AI IMPORTER, STUDIO & CREDITS")
    print("=" * 60)

    # 1. Fetch vendor and super admin from database
    async with async_session_factory() as db:
        v_stmt = select(PlatformVendor).where(PlatformVendor.vendor_code == "VND0001")
        vendor = (await db.execute(v_stmt)).scalar_one_or_none()
        if not vendor:
            print("ERROR: Vendor VND0001 not found.")
            return

        u_stmt = select(PlatformUser).where(PlatformUser.id == vendor.user_id)
        vendor_user = (await db.execute(u_stmt)).scalar_one_or_none()

        admin_stmt = select(PlatformUser).where(PlatformUser.role == "SUPER_ADMIN")
        admin_user = (await db.execute(admin_stmt)).scalars().first()

    vendor_token = create_platform_access_token({
        "sub": str(vendor_user.id),
        "email": vendor_user.email,
        "role": vendor_user.role,
        "vendor_id": str(vendor.id)
    })
    admin_token = create_platform_access_token({
        "sub": str(admin_user.id),
        "email": admin_user.email,
        "role": admin_user.role,
        "vendor_id": None
    })

    v_headers = {"Authorization": f"Bearer {vendor_token}"}
    a_headers = {"Authorization": f"Bearer {admin_token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # TEST 1: Super Admin Credit Config GET
        print("\n[TEST 1] GET /api/v1/platform/admin/credits/config")
        res = await client.get("/api/v1/platform/admin/credits/config", headers=a_headers)
        assert res.status_code == 200, f"Failed: {res.text}"
        config = res.json()
        print("  Config retrieved:", config.get("welcome_credits"), "welcome credits,", len(config.get("credit_packs", [])), "packs")

        # TEST 2: Super Admin updates pricing configuration
        print("\n[TEST 2] PUT /api/v1/platform/admin/credits/config (Super Admin setting prices)")
        update_payload = {
            "welcome_credits": 10,
            "import_product_credit_cost": 1,
            "image_studio_credit_cost": 2,
            "credit_packs": [
                {"id": "pack_starter", "name": "Starter Pack", "credits": 30, "price_inr": 119.0, "popular": False, "active": True},
                {"id": "pack_growth", "name": "Growth Pro Pack", "credits": 100, "price_inr": 299.0, "popular": True, "active": True},
                {"id": "pack_scale", "name": "Enterprise Scale Pack", "credits": 500, "price_inr": 999.0, "popular": False, "active": True}
            ]
        }
        res = await client.put("/api/v1/platform/admin/credits/config", json=update_payload, headers=a_headers)
        assert res.status_code == 200, f"Failed: {res.text}"
        updated_cfg = res.json()
        assert updated_cfg["welcome_credits"] == 10
        assert len(updated_cfg["credit_packs"]) == 3
        print("  Pricing updated successfully! Packs:", [f"{p['name']}: ₹{p['price_inr']} ({p['credits']} cr)" for p in updated_cfg["credit_packs"]])

        # TEST 3: Vendor retrieves credit balance & active packs
        print("\n[TEST 3] GET /api/v1/platform/vendor/ai/credits")
        res = await client.get("/api/v1/platform/vendor/ai/credits", headers=v_headers)
        assert res.status_code == 200, f"Failed: {res.text}"
        cred_data = res.json()
        initial_credits = cred_data["credits"]
        print(f"  Current Vendor Balance: {initial_credits} Credits")
        assert len(cred_data["credit_packs"]) == 3

        # TEST 4: Vendor calls 1-Click AI Import Preview
        print("\n[TEST 4] POST /api/v1/platform/vendor/ai/import-preview")
        preview_payload = {
            "url": "https://www.amazon.in/dp/B08L5WHFT9"
        }
        res = await client.post("/api/v1/platform/vendor/ai/import-preview", json=preview_payload, headers=v_headers)
        assert res.status_code == 200, f"Failed: {res.text}"
        preview = res.json()
        print(f"  Extracted Title: {preview['title'][:60]}...")
        print(f"  Category: {preview['category']}, Price: ₹{preview['selling_price']}, Images: {len(preview['images'])}")

        # TEST 5: Vendor confirms import (deducts 1 credit)
        print("\n[TEST 5] POST /api/v1/platform/vendor/ai/import-confirm")
        confirm_payload = {
            "source_url": preview["source_url"],
            "title": preview["title"],
            "category_name": preview["category"] or "Electronics",
            "description_html": preview["description_html"],
            "short_description": preview["short_description"],
            "selling_price": preview["selling_price"] or 999.0,
            "mrp": preview["mrp"] or 1499.0,
            "images": preview.get("images", [])[:3],
            "variants": preview.get("variants", [])
        }
        res = await client.post("/api/v1/platform/vendor/ai/import-confirm", json=confirm_payload, headers=v_headers)
        assert res.status_code == 200, f"Failed: {res.text}"
        confirm_res = res.json()
        print(f"  Product Created ID: {confirm_res['product_id']}")
        print(f"  Credits Used: {confirm_res['credits_used']}, Remaining: {confirm_res['remaining_credits']}")
        assert confirm_res["remaining_credits"] == initial_credits - 1

        # TEST 6: Phase 2 AI Image Studio (deducts 2 credits)
        print("\n[TEST 6] POST /api/v1/platform/vendor/ai/image-studio (Phase 2 Studio Redesign)")
        studio_payload = {
            "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
            "style": "minimal-marble",
            "product_id": confirm_res["product_id"]
        }
        res = await client.post("/api/v1/platform/vendor/ai/image-studio", json=studio_payload, headers=v_headers)
        assert res.status_code == 200, f"Failed: {res.text}"
        studio_res = res.json()
        print(f"  Studio Redesign Style: {studio_res['style']}")
        print(f"  Canvas Dimensions: {studio_res['width']}x{studio_res['height']}")
        print(f"  Credits Used: {studio_res['credits_used']}, Remaining: {studio_res['remaining_credits']}")
        assert studio_res["remaining_credits"] == initial_credits - 3

        # TEST 7: Super Admin Grants Credits
        print("\n[TEST 7] POST /api/v1/platform/admin/credits/grant (Admin manually adds 50 credits)")
        grant_payload = {
            "vendor_id": str(vendor.id),
            "amount": 50,
            "reason": "Merchant loyalty onboarding reward"
        }
        res = await client.post("/api/v1/platform/admin/credits/grant", json=grant_payload, headers=a_headers)
        assert res.status_code == 200, f"Failed: {res.text}"
        grant_res = res.json()
        print(f"  Admin Grant Success! New Balance: {grant_res['new_balance']} Credits")

        # TEST 8: Vendor Purchases Credit Pack via Razorpay
        print("\n[TEST 8] Vendor Credit Pack Purchase Order & Verification")
        order_res = await client.post(
            "/api/v1/platform/vendor/ai/credits/purchase-order",
            json={"pack_id": "pack_growth"},
            headers=v_headers
        )
        assert order_res.status_code == 200, f"Failed: {order_res.text}"
        order_data = order_res.json()
        print(f"  Created Razorpay Order: {order_data['order_id']}, Amount: ₹{order_data['amount_inr']}")

        verify_res = await client.post(
            "/api/v1/platform/vendor/ai/credits/verify-payment",
            json={
                "razorpay_order_id": order_data["order_id"],
                "razorpay_payment_id": f"pay_mock_{uuid.uuid4().hex[:10]}",
                "razorpay_signature": "mock_signature_test",
                "pack_id": "pack_growth"
            },
            headers=v_headers
        )
        assert verify_res.status_code == 200, f"Failed: {verify_res.text}"
        verify_data = verify_res.json()
        print(f"  Payment Verified! Added: {verify_data['credits_added']} credits. Final Balance: {verify_data['new_balance']} credits.")

        print("\n" + "=" * 60)
        print("ALL 8 BACKEND TESTS PASSED FLAWLESSLY!")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_tests())
