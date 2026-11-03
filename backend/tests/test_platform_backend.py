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
    from app.services.platform_seeder import seed_platform_database
    from tests.conftest import test_sessionmaker
    admin_user = None
    async with test_sessionmaker() as db_session:
        await seed_platform_database(db_session)
        from app.models.platform.vendor import PlatformUser
        from sqlalchemy import select
        admin_user = (await db_session.execute(select(PlatformUser).where(PlatformUser.role == "SUPER_ADMIN"))).scalars().first()

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

        # Super Admin Test Authorization Token (Signed with platform JWT secret)
        from app.core.platform_auth import create_platform_access_token
        token_admin = create_platform_access_token({
            "sub": str(admin_user.id),
            "email": admin_user.email,
            "role": "SUPER_ADMIN",
        })
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
        assert overview_data["total_mrr_inr"] >= 0
        assert "total_razorpay_funds_inr" in overview_data

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

        # ──────────────────────────────────────────────
        # Test 10: Multi-Image Product Gallery & Image Reordering
        # ──────────────────────────────────────────────
        initial_images = [
            "https://images.example.com/item-angle-1.jpg",
            "https://images.example.com/item-angle-2.jpg",
            "https://images.example.com/item-angle-3.jpg",
        ]
        create_prod_res = await client.post("/api/v1/platform/vendor/products", headers=headers_a, json={
            "name": "Multi-Image Test Silk Scarf",
            "description": "Silk scarf with multiple image angles",
            "regular_price": 799.0,
            "stock_quantity": 25,
            "image_urls": initial_images,
        })
        assert create_prod_res.status_code == 201, f"Product creation failed: {create_prod_res.text}"
        prod_data = create_prod_res.json()
        prod_id = prod_data["id"]

        assert prod_data["thumbnail_url"] == initial_images[0]
        assert len(prod_data["images"]) == 3
        assert [img["image_url"] for img in prod_data["images"]] == initial_images
        assert [img["sort_order"] for img in prod_data["images"]] == [0, 1, 2]
        assert prod_data["images"][0]["is_thumbnail"] is True

        # Now reorder images: move Angle 3 to first position (Cover), Angle 1 to second, Angle 2 to third
        reordered_images = [
            "https://images.example.com/item-angle-3.jpg",
            "https://images.example.com/item-angle-1.jpg",
            "https://images.example.com/item-angle-2.jpg",
        ]
        update_prod_res = await client.put(f"/api/v1/platform/vendor/products/{prod_id}", headers=headers_a, json={
            "image_urls": reordered_images,
        })
        assert update_prod_res.status_code == 200, f"Product update failed: {update_prod_res.text}"
        updated_data = update_prod_res.json()

        assert updated_data["thumbnail_url"] == reordered_images[0]
        assert [img["image_url"] for img in updated_data["images"]] == reordered_images
        assert [img["sort_order"] for img in updated_data["images"]] == [0, 1, 2]
        assert updated_data["images"][0]["is_thumbnail"] is True

        # Verify public storefront delivers the exact reordered image array
        store_prod_res = await client.get(f"/api/store/abc/products/{prod_id}")
        assert store_prod_res.status_code == 200
        store_prod = store_prod_res.json()
        assert store_prod["thumbnail_url"] == reordered_images[0]
        assert [img["image_url"] for img in store_prod["images"]] == reordered_images

        # Clean up test product
        del_prod = await client.delete(f"/api/v1/platform/vendor/products/{prod_id}", headers=headers_a)
        assert del_prod.status_code == 200

        # ──────────────────────────────────────────────
        # Test 11: Shipping Settings & Order MOV Calculation
        # ──────────────────────────────────────────────
        # Vendor updates shipping settings
        ship_update_res = await client.put("/api/v1/platform/vendor/store", headers=headers_a, json={
            "shipping_enabled": True,
            "shipping_charge": 80.0,
            "free_shipping_min_order": 1500.0,
            "cod_charge": 30.0,
            "estimated_delivery_days": "2-4 Business Days",
            "allowed_countries": "India, Nepal",
            "serviceable_pincodes_type": "all",
        })
        assert ship_update_res.status_code == 200, f"Shipping update failed: {ship_update_res.text}"
        store_settings = ship_update_res.json()
        assert store_settings["shipping_charge"] == 80.0
        assert store_settings["free_shipping_min_order"] == 1500.0
        assert store_settings["cod_charge"] == 30.0

        # Verify public store config reflects updated shipping
        store_config_res = await client.get("/api/store/abc/config")
        assert store_config_res.status_code == 200
        store_cfg = store_config_res.json()
        assert store_cfg["shipping_charge"] == 80.0
        assert store_cfg["free_shipping_min_order"] == 1500.0
        assert store_cfg["cod_charge"] == 30.0
        assert store_cfg["estimated_delivery_days"] == "2-4 Business Days"

        # Place order below free shipping threshold (MOV < 1500) with COD
        # Get a product from ABC store
        abc_prods_res = await client.get("/api/store/abc/products")
        abc_prod = abc_prods_res.json()[0]
        p_price = abc_prod["effective_price"]
        p_id = abc_prod["id"]

        order_res_below_mov = await client.post("/api/store/abc/orders", json={
            "customer_name": "Test Shipping Buyer",
            "customer_phone": "9998887776",
            "shipping_address": "Flat 101, Test Lane, Mumbai 400001",
            "payment_method": "COD",
            "items": [{"product_id": p_id, "quantity": 1}],
        })
        assert order_res_below_mov.status_code == 201, f"Order failed: {order_res_below_mov.text}"
        order_data = order_res_below_mov.json()
        expected_total = round(p_price + 80.0 + 30.0, 2)
        assert order_data["total_amount"] == expected_total, f"Expected {expected_total}, got {order_data['total_amount']}"
        ord_num = order_data["order_number"]
        ord_id = order_data["id"]

        # ──────────────────────────────────────────────
        # Test 12: Individual Order Detail & Customer Account Orders
        # ──────────────────────────────────────────────
        # Lookup by UUID
        res_by_uuid = await client.get(f"/api/store/abc/orders/{ord_id}")
        assert res_by_uuid.status_code == 200
        assert res_by_uuid.json()["order_number"] == ord_num

        # Lookup by Order Number string
        res_by_num = await client.get(f"/api/store/abc/orders/{ord_num}")
        assert res_by_num.status_code == 200
        assert res_by_num.json()["id"] == ord_id

        # Lookup customer orders by phone
        res_cust_orders = await client.get("/api/store/abc/customer-orders?phone=9998887776")
        assert res_cust_orders.status_code == 200
        cust_orders = res_cust_orders.json()
        assert len(cust_orders) >= 1
        assert cust_orders[0]["order_number"] == ord_num

        # ──────────────────────────────────────────────
        # Test 13: Super Admin Plan & Addon Management (Create, Update, Delete)
        # ──────────────────────────────────────────────
        # Create temporary plan
        plan_res = await client.post(
            "/api/v1/platform/admin/plans",
            headers={"Authorization": f"Bearer {token_admin}"},
            json={
                "name": "Custom Enterprise Tier",
                "slug": "custom-enterprise-test",
                "monthly_price_inr": 2999.0,
                "setup_fee_inr": 5000.0,
                "storage_limit_mb": 5120,
                "max_products": 500,
                "is_active": True,
            },
        )
        assert plan_res.status_code == 201
        temp_plan_id = plan_res.json()["id"]

        # Delete plan
        del_plan_res = await client.delete(
            f"/api/v1/platform/admin/plans/{temp_plan_id}",
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        assert del_plan_res.status_code == 200, f"Delete plan failed: {del_plan_res.text}"

        # Create temporary addon
        addon_res = await client.post(
            "/api/v1/platform/admin/addons",
            headers={"Authorization": f"Bearer {token_admin}"},
            json={
                "name": "Temporary Test Addon",
                "code": "temp-test-addon",
                "description": "Will be deleted",
                "price_inr": 249.0,
                "billing_type": "ONE_TIME",
                "is_active": True,
            },
        )
        assert addon_res.status_code == 201
        temp_addon_id = addon_res.json()["id"]

        # Update addon
        update_addon_res = await client.put(
            f"/api/v1/platform/admin/addons/{temp_addon_id}",
            headers={"Authorization": f"Bearer {token_admin}"},
            json={
                "name": "Updated Temp Addon",
                "code": "temp-test-addon",
                "description": "Updated description",
                "price_inr": 299.0,
                "billing_type": "ONE_TIME",
                "is_active": True,
            },
        )
        assert update_addon_res.status_code == 200
        assert update_addon_res.json()["price_inr"] == 299.0

        # Delete addon
        del_addon_res = await client.delete(
            f"/api/v1/platform/admin/addons/{temp_addon_id}",
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        assert del_addon_res.status_code == 200, f"Delete addon failed: {del_addon_res.text}"

        # ──────────────────────────────────────────────
        # Test 14: Product Multi-Variant Creation & Order Stock Deduction
        # ──────────────────────────────────────────────
        variant_prod_res = await client.post(
            "/api/v1/platform/vendor/products",
            headers=headers_a,
            json={
                "name": "Luxury Silk Robe with Variants",
                "description": "Premium silk robe with size and color options",
                "regular_price": 2499.0,
                "sale_price": 1999.0,
                "sku": "ROBE-VAR-TEST",
                "stock_quantity": 0,
                "status": "active",
                "is_featured": True,
                "has_variants": True,
                "variants": [
                    {
                        "name": "Small / Crimson Red",
                        "sku": "ROBE-S-RED",
                        "price": 1999.0,
                        "stock_quantity": 15,
                        "images": [
                            "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
                            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
                        ],
                        "sort_order": 0,
                        "is_active": True,
                    },
                    {
                        "name": "Large / Midnight Navy",
                        "sku": "ROBE-L-NAVY",
                        "price": 2199.0,
                        "stock_quantity": 25,
                        "images": [
                            "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f"
                        ],
                        "sort_order": 1,
                        "is_active": True,
                    },
                ],
            },
        )
        assert variant_prod_res.status_code == 201, f"Create variant product failed: {variant_prod_res.text}"
        var_prod = variant_prod_res.json()
        assert var_prod["has_variants"] is True
        assert len(var_prod["variants"]) == 2
        assert var_prod["stock_quantity"] == 40  # 15 + 25 auto-summed
        assert len(var_prod["variants"][0]["images"]) == 2

        # Public Storefront API loads variants
        public_prod_res = await client.get(f"/api/store/abc/products/{var_prod['id']}")
        assert public_prod_res.status_code == 200
        pub_p = public_prod_res.json()
        assert pub_p["has_variants"] is True
        assert len(pub_p["variants"]) == 2

        # Customer buys Large Midnight Navy variant
        chosen_var = pub_p["variants"][1]
        order_var_res = await client.post(
            "/api/store/abc/orders",
            json={
                "customer_name": "Test Customer",
                "customer_phone": "+91 9988776655",
                "customer_email": "customer@test.com",
                "shipping_address": "Flat 101, Test Road, Mumbai 400001",
                "payment_method": "COD",
                "items": [
                    {
                        "product_id": var_prod["id"],
                        "variant_id": chosen_var["id"],
                        "variant_name": chosen_var["name"],
                        "quantity": 3,
                    }
                ],
            },
        )
        assert order_var_res.status_code == 201, f"Variant order placement failed: {order_var_res.text}"
        order_data = order_var_res.json()
        assert len(order_data["items"]) == 1
        assert order_data["items"][0]["variant_id"] == chosen_var["id"]
        assert order_data["items"][0]["price"] == 2199.0

        # Verify stock deduction: 25 - 3 = 22 for variant; 40 - 3 = 37 for product
        verify_prod_res = await client.get(f"/api/store/abc/products/{var_prod['id']}")
        updated_pub_p = verify_prod_res.json()
        assert updated_pub_p["stock_quantity"] == 37
        updated_var = next(v for v in updated_pub_p["variants"] if v["id"] == chosen_var["id"])
        assert updated_var["stock_quantity"] == 22

        # ──────────────────────────────────────────────
        # Test 15: Multi-Step Registration ("Launch Your Branded Android App"), Profile Persistence & Brand Name Lock
        # ──────────────────────────────────────────────
        reg_payload = {
            "owner_name": "Vikram Test Owner",
            "email": "vikram.test@example.com",
            "password": "SecurePassword123!",
            "whatsapp_number": "+91 9876500000",
            "business_name": "Apex Trends",
            "business_phone": "+91 9876500000",
            "category": "Apparel & Shoes",
            "whatsapp_business_name": "Apex Trends Official",
            "brand_name": "Apex Trends Couture",
            "description": "Premium handcrafted streetwear",
            "address": "404 Creative Park, Bengaluru 560001",
            "has_payment_gateway": "Yes",
            "needs_delivery_help": "No",
            "store_slug": "apex-trends",
        }
        reg_res = await client.post("/api/v1/platform/auth/register", json=reg_payload)
        assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
        reg_data = reg_res.json()
        assert "access_token" in reg_data
        new_vendor_token = reg_data["access_token"]
        new_vendor_headers = {"Authorization": f"Bearer {new_vendor_token}"}

        # Check vendor profile persistence
        prof_res = await client.get("/api/v1/platform/vendor/profile", headers=new_vendor_headers)
        assert prof_res.status_code == 200, f"Profile fetch failed: {prof_res.text}"
        prof_data = prof_res.json()
        assert prof_data["brand_name"] == "Apex Trends Couture"
        assert prof_data["brand_name_locked"] is True
        assert prof_data["whatsapp_number"] == "+91 9876500000"
        assert prof_data["whatsapp_business_name"] == "Apex Trends Official"
        assert prof_data["business_phone"] == "+91 9876500000"
        assert prof_data["has_payment_gateway"] == "Yes"
        assert prof_data["needs_delivery_help"] == "No"
        assert prof_data["address"] == "404 Creative Park, Bengaluru 560001"

        # Verify Brand Name is strictly immutable (HTTP 400)
        tamper_res = await client.put(
            "/api/v1/platform/vendor/profile",
            headers=new_vendor_headers,
            json={"brand_name": "Tampered Brand Name"},
        )
        assert tamper_res.status_code == 400, "Should reject brand_name modification once locked"
        assert "Brand Name is permanent and cannot be changed" in tamper_res.json()["detail"]

        # Verify updating allowed profile fields succeeds
        update_res = await client.put(
            "/api/v1/platform/vendor/profile",
            headers=new_vendor_headers,
            json={"address": "Suite 999, Indiranagar, Bengaluru 560038"},
        )
        assert update_res.status_code == 200
        assert update_res.json()["address"] == "Suite 999, Indiranagar, Bengaluru 560038"

        # ──────────────────────────────────────────────
        # Test 16: Android App Visual Assets, Personal Data Sync & Immutability Once Development Is Set
        # ──────────────────────────────────────────────
        app_cfg_res = await client.get("/api/v1/platform/vendor/app-config", headers=new_vendor_headers)
        assert app_cfg_res.status_code == 200
        cfg_data = app_cfg_res.json()
        assert cfg_data["app_build_status"] == "NOT_REQUESTED"

        # Update draft visual assets before submission
        update_cfg = await client.put(
            "/api/v1/platform/vendor/app-config",
            headers=new_vendor_headers,
            json={
                "app_name": "Apex Trends Official",
                "app_logo_url": "https://cdn.example.com/apex-app-icon.png",
                "splash_screen_url": "https://cdn.example.com/apex-splash.png",
                "primary_color": "#1E40AF",
            },
        )
        assert update_cfg.status_code == 200
        updated_cfg = update_cfg.json()
        assert updated_cfg["app_logo_url"] == "https://cdn.example.com/apex-app-icon.png"

        # Verify logo asset is automatically synced with personal vendor profile & store data
        store_res = await client.get("/api/v1/platform/vendor/store", headers=new_vendor_headers)
        assert store_res.status_code == 200
        assert store_res.json()["logo_url"] == "https://cdn.example.com/apex-app-icon.png"

        prof_after = await client.get("/api/v1/platform/vendor/profile", headers=new_vendor_headers)
        assert prof_after.status_code == 200
        assert prof_after.json()["logo_url"] == "https://cdn.example.com/apex-app-icon.png"

        # Submit app assets for development
        submit_dev_res = await client.post("/api/v1/platform/vendor/app-config/submit", headers=new_vendor_headers)
        assert submit_dev_res.status_code == 200
        submitted_cfg = submit_dev_res.json()
        assert submitted_cfg["is_locked"] is True
        assert submitted_cfg["app_build_status"] == "QUEUED"

        # Verify assets cannot be changed once submitted and development is set (HTTP 400)
        tamper_app_res = await client.put(
            "/api/v1/platform/vendor/app-config",
            headers=new_vendor_headers,
            json={"app_name": "Tampered App Name", "app_logo_url": "https://cdn.example.com/tampered.png"},
        )
        assert tamper_app_res.status_code == 400, "Must reject modifying app branding assets once development is set"
        assert "cannot be changed once submitted and development is set" in tamper_app_res.json()["detail"]

        # ──────────────────────────────────────────────
        # Test 17: One-Time Setup Fee Gate, Super Admin Pricing Control & Quotes
        # ──────────────────────────────────────────────
        # Check current setup fee status of new vendor
        me_check = await client.get("/api/v1/platform/auth/me", headers=new_vendor_headers)
        assert me_check.status_code == 200
        assert me_check.json()["setup_fee_cleared"] is False
        assert me_check.json()["setup_fee_paid"] is False

        # Fetch setup fee quote
        quote_res = await client.get("/api/v1/platform/payments/setup-fee-quote", headers=new_vendor_headers)
        assert quote_res.status_code == 200
        quote = quote_res.json()
        assert quote["setup_fee_cleared"] is False
        assert quote["base_price_inr"] == 2000.0
        assert quote["sale_price_inr"] == 999.0
        assert quote["final_price_inr"] == 999.0

        # Super Admin updates plan pricing
        plans_list = (await client.get("/api/v1/platform/admin/plans", headers=headers_admin)).json()
        plan_id = plans_list[0]["id"]
        admin_price_update = await client.patch(
            f"/api/v1/platform/admin/plans/{plan_id}/pricing",
            headers=headers_admin,
            json={"setup_fee_sale_price_inr": 899.0, "monthly_price_inr": 499.0},
        )
        assert admin_price_update.status_code == 200

        # Quote should now reflect updated plan sale price (899)
        quote_res2 = await client.get("/api/v1/platform/payments/setup-fee-quote", headers=new_vendor_headers)
        assert quote_res2.json()["sale_price_inr"] == 899.0
        assert quote_res2.json()["final_price_inr"] == 899.0

        # Super Admin sets custom price specifically for this vendor
        vendor_id = me_check.json()["vendor_id"]
        admin_custom_price = await client.patch(
            f"/api/v1/platform/admin/vendors/{vendor_id}/setup-fee",
            headers=headers_admin,
            json={"custom_price_inr": 699.0},
        )
        assert admin_custom_price.status_code == 200
        assert admin_custom_price.json()["custom_price_inr"] == 699.0

        # Quote should now reflect custom price (699)
        quote_res3 = await client.get("/api/v1/platform/payments/setup-fee-quote", headers=new_vendor_headers)
        assert quote_res3.json()["custom_price_inr"] == 699.0
        assert quote_res3.json()["final_price_inr"] == 699.0

        # ──────────────────────────────────────────────
        # Test 18: Coupon Generation, Validation & Razorpay Setup Fee Settlement
        # ──────────────────────────────────────────────
        # Admin generates a coupon: 200 INR discount
        coupon_res = await client.post(
            "/api/v1/platform/admin/coupons",
            headers=headers_admin,
            json={
                "code": "LAUNCH200",
                "discount_type": "FIXED_INR",
                "discount_value": 200.0,
                "valid_days": 15,
                "applicable_to": "SETUP_FEE",
                "max_uses": 50,
            },
        )
        assert coupon_res.status_code == 201
        coupon_data = coupon_res.json()
        assert coupon_data["code"] == "LAUNCH200"

        # Vendor validates coupon
        val_res = await client.post(
            "/api/v1/platform/payments/validate-coupon",
            headers=new_vendor_headers,
            json={"code": "LAUNCH200"},
        )
        assert val_res.status_code == 200
        assert val_res.json()["valid"] is True
        assert val_res.json()["discount_inr"] == 200.0
        # 699 custom price - 200 coupon = 499
        assert val_res.json()["new_total_inr"] == 499.0

        # Create Razorpay setup fee order with coupon
        order_res = await client.post(
            "/api/v1/platform/payments/create-setup-fee-order",
            headers=new_vendor_headers,
            json={"coupon_code": "LAUNCH200"},
        )
        assert order_res.status_code == 200
        order_data = order_res.json()
        assert order_data["amount"] == 49900  # in paise
        assert "order_id" in order_data

        # Verify setup fee payment
        verify_res = await client.post(
            "/api/v1/platform/payments/verify-setup-fee",
            headers=new_vendor_headers,
            json={
                "razorpay_order_id": order_data["order_id"],
                "razorpay_payment_id": "pay_test_setup_001",
                "razorpay_signature": "mock_signature_test",
                "coupon_code": "LAUNCH200",
            },
        )
        assert verify_res.status_code == 200
        assert verify_res.json()["setup_fee_cleared"] is True

        # Auth session now confirms vendor is cleared and allowed into dashboard
        me_after_payment = await client.get("/api/v1/platform/auth/me", headers=new_vendor_headers)
        assert me_after_payment.json()["setup_fee_cleared"] is True
        assert me_after_payment.json()["setup_fee_paid"] is True

        # Test Super Admin secret waiver on a secondary vendor
        reg_waiver_vendor = await client.post("/api/v1/platform/auth/register", json={
            "business_name": "Waiver Boutique",
            "owner_name": "Anita Roy",
            "email": "anita.waiver@example.com",
            "phone": "+91 9999900001",
            "password": "Password@123",
            "category": "Fashion",
            "store_slug": "waiver-boutique",
        })
        assert reg_waiver_vendor.status_code == 201
        waiver_token = reg_waiver_vendor.json()["access_token"]
        waiver_headers = {"Authorization": f"Bearer {waiver_token}"}
        waiver_me = (await client.get("/api/v1/platform/auth/me", headers=waiver_headers)).json()
        waiver_vendor_id = waiver_me["vendor_id"]

        # Initially setup fee is not cleared
        me_waiver_before = await client.get("/api/v1/platform/auth/me", headers=waiver_headers)
        assert me_waiver_before.json()["setup_fee_cleared"] is False

        # Admin waives setup fee secretly
        waive_action = await client.patch(
            f"/api/v1/platform/admin/vendors/{waiver_vendor_id}/setup-fee",
            headers=headers_admin,
            json={"waive_fee": True},
        )
        assert waive_action.status_code == 200
        assert waive_action.json()["setup_fee_waived"] is True

        # Vendor is now cleared without any public mention of waiver
        me_waiver_after = await client.get("/api/v1/platform/auth/me", headers=waiver_headers)
        assert me_waiver_after.json()["setup_fee_cleared"] is True

        # ──────────────────────────────────────────────
        # Test 19: Subscription Product Gating (Expired/Unpaid App Stops Showing Products)
        # ──────────────────────────────────────────────
        # Storefront endpoint for ABC Fashion (active subscription)
        pub_prods_abc = await client.get("/api/store/abc/products")
        assert pub_prods_abc.status_code == 200
        assert len(pub_prods_abc.json()) > 0

        # Set waiver boutique subscription to EXPIRED via direct admin / DB status simulation
        from app.models.platform.subscription import PlatformSubscription
        from sqlalchemy import update
        import uuid as _uuid
        async with test_sessionmaker() as db_session:
            await db_session.execute(
                update(PlatformSubscription)
                .where(PlatformSubscription.vendor_id == _uuid.UUID(waiver_vendor_id))
                .values(status="EXPIRED")
            )
            await db_session.commit()

        # Public storefront & app endpoints must now return empty products list for expired subscription
        pub_prods_expired = await client.get("/api/store/waiver-boutique/products")
        assert pub_prods_expired.status_code == 200
        assert pub_prods_expired.json() == [], "Expired subscription must hide all products from app and store"

        # ──────────────────────────────────────────────
        # Test 20: Add-on Platform Razorpay Purchase & Immediate Cloud Quota Allocation
        # ──────────────────────────────────────────────
        # Storage usage before addon
        overview_before = (await client.get("/api/v1/platform/vendor/overview", headers=new_vendor_headers)).json()
        limit_before = overview_before["storage_limit_bytes"]

        # Fetch addons to get storage-5gb addon ID
        addons_list = (await client.get("/api/v1/platform/admin/addons", headers=headers_admin)).json()
        storage_addon = next(a for a in addons_list if a["code"] == "storage-5gb")

        # Create Addon order for storage-5gb
        addon_order_res = await client.post(
            "/api/v1/platform/payments/create-addon-order",
            headers=new_vendor_headers,
            json={"addon_id": storage_addon["id"]},
        )
        assert addon_order_res.status_code == 200
        addon_order = addon_order_res.json()
        assert addon_order["addon_code"] == "storage-5gb"

        # Verify Addon Payment
        verify_addon = await client.post(
            "/api/v1/platform/payments/verify-addon-payment",
            headers=new_vendor_headers,
            json={
                "addon_id": storage_addon["id"],
                "razorpay_order_id": addon_order["order_id"],
                "razorpay_payment_id": "pay_test_addon_001",
                "razorpay_signature": "mock_sig_addon",
            },
        )
        assert verify_addon.status_code == 200
        assert verify_addon.json()["success"] is True

        # Check storage limit increased by 5GB (5368709120 bytes)
        overview_after = (await client.get("/api/v1/platform/vendor/overview", headers=new_vendor_headers)).json()
        assert overview_after["storage_limit_bytes"] == limit_before + (5 * 1024 * 1024 * 1024)

        # ──────────────────────────────────────────────
        # Test 21: APK Submission by Admin & Vendor Approval Starting ₹499/mo Auto-Debit
        # ──────────────────────────────────────────────
        # Admin marks build BUILT and supplies APK download URL
        admin_build_res = await client.patch(
            f"/api/v1/platform/admin/vendors/{vendor_id}/app-config",
            headers=headers_admin,
            json={
                "app_build_status": "BUILT",
                "apk_download_url": "https://storage.googleapis.com/dgs-builds/apex-trends-v1.0.0.apk",
            },
        )
        assert admin_build_res.status_code == 200

        # Vendor inspects app-config and sees the submitted APK download link
        vendor_cfg_check = await client.get("/api/v1/platform/vendor/app-config", headers=new_vendor_headers)
        assert vendor_cfg_check.status_code == 200
        assert vendor_cfg_check.json()["app_build_status"] == "BUILT"
        assert vendor_cfg_check.json()["apk_download_url"] == "https://storage.googleapis.com/dgs-builds/apex-trends-v1.0.0.apk"
        assert vendor_cfg_check.json()["apk_user_approved"] is False

        # Vendor tests the APK and approves it, activating ₹499/mo subscription auto-debit
        approve_res = await client.post(
            "/api/v1/platform/payments/approve-apk-and-activate-subscription",
            headers=new_vendor_headers,
        )
        assert approve_res.status_code == 200
        approve_data = approve_res.json()
        assert approve_data["apk_user_approved"] is True
        assert approve_data["subscription_status"] == "active"
        assert approve_data["subscription_auto_debit_active"] is True

        # ──────────────────────────────────────────────
        # Test 22: Razorpay Order Creation and Renewal for ₹499/mo Membership
        # ──────────────────────────────────────────────
        sub_order_res = await client.post(
            "/api/v1/platform/payments/create-subscription-order",
            headers=new_vendor_headers,
        )
        assert sub_order_res.status_code == 200
        sub_order_data = sub_order_res.json()
        assert sub_order_data["amount"] == 49900
        assert sub_order_data["currency"] == "INR"
        assert sub_order_data["monthly_price_inr"] == 499.0

        sub_verify_res = await client.post(
            "/api/v1/platform/payments/verify-subscription-payment",
            headers=new_vendor_headers,
            json={
                "razorpay_order_id": sub_order_data["order_id"],
                "razorpay_payment_id": f"pay_test_{sub_order_data['order_id']}",
                "razorpay_signature": "mock_signature_test",
            },
        )
        assert sub_verify_res.status_code == 200
        sub_verify_data = sub_verify_res.json()
        assert sub_verify_data["success"] is True
        assert sub_verify_data["status"] == "active"

        # Check /me reports the renewed subscription
        me_check = await client.get("/api/v1/platform/auth/me", headers=new_vendor_headers)
        assert me_check.status_code == 200
        assert me_check.json()["subscription_status"] == "active"
        assert me_check.json()["is_subscription_expired"] is False

        print("\nALL 22 MULTI-VENDOR ISOLATION, SECURITY, SETUP FEE GATE, RECURRING APP SUBSCRIPTIONS, AND PLATFORM RAZORPAY TESTS PASSED PERFECTLY!")


if __name__ == "__main__":
    asyncio.run(test_platform_end_to_end_security_and_isolation())
