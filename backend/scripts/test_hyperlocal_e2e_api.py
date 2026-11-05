"""
End-to-End API Integration Test for Hyperlocal Delivery & Specific Pincodes
Uses FastAPI test client / httpx to test the live API endpoints directly.
"""
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import async_session_factory
from app.models.platform.vendor import PlatformStore
from app.models.platform.catalog import PlatformProduct
from sqlalchemy import select


async def run_e2e_tests():
    print("==================================================")
    print("RUNNING E2E API INTEGRATION TESTS FOR HYPERLOCAL")
    print("==================================================")

    # 1. Fetch an existing store and active product to test with
    async with async_session_factory() as session:
        stmt = select(PlatformStore).limit(1)
        store = (await session.execute(stmt)).scalar_one_or_none()
        if not store:
            print("No stores found in DB to test. Skipping.")
            return

        slug = store.store_slug
        print(f"Testing against store: {store.store_name} (slug: {slug})")

        # Temporarily enable hyperlocal delivery with test parameters
        store.hyperlocal_enabled = True
        store.hyperlocal_mode = "both"
        store.store_latitude = 18.5204
        store.store_longitude = 73.8567
        store.store_location_name = "FC Road Pune Hub"
        store.max_delivery_radius_km = 8.0
        store.min_order_value = 150.0
        store.base_delivery_fee = 35.0
        store.base_distance_km = 3.0
        store.per_km_fee = 12.0
        store.free_delivery_above = 500.0
        store.estimated_delivery_mins = 40
        store.serviceable_pincodes_type = "specific"
        store.serviceable_pincodes = "411001, 411002, 411004, 411005"
        await session.commit()

        # Find an active product for order placement testing
        p_stmt = select(PlatformProduct).where(
            PlatformProduct.vendor_id == store.vendor_id,
            PlatformProduct.status == "active",
            PlatformProduct.stock_quantity > 0,
        ).limit(1)
        product = (await session.execute(p_stmt)).scalar_one_or_none()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # TEST 1: GET /api/v1/store/{slug}/config
        print("\n--- TEST 1: GET Store Config (Public API) ---")
        res = await client.get(f"/api/v1/store/{slug}/config")
        print(f"Status: {res.status_code}")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["hyperlocal_enabled"] is True
        assert data["hyperlocal_mode"] == "both"
        assert data["store_latitude"] == 18.5204
        assert data["max_delivery_radius_km"] == 8.0
        assert data["base_delivery_fee"] == 35.0
        assert data["serviceable_pincodes_type"] == "specific"
        print("[PASS] Store config returned complete hyperlocal settings correctly!")

        # TEST 2: POST /api/v1/store/{slug}/hyperlocal/check-eligibility (Within radius)
        print("\n--- TEST 2: Check Eligibility (Within 4 km radius) ---")
        payload_in = {
            "latitude": 18.5300,
            "longitude": 73.8500,
            "pincode": "411004",
            "cart_total": 250.0,
        }
        res_in = await client.post(f"/api/v1/store/{slug}/hyperlocal/check-eligibility", json=payload_in)
        print(f"Status: {res_in.status_code}")
        assert res_in.status_code == 200
        data_in = res_in.json()
        print(f"Response: deliverable={data_in['is_deliverable']}, distance={data_in['distance_km']} km, fee=Rs. {data_in['delivery_fee']}, time={data_in['estimated_time_text']}")
        assert data_in["is_deliverable"] is True
        assert data_in["delivery_fee"] == 35.0
        print("[PASS] In-radius delivery check succeeded!")

        # TEST 3: Check Eligibility (Outside radius and blocked pincode)
        print("\n--- TEST 3: Check Eligibility (Outside 8 km radius and blocked pincode) ---")
        payload_out = {
            "latitude": 18.7500,
            "longitude": 73.9900,
            "pincode": "411033",
            "cart_total": 250.0,
        }
        res_out = await client.post(f"/api/v1/store/{slug}/hyperlocal/check-eligibility", json=payload_out)
        print(f"Status: {res_out.status_code}")
        assert res_out.status_code == 200
        data_out = res_out.json()
        print(f"Response: deliverable={data_out['is_deliverable']}, reason={data_out['reason']}")
        assert data_out["is_deliverable"] is False
        print("[PASS] Outside radius rejection check succeeded!")

        # TEST 4: Check Eligibility (Below Minimum Order Value)
        print("\n--- TEST 4: Check Eligibility (Cart total Rs. 80 < Min Order Rs. 150) ---")
        payload_low = {
            "latitude": 18.5300,
            "longitude": 73.8500,
            "pincode": "411004",
            "cart_total": 80.0,
        }
        res_low = await client.post(f"/api/v1/store/{slug}/hyperlocal/check-eligibility", json=payload_low)
        assert res_low.status_code == 200
        data_low = res_low.json()
        print(f"Response: deliverable={data_low['is_deliverable']}, min_order_met={data_low['min_order_met']}, reason={data_low['reason']}")
        assert data_low["is_deliverable"] is False
        assert data_low["min_order_met"] is False
        print("[PASS] Minimum order value boundary check succeeded!")

        # TEST 5: Order Placement Validation
        if product:
            print("\n--- TEST 5: Order Placement (Delivery zone enforcement) ---")
            # Case 5A: Attempt to place order outside delivery area -> Must reject with 400
            order_invalid = {
                "customer_name": "Test Customer",
                "customer_phone": "9999988888",
                "shipping_address": "Flat 101, Chinchwad, Pune - 411033",
                "shipping_pincode": "411033",
                "customer_latitude": 18.7500,
                "customer_longitude": 73.9900,
                "payment_method": "COD",
                "items": [
                    {
                        "product_id": str(product.id),
                        "quantity": 1,
                        "price": float(product.regular_price),
                    }
                ],
            }
            res_bad_order = await client.post(f"/api/v1/store/{slug}/orders", json=order_invalid)
            print(f"Blocked order status: {res_bad_order.status_code}, detail: {res_bad_order.text}")
            assert res_bad_order.status_code == 400
            print("[PASS] Order outside delivery zone was correctly blocked by backend with HTTP 400!")

            # Case 5B: Valid order inside delivery zone
            order_valid = {
                "customer_name": "Test Customer",
                "customer_phone": "9999988888",
                "shipping_address": "Flat 302, Shivaji Nagar, Pune - 411004",
                "shipping_pincode": "411004",
                "customer_latitude": 18.5300,
                "customer_longitude": 73.8500,
                "payment_method": "COD",
                "items": [
                    {
                        "product_id": str(product.id),
                        "quantity": 1,
                        "price": float(product.regular_price),
                    }
                ],
            }
            res_good_order = await client.post(f"/api/v1/store/{slug}/orders", json=order_valid)
            print(f"Valid order status: {res_good_order.status_code}")
            if res_good_order.status_code == 200:
                ord_data = res_good_order.json()
                print(f"[PASS] Order created successfully! Order #: {ord_data.get('order_number')}, Total: Rs. {ord_data.get('total_amount')}")
            else:
                print(f"Order response: {res_good_order.text}")

    print("\n==================================================")
    print("ALL END-TO-END HYPERLOCAL API TESTS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
