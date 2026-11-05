import asyncio
import asyncpg
import os
from dotenv import dotenv_values

backend_dir = os.path.dirname(os.path.abspath(__file__))
env_vars = dotenv_values(os.path.join(backend_dir, ".env"))
db_url = env_vars.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

async def update_theme():
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        await conn.execute(
            """
            UPDATE platform_stores
            SET primary_color = '#0B192C',
                secondary_color = '#DB2777'
            WHERE store_slug = 'glam-stree-nails'
            """
        )
        row = await conn.fetchrow(
            "SELECT store_name, store_slug, primary_color, secondary_color, razorpay_enabled, razorpay_key_id FROM platform_stores WHERE store_slug = 'glam-stree-nails'"
        )
        print("Updated Glam Stree Store:", dict(row))
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(update_theme())
