"""
Backend Automated Test Suite for Hyperlocal Delivery & Specific Pincodes
Verifies Haversine mathematics, distance slabs, pincode filtering, and eligibility calculation.
"""
import asyncio
from app.utils.geo import (
    haversine_distance,
    parse_serviceable_pincodes,
    is_pincode_serviceable,
    calculate_delivery_fee,
    check_store_hyperlocal_eligibility,
)
from app.database import async_session_factory
from app.models.platform.vendor import PlatformStore
from sqlalchemy import select


def test_haversine():
    print("\n--- Test 1: Haversine Distance Calculation ---")
    # Pune Swargate (18.5018, 73.8636) to Pune Shivajinagar (18.5314, 73.8446)
    # Straight line is ~3.8 km, with 1.25 urban road factor ~4.8 km
    dist = haversine_distance(18.5018, 73.8636, 18.5314, 73.8446)
    print(f"Calculated driving distance: {dist} km")
    assert 4.0 <= dist <= 6.0, f"Expected between 4.0 and 6.0 km, got {dist}"
    print("[PASS] Haversine distance test passed!")


def test_pincode_filtering():
    print("\n--- Test 2: Specific Pincodes Filtering ---")
    pincodes_str = "411001, 411002, 411004; 411014\n411038"
    parsed = parse_serviceable_pincodes(pincodes_str)
    print(f"Parsed pincodes: {parsed}")
    assert "411001" in parsed
    assert "411004" in parsed
    assert "411014" in parsed
    assert "411038" in parsed
    assert "411052" not in parsed

    # Mode: "all"
    assert is_pincode_serviceable("411099", "all", pincodes_str) is True

    # Mode: "specific"
    assert is_pincode_serviceable("411001", "specific", pincodes_str) is True
    assert is_pincode_serviceable("411052", "specific", pincodes_str) is False
    assert is_pincode_serviceable(None, "specific", pincodes_str) is False
    print("[PASS] Pincode filtering test passed!")


def test_delivery_fee_slabs():
    print("\n--- Test 3: Distance-Slab Delivery Fee Calculation ---")
    # Base fee 30 for 3 km, 10/km after, free above 499
    # Case A: 2.5 km, order 200 -> Base fee 30
    fee_a = calculate_delivery_fee(distance_km=2.5, order_total=200.0, base_fee=30.0, base_distance_km=3.0, per_km_fee=10.0, free_delivery_above=499.0)
    assert fee_a == 30.0, f"Expected 30.0, got {fee_a}"

    # Case B: 5.5 km, order 200 -> 30 + (2.5 * 10) = 55.0
    fee_b = calculate_delivery_fee(distance_km=5.5, order_total=200.0, base_fee=30.0, base_distance_km=3.0, per_km_fee=10.0, free_delivery_above=499.0)
    assert fee_b == 55.0, f"Expected 55.0, got {fee_b}"

    # Case C: 8.0 km, order 550 (above 499) -> Free delivery (0.0)
    fee_c = calculate_delivery_fee(distance_km=8.0, order_total=550.0, base_fee=30.0, base_distance_km=3.0, per_km_fee=10.0, free_delivery_above=499.0)
    assert fee_c == 0.0, f"Expected 0.0, got {fee_c}"
    print(f"Fee (2.5 km): Rs {fee_a}, Fee (5.5 km): Rs {fee_b}, Fee (Order > Rs 499): Rs {fee_c}")
    print("[PASS] Distance fee slab test passed!")


def test_eligibility_scenarios():
    print("\n--- Test 4: Hyperlocal Eligibility Scenarios ---")
    store_lat = 18.5204
    store_lon = 73.8567
    allowed_pins = "411001, 411002, 411004"

    # Scenario 1: Inside radius (3 km away), min order satisfied
    res1 = check_store_hyperlocal_eligibility(
        store_latitude=store_lat,
        store_longitude=store_lon,
        store_location_name="FC Road Store",
        hyperlocal_enabled=True,
        hyperlocal_mode="radius",
        max_delivery_radius_km=7.0,
        min_order_value=150.0,
        base_delivery_fee=30.0,
        base_distance_km=3.0,
        per_km_fee=10.0,
        free_delivery_above=499.0,
        estimated_delivery_mins=40,
        serviceable_pincodes_type="specific",
        serviceable_pincodes=allowed_pins,
        customer_latitude=18.5300,
        customer_longitude=73.8500,
        customer_pincode="411005",
        cart_total=250.0,
    )
    print(f"Scenario 1 (Inside radius): deliverable={res1['is_deliverable']}, fee=Rs {res1['delivery_fee']}, time={res1['estimated_time_text']}")
    assert res1["is_deliverable"] is True
    assert res1["delivery_fee"] == 30.0

    # Scenario 2: Outside radius (25 km away)
    res2 = check_store_hyperlocal_eligibility(
        store_latitude=store_lat,
        store_longitude=store_lon,
        store_location_name="FC Road Store",
        hyperlocal_enabled=True,
        hyperlocal_mode="radius",
        max_delivery_radius_km=7.0,
        min_order_value=150.0,
        base_delivery_fee=30.0,
        base_distance_km=3.0,
        per_km_fee=10.0,
        free_delivery_above=499.0,
        estimated_delivery_mins=40,
        serviceable_pincodes_type="specific",
        serviceable_pincodes=allowed_pins,
        customer_latitude=18.7000,
        customer_longitude=73.9900,
        customer_pincode="411005",
        cart_total=250.0,
    )
    print(f"Scenario 2 (Outside radius): deliverable={res2['is_deliverable']}, reason={res2['reason']}")
    assert res2["is_deliverable"] is False

    # Scenario 3: Pincode mode with allowed pincode
    res3 = check_store_hyperlocal_eligibility(
        store_latitude=store_lat,
        store_longitude=store_lon,
        store_location_name="FC Road Store",
        hyperlocal_enabled=True,
        hyperlocal_mode="pincode",
        max_delivery_radius_km=7.0,
        min_order_value=100.0,
        base_delivery_fee=25.0,
        base_distance_km=3.0,
        per_km_fee=10.0,
        free_delivery_above=499.0,
        estimated_delivery_mins=40,
        serviceable_pincodes_type="specific",
        serviceable_pincodes=allowed_pins,
        customer_latitude=None,
        customer_longitude=None,
        customer_pincode="411004",
        cart_total=200.0,
    )
    print(f"Scenario 3 (Allowed pincode): deliverable={res3['is_deliverable']}")
    assert res3["is_deliverable"] is True

    # Scenario 4: Pincode mode with unserviceable pincode
    res4 = check_store_hyperlocal_eligibility(
        store_latitude=store_lat,
        store_longitude=store_lon,
        store_location_name="FC Road Store",
        hyperlocal_enabled=True,
        hyperlocal_mode="pincode",
        max_delivery_radius_km=7.0,
        min_order_value=100.0,
        base_delivery_fee=25.0,
        base_distance_km=3.0,
        per_km_fee=10.0,
        free_delivery_above=499.0,
        estimated_delivery_mins=40,
        serviceable_pincodes_type="specific",
        serviceable_pincodes=allowed_pins,
        customer_latitude=None,
        customer_longitude=None,
        customer_pincode="411033",
        cart_total=200.0,
    )
    print(f"Scenario 4 (Blocked pincode): deliverable={res4['is_deliverable']}, reason={res4['reason']}")
    assert res4["is_deliverable"] is False

    # Scenario 5: Minimum order value not reached
    res5 = check_store_hyperlocal_eligibility(
        store_latitude=store_lat,
        store_longitude=store_lon,
        store_location_name="FC Road Store",
        hyperlocal_enabled=True,
        hyperlocal_mode="radius",
        max_delivery_radius_km=10.0,
        min_order_value=300.0,
        base_delivery_fee=30.0,
        base_distance_km=3.0,
        per_km_fee=10.0,
        free_delivery_above=499.0,
        estimated_delivery_mins=40,
        serviceable_pincodes_type="all",
        serviceable_pincodes=None,
        customer_latitude=18.5250,
        customer_longitude=73.8550,
        customer_pincode="411001",
        cart_total=180.0,  # Below 300
    )
    print(f"Scenario 5 (Min order not met): deliverable={res5['is_deliverable']}, reason={res5['reason']}")
    assert res5["is_deliverable"] is False
    assert res5["min_order_met"] is False
    print("[PASS] All eligibility scenarios passed!")


async def test_live_db_store():
    print("\n--- Test 5: Live Database Store Integration ---")
    async with async_session_factory() as session:
        stmt = select(PlatformStore).limit(1)
        store = (await session.execute(stmt)).scalar_one_or_none()
        if store:
            print(f"Store loaded from DB: {store.store_name} ({store.store_slug})")
            print(f"Hyperlocal enabled: {store.hyperlocal_enabled}, Mode: {store.hyperlocal_mode}")
            print(f"Base fee: Rs {store.base_delivery_fee}, Max radius: {store.max_delivery_radius_km} km")
            print("[PASS] Live database model mapping confirmed working!")
        else:
            print("No stores found in DB, skipping live row check.")


if __name__ == "__main__":
    test_haversine()
    test_pincode_filtering()
    test_delivery_fee_slabs()
    test_eligibility_scenarios()
    asyncio.run(test_live_db_store())
    print("\n==========================================")
    print("ALL BACKEND HYPERLOCAL TESTS PASSED SUCCESSFULLY!")
    print("==========================================")
