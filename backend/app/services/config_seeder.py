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
    }
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
