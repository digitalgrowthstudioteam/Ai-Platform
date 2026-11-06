import asyncio
import asyncpg
import json
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(env_path)

DB_URL = os.getenv("DATABASE_URL", "")
if DB_URL.startswith("postgresql+asyncpg://"):
    DB_URL = DB_URL.replace("postgresql+asyncpg://", "postgresql://", 1)

DEFAULT_CREDIT_SETTINGS = {
    "welcome_credits": 5,
    "import_product_credit_cost": 1,
    "image_studio_credit_cost": 2,
    "credit_packs": [
        {
            "id": "pack_starter",
            "name": "Starter Pack",
            "credits": 25,
            "price_inr": 99,
            "tag": "Standard",
            "popular": False,
            "active": True
        },
        {
            "id": "pack_growth",
            "name": "Growth Pack",
            "credits": 75,
            "price_inr": 249,
            "tag": "Most Popular",
            "popular": True,
            "active": True
        },
        {
            "id": "pack_pro",
            "name": "Pro Merchant Pack",
            "credits": 250,
            "price_inr": 599,
            "tag": "Best Value",
            "popular": False,
            "active": True
        }
    ]
}

async def run_migration():
    conn = await asyncpg.connect(DB_URL, ssl="require", statement_cache_size=0)
    print("Connected to PostgreSQL database...")

    # 1. Add ai_credits to platform_vendors if not exists
    print("Adding ai_credits column to platform_vendors...")
    await conn.execute("""
        ALTER TABLE platform_vendors 
        ADD COLUMN IF NOT EXISTS ai_credits INTEGER NOT NULL DEFAULT 5;
    """)

    # Ensure existing vendors have at least 5 credits
    await conn.execute("""
        UPDATE platform_vendors 
        SET ai_credits = 5 
        WHERE ai_credits IS NULL OR ai_credits < 5;
    """)
    print("Vendor ai_credits initialized.")

    # 2. Create platform_credit_transactions table
    print("Creating platform_credit_transactions table...")
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS platform_credit_transactions (
            id UUID PRIMARY KEY,
            vendor_id UUID NOT NULL REFERENCES platform_vendors(id) ON DELETE CASCADE,
            amount INTEGER NOT NULL,
            balance_after INTEGER NOT NULL,
            action VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            reference_id VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_credit_tx_vendor ON platform_credit_transactions(vendor_id);
        CREATE INDEX IF NOT EXISTS idx_credit_tx_action ON platform_credit_transactions(action);
    """)
    print("platform_credit_transactions table ready.")

    # 3. Seed default credit settings in platform_settings
    print("Seeding ai_credit_settings in platform_settings...")
    row = await conn.fetchrow("SELECT key FROM platform_settings WHERE key = 'ai_credit_settings'")
    if not row:
        await conn.execute(
            """
            INSERT INTO platform_settings (id, key, value, description, created_at, updated_at)
            VALUES (gen_random_uuid(), 'ai_credit_settings', $1, 'Global AI Credits pricing, action costs, and pack configurations', NOW(), NOW())
            """,
            json.dumps(DEFAULT_CREDIT_SETTINGS)
        )
        print("Inserted default ai_credit_settings.")
    else:
        print("ai_credit_settings already exists in platform_settings.")

    # 4. Verify vendor credit balances
    vendors = await conn.fetch("SELECT vendor_code, ai_credits FROM platform_vendors LIMIT 5")
    print(f"Sample vendors credit status:")
    for v in vendors:
        print(f" - {v['vendor_code']}: {v['ai_credits']} AI Credits")

    await conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
