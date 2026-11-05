"""
Migration script to add Hyperlocal Delivery columns to platform_stores.
Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS).
"""
import asyncio
from sqlalchemy import text
from app.database import engine


async def run_migration():
    print("Connecting to database and running Hyperlocal migration...")
    async with engine.begin() as conn:
        statements = [
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS hyperlocal_enabled BOOLEAN NOT NULL DEFAULT FALSE;",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS hyperlocal_mode VARCHAR(50) NOT NULL DEFAULT 'radius';",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS store_latitude DOUBLE PRECISION NULL;",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS store_longitude DOUBLE PRECISION NULL;",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS store_location_name VARCHAR(255) NULL;",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS max_delivery_radius_km DOUBLE PRECISION NOT NULL DEFAULT 10.0;",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS min_order_value DOUBLE PRECISION NOT NULL DEFAULT 0.0;",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS base_delivery_fee DOUBLE PRECISION NOT NULL DEFAULT 30.0;",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS base_distance_km DOUBLE PRECISION NOT NULL DEFAULT 3.0;",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS per_km_fee DOUBLE PRECISION NOT NULL DEFAULT 10.0;",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS free_delivery_above DOUBLE PRECISION NULL DEFAULT 499.0;",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS estimated_delivery_mins INTEGER NOT NULL DEFAULT 45;",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS serviceable_pincodes_type VARCHAR(50) NOT NULL DEFAULT 'all';",
            "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS serviceable_pincodes TEXT NULL;",
        ]

        for stmt in statements:
            col = stmt.split()[5]
            print(f"Applying: {col}...")
            await conn.execute(text(stmt))

    print("Hyperlocal migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_migration())

