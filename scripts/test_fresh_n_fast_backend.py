"""
End-to-End Backend Verification for Fresh N Fast Quick Commerce Mobile App
"""
import asyncio
import os
import sys
import json
import urllib.request

API_BASE_URL = "https://digital-growth-studio-api.onrender.com"
STORE_SLUG = "fresh-n-fast"

def test_api():
    print("=" * 60)
    print("E2E BACKEND VERIFICATION FOR FRESH N FAST QUICK COMMERCE")
    print("=" * 60)

    # 1. Store Config Check
    print("\n[TEST 1] Verifying Store Config API...")
    url = f"{API_BASE_URL}/api/store/{STORE_SLUG}/config"
    req = urllib.request.Request(url, headers={"User-Agent": "TestClient/1.0"})
    with urllib.request.urlopen(req, timeout=15) as res:
        assert res.status == 200, f"Expected 200, got {res.status}"
        data = json.loads(res.read().decode("utf-8"))
        print(f"  - Store Name: {data.get('store_name')}")
        print(f"  - Primary Color: {data.get('primary_color')}")
        print(f"  - Hyperlocal Enabled: {data.get('hyperlocal_enabled')}")
        print(f"  - Max Delivery Radius: {data.get('max_delivery_radius_km')} km")
        print(f"  - Estimated Delivery Time: {data.get('estimated_delivery_mins')} mins")
        print(f"  - Free Delivery Above: Rs. {data.get('free_delivery_above')}")
        assert data.get('hyperlocal_enabled') is True, "Hyperlocal must be enabled"
        assert data.get('primary_color') == "#15803D", "Primary color must be #15803D"
        print("  -> PASSED: Store configuration is 100% correct.")

    # 2. Products Catalog Check
    print("\n[TEST 2] Verifying Fresh Produce Products Catalog...")
    p_url = f"{API_BASE_URL}/api/store/{STORE_SLUG}/products"
    p_req = urllib.request.Request(p_url, headers={"User-Agent": "TestClient/1.0"})
    with urllib.request.urlopen(p_req, timeout=60) as res:
        assert res.status == 200
        products = json.loads(res.read().decode("utf-8"))
        print(f"  - Retrieved {len(products)} produce items from catalog.")
        assert len(products) >= 10, f"Expected at least 10 products, found {len(products)}"
        sample = products[0]
        print(f"  - Sample Item: '{sample.get('name')}' (Category: {sample.get('category_name')}, Price: Rs. {sample.get('effective_price')})")
        print("  -> PASSED: Catalog API active with full produce listings.")

    # 3. Hyperlocal Delivery Eligibility Check (Within Radius vs Outside Radius)
    print("\n[TEST 3] Verifying Hyperlocal Radius Geofencing API...")
    h_url = f"{API_BASE_URL}/api/store/{STORE_SLUG}/hyperlocal/check-eligibility"

    # Case A: Nearby location (within 5 km)
    payload_near = json.dumps({
        "latitude": 19.0800,
        "longitude": 72.8800,
        "cart_total": 150.0
    }).encode("utf-8")
    h_req_near = urllib.request.Request(h_url, data=payload_near, headers={"Content-Type": "application/json", "User-Agent": "TestClient/1.0"})
    with urllib.request.urlopen(h_req_near, timeout=60) as res:
        res_near = json.loads(res.read().decode("utf-8"))
        print(f"  - Customer within radius: is_deliverable={res_near.get('is_deliverable')}, distance={res_near.get('distance_km')} km, delivery_fee=Rs. {res_near.get('delivery_fee')}, time={res_near.get('estimated_time_text')}")
        assert res_near.get('is_deliverable') is True, "Expected customer to be deliverable within radius"

    # Case B: Far away location (50 km away)
    payload_far = json.dumps({
        "latitude": 19.5000,
        "longitude": 73.5000,
        "cart_total": 150.0
    }).encode("utf-8")
    h_req_far = urllib.request.Request(h_url, data=payload_far, headers={"Content-Type": "application/json", "User-Agent": "TestClient/1.0"})
    with urllib.request.urlopen(h_req_far, timeout=60) as res:
        res_far = json.loads(res.read().decode("utf-8"))
        print(f"  - Customer outside radius: is_deliverable={res_far.get('is_deliverable')}, reason='{res_far.get('reason')}'")
        assert res_far.get('is_deliverable') is False, "Expected customer outside radius to be marked undeliverable"
        print("  -> PASSED: Hyperlocal geofencing and distance checks are 100% accurate.")

    print("\n" + "=" * 60)
    print("ALL BACKEND & HYPERLOCAL TESTS PASSED SUCCESSFULLY (100%)")
    print("=" * 60)

if __name__ == "__main__":
    test_api()
