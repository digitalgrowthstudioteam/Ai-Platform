"""
Digital Growth Studio — Meta Ads Service Eligibility and Quotation Engine
"""
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.ads_service import MetaAdServiceRequest, ServiceQuotation
from app.services.config_seeder import get_admin_config_value

# Restricted keywords pattern
RESTRICTED_KEYWORDS = [
    r"drug", r"marijuana", r"cannabis", r"weed", r"cocaine", r"heroin", r"meth", r"substance",
    r"gambling", r"betting", r"casino", r"poker", r"slot machine", r"wagering", r"lottery",
    r"weapon", r"gun", r"rifle", r"pistol", r"knife", r"ammunition", r"explosive", r"bomb",
    r"adult", r"sexual", r"explicit", r"porn", r"escort", r"erotic", r"sensual massage",
    r"counterfeit", r"fake rolex", r"replica product",
    r"financial scheme", r"ponzi", r"pyramid scheme", r"crypto get rich", r"loan shark",
    r"tobacco", r"cigarette", r"vape", r"vaping", r"hookah",
]

def check_text_restrictions(text: str) -> Optional[str]:
    """
    Checks if a text string contains any restricted keywords.
    Returns the matched category or None.
    """
    if not text:
        return None
    text_lower = text.lower()
    for kw in RESTRICTED_KEYWORDS:
        if re.search(r"\b" + kw + r"\b", text_lower) or kw in text_lower:
            return kw
    return None


async def evaluate_service_eligibility(
    db: AsyncSession,
    user: User,
    request_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluates request parameters (industry, descriptions) for Ads Service eligibility.
    If ineligible, flags user.ads_service_eligible = False and user.restriction_reason.
    """
    # 0. Check admin manual override approval
    if user.restriction_reason == "Category Approved by Admin Override":
        return {
            "eligible": True,
            "reason": None
        }

    # 1. Check if user is already restricted by admin (non-automatic)
    if user.ads_service_eligible == False:
        if not (user.restriction_reason and user.restriction_reason.startswith("Prohibited category detected")):
            return {
                "eligible": False,
                "reason": user.restriction_reason or "restricted_industry"
            }

    # 2. Check input values
    industry = request_data.get("industry", "")
    industry_other = request_data.get("industry_other", "")
    business_description = request_data.get("business_description", "")
    advertised_product = request_data.get("advertised_product", "")
    campaign_objective = request_data.get("campaign_objective", "")

    # Combine text for testing
    texts_to_check = [
        industry,
        industry_other,
        business_description,
        advertised_product,
        campaign_objective
    ]

    for txt in texts_to_check:
        matched_keyword = check_text_restrictions(txt)
        if matched_keyword:
            # Set restriction flags
            user.ads_service_eligible = False
            user.restriction_reason = f"Prohibited category detected (matched keyword: '{matched_keyword}')"
            db.add(user)
            await db.commit()
            return {
                "eligible": False,
                "reason": user.restriction_reason
            }

    # If we got here, current inputs are clean.
    # If they were previously automatically restricted, restore eligibility.
    if user.ads_service_eligible == False:
        user.ads_service_eligible = True
        user.restriction_reason = None
        db.add(user)
        await db.commit()

    return {
        "eligible": True,
        "reason": None
    }


async def calculate_quotation(
    db: AsyncSession,
    user: User,
    req: MetaAdServiceRequest
) -> Dict[str, Any]:
    """
    Recalculates service quotation dynamically using backend config records.
    Returns quotation details (Regular Total, Discount Total, Final Total, Line Items).
    """
    # Fetch admin configs
    services_pricing = await get_admin_config_value(db, "meta_ads_services_pricing")
    ad_packs_pricing = await get_admin_config_value(db, "meta_ads_ad_packs")

    items = []
    regular_total_paise = 0
    final_total_paise = 0

    # 1. Base Ad Management Fee
    # Check if first ad & user is eligible for ₹333 promo offer
    first_ad_offer = services_pricing.get("first_ad_offer", {})
    
    # Check if any user with this email has ever used the intro offer (lifetime check)
    stmt_lifetime = select(User.intro_offer_used).where(
        User.email == user.email,
        User.intro_offer_used == True
    )
    res_lifetime = await db.execute(stmt_lifetime)
    has_used_lifetime = res_lifetime.scalar() is not None

    # Check if this user has any other pending quotation containing the promo item
    stmt_pending_promo = select(ServiceQuotation).where(
        ServiceQuotation.user_id == user.id,
        ServiceQuotation.status == "pending"
    )
    res_pending_promo = await db.execute(stmt_pending_promo)
    pending_quotes = res_pending_promo.scalars().all()
    
    has_pending_promo = False
    for pq in pending_quotes:
        if pq.service_request_id != req.id:
            # Check if this pending quotation contains the promo item
            for item in (pq.items or []):
                if item.get("service_type") == "ad_management_promo":
                    has_pending_promo = True
                    break
            if has_pending_promo:
                break

    # Check if this user has ever paid for any custom quotation
    stmt_paid_quote = select(ServiceQuotation).where(
        ServiceQuotation.user_id == user.id,
        ServiceQuotation.status == "paid"
    ).limit(1)
    res_paid_quote = await db.execute(stmt_paid_quote)
    has_paid_quote = res_paid_quote.scalar_one_or_none() is not None

    # Check if this user has any active paid subscriptions (growth/scale plan)
    from app.models.subscription import Subscription
    stmt_paid_sub = select(Subscription).where(
        Subscription.user_id == user.id,
        Subscription.plan.in_(["growth", "scale"]),
        Subscription.status == "active"
    ).limit(1)
    res_paid_sub = await db.execute(stmt_paid_sub)
    has_paid_sub = res_paid_sub.scalar_one_or_none() is not None

    # Check if this user has any active paid AdPack
    from app.models.ads_service import AdPack
    stmt_paid_pack = select(AdPack).where(
        AdPack.user_id == user.id,
        AdPack.status == "active"
    ).limit(1)
    res_paid_pack = await db.execute(stmt_paid_pack)
    has_paid_pack = res_paid_pack.scalar_one_or_none() is not None

    has_paid_anything = has_paid_quote or has_paid_sub or has_paid_pack

    is_promo_eligible = (
        user.intro_offer_eligible 
        and not user.intro_offer_used 
        and not has_used_lifetime
        and not has_pending_promo
        and not has_paid_anything
        and first_ad_offer.get("active", True)
    )

    # Validate promo offer validity date window
    if is_promo_eligible:
        start_str = first_ad_offer.get("start_date")
        end_str = first_ad_offer.get("end_date")
        now_utc = datetime.utcnow().replace(tzinfo=timezone.utc)
        
        if start_str:
            try:
                start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                if now_utc < start_dt:
                    is_promo_eligible = False
            except Exception:
                pass
        if end_str:
            try:
                end_dt = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
                if now_utc > end_dt:
                    is_promo_eligible = False
            except Exception:
                pass

    number_of_ads = req.number_of_ads or 1

    if is_promo_eligible and number_of_ads == 1:
        # First ad only promo
        reg_price = int(first_ad_offer.get("regular_price", 1499)) * 100
        offer_price = int(first_ad_offer.get("offer_price", 333)) * 100
        
        items.append({
            "service_type": "ad_management_promo",
            "description": "Meta Ad Management (First Ad Promotional Offer)",
            "quantity": 1,
            "regular_unit_price": reg_price,
            "offer_unit_price": offer_price,
            "regular_total": reg_price,
            "offer_total": offer_price,
            "validity_days": first_ad_offer.get("validity_days", 30)
        })
        regular_total_paise += reg_price
        final_total_paise += offer_price
    else:
        # Quantity-based pricing tiers matching database configuration
        # Sort ad packs by quantity ascending
        sorted_packs = sorted(ad_packs_pricing, key=lambda x: x.get("ad_quantity", 0))
        
        matched_pack = None
        for pack in sorted_packs:
            if pack.get("active", True) and number_of_ads <= pack.get("ad_quantity", 0):
                matched_pack = pack
                break

        if not matched_pack:
            # Fallback to the highest active pack
            active_packs = [p for p in sorted_packs if p.get("active", True)]
            if active_packs:
                matched_pack = active_packs[-1]

        if matched_pack:
            unit_offer = int(matched_pack.get("price_per_ad", matched_pack.get("offer_price", matched_pack.get("price", 999)))) * 100
            
            pack_qty = matched_pack.get("ad_quantity", 1)
            reg_price_val = matched_pack.get("regular_price")
            if reg_price_val is not None:
                if pack_qty > 0 and matched_pack.get("id") != "pack_5":
                    unit_reg = int(int(reg_price_val) / pack_qty) * 100
                else:
                    unit_reg = int(reg_price_val) * 100
            else:
                unit_reg = 1499 * 100

            validity_days = matched_pack.get("validity_days", 30)
        else:
            unit_reg = 1499 * 100
            unit_offer = 999 * 100
            validity_days = 30

        total_reg = unit_reg * number_of_ads
        total_offer = unit_offer * number_of_ads

        items.append({
            "service_type": "ad_management_standard",
            "description": f"Meta Ad Management - Standard ({number_of_ads} Ads)",
            "quantity": number_of_ads,
            "regular_unit_price": unit_reg,
            "offer_unit_price": unit_offer,
            "regular_total": total_reg,
            "offer_total": total_offer,
            "validity_days": validity_days
        })
        regular_total_paise += total_reg
        final_total_paise += total_offer

    # 2. Meta Ad Account Setup Fee (if setup required)
    if not req.meta_account_exists:
        setup_pricing = services_pricing.get("account_setup_service", {})
        reg_setup = int(setup_pricing.get("regular_price", 4999)) * 100
        offer_setup = int(setup_pricing.get("offer_price", 2999)) * 100
        
        items.append({
            "service_type": "account_setup",
            "description": "Meta Ad Account Setup Service (One-time Setup)",
            "quantity": 1,
            "regular_unit_price": reg_setup,
            "offer_unit_price": offer_setup,
            "regular_total": reg_setup,
            "offer_total": offer_setup,
            "validity_days": 0
        })
        regular_total_paise += reg_setup
        final_total_paise += offer_setup

    # 3. Creative Design Service Fee (if creative design required)
    if req.creative_required:
        creative_pricing = services_pricing.get("creative_design_service", {})
        reg_creative = int(creative_pricing.get("regular_price", 1299)) * 100
        offer_creative = int(creative_pricing.get("offer_price", 499)) * 100
        
        items.append({
            "service_type": "creative_design",
            "description": "Creative Design Service (Ad Visual Asset Design)",
            "quantity": 1,
            "regular_unit_price": reg_creative,
            "offer_unit_price": offer_creative,
            "regular_total": reg_creative,
            "offer_total": offer_creative,
            "validity_days": 0
        })
        regular_total_paise += reg_creative
        final_total_paise += offer_creative

    # 4. Additional Services (if selected)
    additional_services_pricing = await get_admin_config_value(db, "meta_ads_additional_services")
    for svc_id in req.additional_services:
        matched_svc = None
        for s in additional_services_pricing:
            if s.get("id") == svc_id:
                matched_svc = s
                break

        if matched_svc:
            reg_svc = int(matched_svc.get("regular_price", 1999)) * 100
            offer_svc = int(matched_svc.get("offer_price", 999)) * 100
            instant = matched_svc.get("instant", True)
            
            items.append({
                "service_type": f"additional_{svc_id}",
                "description": matched_svc.get("name"),
                "quantity": 1,
                "regular_unit_price": reg_svc,
                "offer_unit_price": offer_svc,
                "regular_total": reg_svc,
                "offer_total": offer_svc if instant else 0,  # custom quote required flags
                "custom_quote_required": not instant
            })
            regular_total_paise += reg_svc
            if instant:
                final_total_paise += offer_svc

    discount_total_paise = regular_total_paise - final_total_paise

    return {
        "regular_total": regular_total_paise,
        "discount_total": discount_total_paise,
        "final_total": final_total_paise,
        "items": items
    }
