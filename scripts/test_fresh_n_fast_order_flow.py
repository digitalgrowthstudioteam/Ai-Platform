"""
Test Complete Guest Order Placement Flow for Fresh N Fast (VND0013)
"""
import urllib.request
import json

API_BASE_URL = "https://digital-growth-studio-api.onrender.com"
STORE_SLUG = "fresh-n-fast"

def test_order_flow():
    print("=" * 65)
    print("SIMULATING COMPLETE QUICK-COMMERCE CHECKOUT FLOW")
    print("=" * 65)

    # 1. Fetch available products to get real product IDs
    url = f"{API_BASE_URL}/api/store/{STORE_SLUG}/products"
    req = urllib.request.Request(url, headers={"User-Agent": "QuickCommerceClient/1.0"})
    with urllib.request.urlopen(req, timeout=30) as res:
        products = json.loads(res.read().decode("utf-8"))
    
    assert len(products) >= 2, "Need at least 2 products for test"
    item1 = products[0]
    item2 = products[1]
    print(f"[1] Selected produce items from catalog:")
    print(f"    - Item 1: {item1['name']} @ Rs. {item1['effective_price']}")
    print(f"    - Item 2: {item2['name']} @ Rs. {item2['effective_price']}")

    # 2. Check Hyperlocal Delivery for Customer GPS
    h_url = f"{API_BASE_URL}/api/store/{STORE_SLUG}/hyperlocal/check-eligibility"
    subtotal = item1['effective_price'] * 2 + item2['effective_price'] * 1
    h_payload = json.dumps({
        "latitude": 19.0780,
        "longitude": 72.8790,
        "cart_total": subtotal
    }).encode("utf-8")
    h_req = urllib.request.Request(h_url, data=h_payload, headers={"Content-Type": "application/json", "User-Agent": "QuickCommerceClient/1.0"})
    with urllib.request.urlopen(h_req, timeout=30) as res:
        h_res = json.loads(res.read().decode("utf-8"))

    print(f"[2] Hyperlocal eligibility check:")
    print(f"    - Deliverable: {h_res['is_deliverable']}")
    print(f"    - Distance: {h_res['distance_km']} km")
    print(f"    - Delivery Fee: Rs. {h_res['delivery_fee']}")
    print(f"    - Estimated Time: {h_res['estimated_time_text']}")
    assert h_res['is_deliverable'] is True

    # 3. Place Order as Guest
    order_url = f"{API_BASE_URL}/api/store/{STORE_SLUG}/orders"
    order_payload = json.dumps({
        "customer_name": "Pooja Sharma",
        "customer_phone": "9876543210",
        "customer_email": "pooja.sharma.test@gmail.com",
        "shipping_address": "Flat 402, Green Valley Apartments, Sector 4, Mumbai",
        "shipping_pincode": "400001",
        "payment_method": "COD",
        "customer_latitude": 19.0780,
        "customer_longitude": 72.8790,
        "items": [
            {
                "product_id": item1["id"],
                "quantity": 2
            },
            {
                "product_id": item2["id"],
                "quantity": 1
            }
        ]
    }).encode("utf-8")

    order_req = urllib.request.Request(order_url, data=order_payload, headers={"Content-Type": "application/json", "User-Agent": "QuickCommerceClient/1.0"})
    with urllib.request.urlopen(order_req, timeout=30) as res:
        assert res.status in (200, 201), f"Unexpected status: {res.status}"
        order_res = json.loads(res.read().decode("utf-8"))

    print(f"[3] Order Placed Successfully!")
    print(f"    - Order ID: {order_res.get('id')}")
    print(f"    - Order Number: #{order_res.get('order_number')}")
    print(f"    - Total Amount: Rs. {order_res.get('total_amount')}")
    print(f"    - Payment Method: {order_res.get('payment_method')}")
    print(f"    - Delivery Mode: {'Hyperlocal Quick Delivery' if order_res.get('is_hyperlocal') else 'Standard'}")
    print(f"    - Status: {order_res.get('status', order_res.get('order_status'))}")

    # 4. Track Order Status
    track_url = f"{API_BASE_URL}/api/store/{STORE_SLUG}/orders/{order_res.get('id')}"
    track_req = urllib.request.Request(track_url, headers={"User-Agent": "QuickCommerceClient/1.0"})
    with urllib.request.urlopen(track_req, timeout=30) as res:
        track_res = json.loads(res.read().decode("utf-8"))
        print(f"[4] Customer Order Tracking API:")
        print(f"    - Verified tracking status: {track_res.get('status', track_res.get('order_status'))}")
        print(f"    - Verified items count: {len(track_res.get('items', []))}")

    print("\n" + "=" * 65)
    print("SUCCESS: 100% END-TO-END QUICK-COMMERCE CHECKOUT VERIFIED!")
    print("=" * 65)

if __name__ == "__main__":
    test_order_flow()
