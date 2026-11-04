import asyncio
import sys
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(env_path)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import engine
from sqlalchemy import text

STATEMENTS = [
    "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_gateway_enabled BOOLEAN NOT NULL DEFAULT FALSE;",
    "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_provider VARCHAR(50) NOT NULL DEFAULT 'FAST2SMS';",
    "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_api_key VARCHAR(255);",
    "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_sender_id VARCHAR(50);",
    "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_custom_url VARCHAR(500);",
    "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_order_placed_active BOOLEAN NOT NULL DEFAULT TRUE;",
    "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_order_dispatched_active BOOLEAN NOT NULL DEFAULT TRUE;",
    "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_welcome_active BOOLEAN NOT NULL DEFAULT TRUE;",
    "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS sms_otp_active BOOLEAN NOT NULL DEFAULT TRUE;",
    "ALTER TABLE platform_stores ADD COLUMN IF NOT EXISTS whatsapp_alerts_enabled BOOLEAN NOT NULL DEFAULT FALSE;",
]

async def migrate():
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            print("Executing:", stmt)
            await conn.execute(text(stmt))
    print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())

