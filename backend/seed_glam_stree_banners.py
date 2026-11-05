import asyncio
import asyncpg
import os
import uuid
from datetime import datetime, timezone
from dotenv import dotenv_values

backend_dir = os.path.dirname(os.path.abspath(__file__))
env_vars = dotenv_values(os.path.join(backend_dir, ".env"))
db_url = env_vars.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

TARGET_VENDORS = [
    uuid.UUID("96c282a1-5710-46f2-87f9-425f074fc6c4"), # VND0010 (Glam stree nails)
    uuid.UUID("807fb299-5164-40ac-8c9a-2008955768cf"), # VND0007 (DGS)
]

BANNERS_DATA = [
    {
        "title": "Salon-Grade Press On Nails",
        "description": "Flat 10% Off on your first order with coupon FIRST10",
        "promo_offer": "FLAT 10% OFF",
        "image_url": "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=80",
        "link_url": "/categories?cat=bestsellers",
        "sort_order": 0,
    },
    {
        "title": "Bridal & Wedding Collection",
        "description": "Handcrafted luxury nails reusable 5+ times with salon UV gel finish",
        "promo_offer": "NEW ARRIVALS",
        "image_url": "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=1200&q=80",
        "link_url": "/categories?cat=party-bridal",
        "sort_order": 1,
    },
    {
        "title": "Free Application Kit Included",
        "description": "Includes dual buffer, wooden cuticle stick, prep pads & ultra-bond glue",
        "promo_offer": "FREE GIFT WORTH ₹299",
        "image_url": "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=1200&q=80",
        "link_url": "/categories",
        "sort_order": 2,
    },
]

async def seed_banners():
    conn = await asyncpg.connect(db_url)
    try:
        now = datetime.now(timezone.utc)
        for vid in TARGET_VENDORS:
            # Check existing banners count
            existing = await conn.fetch("SELECT id FROM platform_banners WHERE vendor_id = $1", vid)
            if len(existing) == 0:
                print(f"Seeding {len(BANNERS_DATA)} banners for vendor {vid}...")
                for b in BANNERS_DATA:
                    banner_id = uuid.uuid4()
                    await conn.execute(
                        """
                        INSERT INTO platform_banners (
                            id, vendor_id, title, description, promo_offer, image_url, link_url, sort_order, is_active, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $9)
                        """,
                        banner_id, vid, b["title"], b["description"], b["promo_offer"], b["image_url"], b["link_url"], b["sort_order"], now
                    )
                print(f"Banners successfully seeded for vendor {vid}!")
            else:
                print(f"Vendor {vid} already has {len(existing)} banners.")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(seed_banners())
