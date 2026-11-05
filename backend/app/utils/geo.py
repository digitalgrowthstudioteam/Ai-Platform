"""
Digital Growth Studio — Hyperlocal Distance & Delivery Calculation Utility
Uses Haversine formula with urban road detour factor and pincode matching.
"""
import math
import re
from typing import Optional, Set, Tuple, Dict, Any


def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    road_factor: float = 1.25,
) -> float:
    """
    Calculate estimated driving distance in kilometers between two geographic coordinates
    using the Haversine formula adjusted for urban road curvature.
    """
    earth_radius_km = 6371.0

    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(d_lon / 2.0) ** 2
    )
    c = 2.0 * math.asin(math.sqrt(max(0.0, min(1.0, a))))
    straight_line_km = earth_radius_km * c

    # Apply road detour factor (1.25 accounts for road network routing vs straight line)
    road_distance_km = straight_line_km * road_factor
    return round(road_distance_km, 2)


def parse_serviceable_pincodes(pincodes_str: Optional[str]) -> Set[str]:
    """Parse comma, space, newline, or semicolon-delimited pincode strings into a clean set."""
    if not pincodes_str:
        return set()
    tokens = re.split(r"[,;\s\n\r]+", pincodes_str.strip())
    return {t.strip() for t in tokens if t.strip()}


def is_pincode_serviceable(
    customer_pincode: Optional[str],
    serviceable_pincodes_type: str,
    serviceable_pincodes: Optional[str],
) -> bool:
    """Check if customer's delivery pincode is serviceable by the vendor."""
    mode = (serviceable_pincodes_type or "all").lower().strip()
    if mode == "all":
        return True

    if not customer_pincode:
        return False

    clean_pincode = customer_pincode.strip()
    allowed = parse_serviceable_pincodes(serviceable_pincodes)
    return clean_pincode in allowed


def calculate_delivery_fee(
    distance_km: float,
    order_total: float,
    base_fee: float = 30.0,
    base_distance_km: float = 3.0,
    per_km_fee: float = 10.0,
    free_delivery_above: Optional[float] = 499.0,
) -> float:
    """
    Calculate distance-slab delivery fee:
    - If order_total >= free_delivery_above, fee is 0.0
    - If distance <= base_distance_km, fee is base_fee
    - If distance > base_distance_km, fee is base_fee + (extra_km * per_km_fee)
    """
    if free_delivery_above and free_delivery_above > 0 and order_total >= free_delivery_above:
        return 0.0

    if distance_km <= base_distance_km:
        return round(max(0.0, base_fee), 2)

    extra_km = distance_km - base_distance_km
    calculated = base_fee + (extra_km * per_km_fee)
    return round(max(0.0, calculated), 2)


def check_store_hyperlocal_eligibility(
    store_latitude: Optional[float],
    store_longitude: Optional[float],
    store_location_name: Optional[str],
    hyperlocal_enabled: bool,
    hyperlocal_mode: str,  # "radius", "pincode", "both"
    max_delivery_radius_km: float,
    min_order_value: float,
    base_delivery_fee: float,
    base_distance_km: float,
    per_km_fee: float,
    free_delivery_above: Optional[float],
    estimated_delivery_mins: int,
    serviceable_pincodes_type: str,
    serviceable_pincodes: Optional[str],
    customer_latitude: Optional[float],
    customer_longitude: Optional[float],
    customer_pincode: Optional[str],
    cart_total: float = 0.0,
) -> Dict[str, Any]:
    """
    Evaluate whether a customer is eligible for hyperlocal delivery and calculate delivery fee.
    """
    if not hyperlocal_enabled:
        return {
            "hyperlocal_enabled": False,
            "is_deliverable": True,
            "distance_km": None,
            "delivery_fee": 0.0,
            "estimated_time_text": "3-5 Business Days",
            "store_location_name": store_location_name,
            "min_order_value": min_order_value,
            "min_order_met": True,
            "free_delivery_above": free_delivery_above,
            "free_delivery_remaining": 0.0,
            "reason": None,
            "mode": "standard",
        }

    mode = (hyperlocal_mode or "radius").lower().strip()
    distance_km: Optional[float] = None
    radius_eligible = False
    pincode_eligible = False
    reasons = []

    # 1. Radius Check
    if mode in ("radius", "both"):
        if store_latitude is not None and store_longitude is not None and customer_latitude is not None and customer_longitude is not None:
            distance_km = haversine_distance(
                store_latitude, store_longitude, customer_latitude, customer_longitude
            )
            if distance_km <= max_delivery_radius_km:
                radius_eligible = True
            else:
                reasons.append(
                    f"Delivery distance ({distance_km} km) exceeds maximum service radius of {max_delivery_radius_km} km"
                )
        else:
            if mode == "radius":
                reasons.append("Customer GPS coordinates or store location not available for radius calculation")

    # 2. Pincode Check
    if mode in ("pincode", "both"):
        pincode_eligible = is_pincode_serviceable(
            customer_pincode, serviceable_pincodes_type, serviceable_pincodes
        )
        if not pincode_eligible and customer_pincode:
            reasons.append(f"Pincode {customer_pincode} is not currently serviceable by this store")
        elif not pincode_eligible and not customer_pincode:
            reasons.append("Delivery pincode is required to verify serviceability")

    # Determine Overall Deliverability based on mode
    if mode == "radius":
        is_deliverable = radius_eligible
    elif mode == "pincode":
        is_deliverable = pincode_eligible
    elif mode == "both":
        is_deliverable = radius_eligible or pincode_eligible
    else:
        is_deliverable = radius_eligible

    # Calculate delivery fee
    effective_distance = distance_km if distance_km is not None else 1.0
    fee = calculate_delivery_fee(
        distance_km=effective_distance,
        order_total=cart_total,
        base_fee=base_delivery_fee,
        base_distance_km=base_distance_km,
        per_km_fee=per_km_fee,
        free_delivery_above=free_delivery_above,
    )

    # Minimum order value check
    min_order_met = True
    if min_order_value > 0 and cart_total < min_order_value:
        min_order_met = False
        reasons.append(
            f"Minimum order of Rs. {min_order_value:.0f} required for hyperlocal delivery (Add Rs. {min_order_value - cart_total:.0f} more)"
        )

    # Free delivery remaining calculation
    free_remaining = 0.0
    if free_delivery_above and free_delivery_above > 0:
        free_remaining = max(0.0, round(free_delivery_above - cart_total, 2))

    # Time estimate text
    base_mins = estimated_delivery_mins if estimated_delivery_mins > 0 else 45
    if distance_km:
        # Dynamic scale with traffic buffer (+2 mins per km above base)
        extra_traffic_mins = int(max(0.0, (distance_km - 3.0) * 2))
        total_mins = base_mins + extra_traffic_mins
        min_mins = max(15, total_mins - 10)
        time_text = f"{min_mins}-{total_mins} mins"
    else:
        time_text = f"{base_mins} mins"

    return {
        "hyperlocal_enabled": True,
        "is_deliverable": is_deliverable and min_order_met,
        "location_serviceable": is_deliverable,
        "distance_km": distance_km,
        "delivery_fee": fee if is_deliverable else 0.0,
        "estimated_time_text": time_text,
        "store_location_name": store_location_name or "Store",
        "min_order_value": min_order_value,
        "min_order_met": min_order_met,
        "free_delivery_above": free_delivery_above,
        "free_delivery_remaining": free_remaining,
        "reason": "; ".join(reasons) if not (is_deliverable and min_order_met) else None,
        "mode": mode,
    }
