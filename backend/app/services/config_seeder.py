"""
Digital Growth Studio — Admin Configuration Seeder
"""
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.admin_config import AdminConfig

logger = structlog.get_logger()

DEFAULT_CONFIGS = {
    "pricing_plans": {
        "starter": {"name": "Starter", "price": 99, "campaign_limit": 1, "monthly_credits": 25},
        "growth": {"name": "Growth", "price": 999, "campaign_limit": 3, "monthly_credits": 150},
        "pro": {"name": "Pro", "price": 2999, "campaign_limit": 5, "monthly_credits": 350},
        "agency": {"name": "Agency", "price": 4999, "campaign_limit": 10, "monthly_credits": 500}
    },
    "credit_packs": [
        {"id": "pack_100", "name": "100 AI Credits", "credits": 100, "price": 199},
        {"id": "pack_500", "name": "500 AI Credits", "credits": 500, "price": 949},
        {"id": "pack_1000", "name": "1,000 AI Credits", "credits": 1000, "price": 1899},
        {"id": "pack_3000", "name": "3,000 AI Credits", "credits": 3000, "price": 5799},
        {"id": "pack_5000", "name": "5,000 AI Credits", "credits": 5000, "price": 8999}
    ],
    "additional_campaign_pricing": {
        "price": 99,
        "addon_id": "additional_optimization_campaign"
    },
    "meta_ads_services_pricing": {
        "first_ad_offer": {
            "service_name": "Meta Ad Management (First Ad Promotional Offer)",
            "regular_price": 1499,
            "offer_price": 333,
            "currency": "INR",
            "validity_days": 30,
            "active": True,
            "start_date": "2026-08-23T00:00:00Z",
            "end_date": "2026-12-31T23:59:59Z",
            "new_customer_only": True,
            "requires_starter": True,
            "non_refundable": True
        },
        "account_setup_service": {
            "service_name": "Meta Ad Account Setup Service",
            "regular_price": 4999,
            "offer_price": 2999,
            "currency": "INR",
            "active": True,
            "non_refundable": True
        },
        "creative_design_service": {
            "service_name": "Creative Design Service",
            "regular_price": 1299,
            "offer_price": 499,
            "currency": "INR",
            "active": True,
            "non_refundable": True
        }
    },
    "meta_ads_ad_packs": [
        {
            "id": "pack_1",
            "pack_name": "1 Ad Pack",
            "ad_quantity": 1,
            "price_per_ad": 999,
            "total_price": 999,
            "validity_days": 30,
            "regular_price": 1499,
            "offer_price": 999,
            "active": True
        },
        {
            "id": "pack_3",
            "pack_name": "3 Ads Pack",
            "ad_quantity": 3,
            "price_per_ad": 799,
            "total_price": 2397,
            "validity_days": 30,
            "regular_price": 2997,
            "offer_price": 2397,
            "active": True
        },
        {
            "id": "pack_15",
            "pack_name": "15 Ads Pack",
            "ad_quantity": 15,
            "price_per_ad": 499,
            "total_price": 7485,
            "validity_days": 60,
            "regular_price": 22485,
            "offer_price": 7485,
            "active": True
        },
        {
            "id": "pack_30",
            "pack_name": "30 Ads Pack",
            "ad_quantity": 30,
            "price_per_ad": 333,
            "total_price": 9990,
            "validity_days": 90,
            "regular_price": 44970,
            "offer_price": 9990,
            "active": True
        }
    ],
    "meta_ads_additional_services": [
        {"id": "copywriting", "name": "Professional Copywriting", "regular_price": 999, "offer_price": 499, "instant": True, "active": True},
        {"id": "creative_design", "name": "Creative Design (Banner/Image)", "regular_price": 1299, "offer_price": 499, "instant": True, "active": True},
        {"id": "video_editing", "name": "Premium Video Editing (Reels/Shorts)", "regular_price": 4999, "offer_price": 2999, "instant": False, "active": True},
        {"id": "pixel_setup", "name": "Meta Pixel Setup & Verification", "regular_price": 1999, "offer_price": 999, "instant": True, "active": True},
        {"id": "conversion_api", "name": "Conversions API (CAPI) Integration", "regular_price": 2999, "offer_price": 1499, "instant": True, "active": True},
        {"id": "catalog_setup", "name": "Commerce Catalog Setup", "regular_price": 2999, "offer_price": 1999, "instant": False, "active": True},
        {"id": "product_feed", "name": "Dynamic Product Feed Integration", "regular_price": 3999, "offer_price": 2499, "instant": False, "active": True},
        {"id": "landing_page", "name": "Custom Landing Page Design & Setup", "regular_price": 9999, "offer_price": 5999, "instant": False, "active": True},
        {"id": "tracking_setup", "name": "Google Tag Manager & GA4 Tracking", "regular_price": 1999, "offer_price": 999, "instant": True, "active": True},
        {"id": "whatsapp_integration", "name": "WhatsApp Business API CRM Setup", "regular_price": 2999, "offer_price": 1499, "instant": True, "active": True},
        {"id": "lead_crm", "name": "Lead CRM Automation Integration", "regular_price": 3999, "offer_price": 2499, "instant": False, "active": True}
    ]
}


async def seed_admin_configs(db: AsyncSession) -> None:
    """
    Checks if configurations are seeded in the database. If not, seeds them.
    Also provides a helper to dynamically read them in the application.
    """
    for key, value in DEFAULT_CONFIGS.items():
        stmt = select(AdminConfig).where(AdminConfig.key == key)
        res = await db.execute(stmt)
        config_record = res.scalar_one_or_none()
        
        if not config_record:
            logger.info("seeding_admin_config_key", key=key)
            new_cfg = AdminConfig(key=key, value=value)
            db.add(new_cfg)
        else:
            # Optionally update defaults to make sure they match exact spec on first load
            # to avoid stale DB entries from prior trials
            config_record.value = value
            db.add(config_record)
            
    await db.commit()
    logger.info("admin_configs_seeding_complete")


async def get_admin_config_value(db: AsyncSession, key: str) -> dict:
    """
    Helper to fetch a configuration value from the DB.
    Falls back to DEFAULT_CONFIGS if DB doesn't have it or fails.
    """
    try:
        stmt = select(AdminConfig).where(AdminConfig.key == key)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
        if record:
            return record.value
    except Exception as ex:
        logger.error("failed_reading_admin_config", key=key, error=str(ex))
    return DEFAULT_CONFIGS.get(key)
