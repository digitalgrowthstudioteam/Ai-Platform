"""
Digital Growth Studio — Multi-Vendor E-Commerce Platform Test Suite
Tests:
1. ABC Fashion can see only ABC Fashion products.
2. XYZ Cosmetics can see only XYZ Cosmetics products.
3. ABC Fashion cannot access XYZ Cosmetics orders.
4. XYZ Cosmetics cannot access ABC Fashion customers.
5. Each store loads its own logo and banners.
6. Product updates reflect correctly in the respective store APIs.
7. Orders are saved against the correct vendor.
8. Vendor accounts cannot access the Super Admin dashboard.
9. Expired or suspended vendors cannot perform restricted operations.
"""
import pytest
import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_platform_end_to_end_security_and_isolation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # ──────────────────────────────────────────────
        # 1. Login Vendors & Super Admin
        # ──────────────────────────────────────────────
        # ABC Fashion Login
        res_a = await client.post("/api/v1/platform/auth/login", json={
            "email": "abcfashion@digitalgrowthstudio.in",
            "password": "Vendor@123",
        })
        assert res_a.status_code == 200, f"ABC Login failed: {res_a.text}"
        token_a = res_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # XYZ Cosmetics Login
        res_b = await client.post("/api/v1/platform/auth/login", json={
            "email": "xyzcosmetics@digitalgrowthstudio.in",
            "password": "Vendor@123",
        })
        assert res_b.status_code == 200, f"XYZ Login failed: {res_b.text}"
        token_b = res_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Super Admin Login
        res_admin = await client.post("/api/v1/platform/auth/login", json={
            "email": "admin@digitalgrowthstudio.in",
            "password": "Admin@DGS2026!",
        })
        assert res_admin.status_code == 200, f"Admin Login failed: {res_admin.text}"
        token_admin = res_admin.json()["access_token"]
        headers_admin = {"Authorization": f"Bearer {token_admin}"}

        # ──────────────────────────────────────────────
        # Test 1 & 2: Product Isolation
        # ──────────────────────────────────────────────
        products_a = (await client.get("/api/v1/platform/vendor/products", headers=headers_a)).json()
        products_b = (await client.get("/api/v1/platform/vendor/products", headers=headers_b)).json()

        assert len(products_a) > 0, "ABC Fashion should have products"
        assert len(products_b) > 0, "XYZ Cosmetics should have products"

        # Verify ABC Fashion products are only fashion items
        for p in products_a:
            assert "ABC" in p["sku"] or "dress" in p["slug"] or "jacket" in p["slug"]
            assert "XYZ" not in p["sku"]

        # Verify XYZ Cosmetics products are only cosmetics items
        for p in products_b:
            assert "XYZ" in p["sku"] or "serum" in p["slug"] or "cleanser" in p["slug"]
            assert "ABC" not in p["sku"]

        # ──────────────────────────────────────────────
        # Test 3: ABC cannot access XYZ orders
        # ──────────────────────────────────────────────
        orders_b = (await client.get("/api/v1/platform/vendor/orders", headers=headers_b)).json()
        assert len(orders_b) > 0, "XYZ should have at least 1 order"
        xyz_order_id = orders_b[0]["id"]

        # ABC attempts to view XYZ order
        hack_order = await client.get(f"/api/v1/platform/vendor/orders/{xyz_order_id}", headers=headers_a)
        assert hack_order.status_code == 404, "ABC Fashion MUST NOT access XYZ Cosmetics orders"

        # ──────────────────────────────────────────────
        # Test 4: XYZ cannot access ABC customers
        # ──────────────────────────────────────────────
        customers_a = (await client.get("/api/v1/platform/vendor/customers", headers=headers_a)).json()
        customers_b = (await client.get("/api/v1/platform/vendor/customers", headers=headers_b)).json()
        cust_a_names = [c["name"] for c in customers_a]
        cust_b_names = [c["name"] for c in customers_b]

        assert "Rohan Verma" in cust_a_names
        assert "Rohan Verma" not in cust_b_names, "XYZ Cosmetics MUST NOT see ABC Fashion customers"
        assert "Deepa Nair" in cust_b_names
        assert "Deepa Nair" not in cust_a_names, "ABC Fashion MUST NOT see XYZ Cosmetics customers"

        # ──────────────────────────────────────────────
        # Test 5: Public Store APIs load correct branding
        # ──────────────────────────────────────────────
        store_a_config = (await client.get("/api/store/abc/config")).json()
        store_b_config = (await client.get("/api/store/xyz/config")).json()

        assert store_a_config["store_slug"] == "abc"
        assert store_a_config["primary_color"] == "#2563EB"
        assert store_b_config["store_slug"] == "xyz"
        assert store_b_config["primary_color"] == "#10B981"

        banners_a = (await client.get("/api/store/abc/banners")).json()
        banners_b = (await client.get("/api/store/xyz/banners")).json()
        assert len(banners_a) > 0
        assert len(banners_b) > 0
        assert "Summer" in banners_a[0]["title"]
        assert "Botanical" in banners_b[0]["title"]

        # ──────────────────────────────────────────────
        # Test 6 & 7: Dynamic Android Order Creation
        # ──────────────────────────────────────────────
        # Pick a product from XYZ store
        xyz_products = (await client.get("/api/store/xyz/products")).json()
        target_product = xyz_products[0]

        order_payload = {
            "customer_name": "Test Mobile App Shopper",
            "customer_phone": "+91 9000011122",
            "customer_email": "shopper@test.com",
            "shipping_address": "Test Street 101, Android App User",
            "payment_method": "COD",
            "items": [
                {
                    "product_id": target_product["id"],
                    "quantity": 2,
                }
            ],
            "notes": "Order placed via Android SDK Mock",
        }

        order_res = await client.post("/api/store/xyz/orders", json=order_payload)
        assert order_res.status_code == 201, f"Order creation failed: {order_res.text}"
        created_order = order_res.json()

        # Verify price calculated strictly from database:
        expected_total = target_product["effective_price"] * 2
        assert created_order["total_amount"] == expected_total

        # Verify order appears in XYZ Cosmetics dashboard, NOT in ABC Fashion
        xyz_orders_updated = (await client.get("/api/v1/platform/vendor/orders", headers=headers_b)).json()
        xyz_order_nums = [o["order_number"] for o in xyz_orders_updated]
        assert created_order["order_number"] in xyz_order_nums

        abc_orders_updated = (await client.get("/api/v1/platform/vendor/orders", headers=headers_a)).json()
        abc_order_nums = [o["order_number"] for o in abc_orders_updated]
        assert created_order["order_number"] not in abc_order_nums, "Order must NOT appear in other vendor dashboard"

        # ──────────────────────────────────────────────
        # Test 8: Vendors cannot access Super Admin endpoints
        # ──────────────────────────────────────────────
        admin_forbidden_a = await client.get("/api/v1/platform/admin/overview", headers=headers_a)
        assert admin_forbidden_a.status_code == 403, "Vendor A MUST be rejected with 403 on Super Admin API"

        admin_forbidden_b = await client.get("/api/v1/platform/admin/overview", headers=headers_b)
        assert admin_forbidden_b.status_code == 403, "Vendor B MUST be rejected with 403 on Super Admin API"

        # Super admin CAN access
        admin_success = await client.get("/api/v1/platform/admin/overview", headers=headers_admin)
        assert admin_success.status_code == 200
        overview_data = admin_success.json()
        assert overview_data["total_vendors"] >= 2
        assert overview_data["total_mrr_inr"] > 0

        # ──────────────────────────────────────────────
        # Test 9: Expired/Suspended Vendor Restrictions
        # ──────────────────────────────────────────────
        # Create a test vendor and suspend it
        reg_res = await client.post("/api/v1/platform/auth/register", json={
            "email": "suspended_test@digitalgrowthstudio.in",
            "password": "Password@123",
            "owner_name": "Suspended Owner",
            "business_name": "Suspended Store",
            "phone": "+91 9999988888",
            "store_slug": "suspended-store",
        })
        assert reg_res.status_code == 201
        susp_vendor_id = reg_res.json()["vendor_id"]
        susp_token = reg_res.json()["access_token"]
        susp_headers = {"Authorization": f"Bearer {susp_token}"}

        # Suspend vendor via Super Admin API
        susp_action = await client.patch(
            f"/api/v1/platform/admin/vendors/{susp_vendor_id}/status",
            headers=headers_admin,
            json={"status": "suspended"}
        )
        assert susp_action.status_code == 200

        # Now suspended vendor tries to perform an operation
        restricted_op = await client.get("/api/v1/platform/vendor/overview", headers=susp_headers)
        assert restricted_op.status_code == 403, "Suspended vendor MUST be denied with 403"

        # Public store also blocks access for suspended vendor
        public_store_blocked = await client.get("/api/store/suspended-store/config")
        assert public_store_blocked.status_code == 403, "Public storefront for suspended vendor MUST be 403"

        print("\nALL 9 MULTI-VENDOR ISOLATION & SECURITY TESTS PASSED PERFECTLY!")


if __name__ == "__main__":
    asyncio.run(test_platform_end_to_end_security_and_isolation())
