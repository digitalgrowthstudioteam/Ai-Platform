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

async def update_costs():
    conn = await asyncpg.connect(DB_URL, ssl="require", statement_cache_size=0)
    row = await conn.fetchrow("SELECT value FROM platform_settings WHERE key = 'ai_credit_settings'")
    
    current_config = {}
    if row and row["value"]:
        try:
            current_config = json.loads(row["value"])
        except Exception:
            pass
            
    print("Previous Config:", current_config)
    
    current_config["import_product_credit_cost"] = 3
    current_config["image_studio_credit_cost"] = 5
    
    val_json = json.dumps(current_config, indent=2)
    
    if row:
        await conn.execute("UPDATE platform_settings SET value = $1 WHERE key = 'ai_credit_settings'", val_json)
        print("Updated existing platform_settings row.")
    else:
        await conn.execute(
            "INSERT INTO platform_settings (id, key, value, description) VALUES (gen_random_uuid(), 'ai_credit_settings', $1, 'Global AI Credits and Pricing Configuration')",
            val_json
        )
        print("Inserted new platform_settings row.")
        
    updated_row = await conn.fetchrow("SELECT value FROM platform_settings WHERE key = 'ai_credit_settings'")
    print("New Config in Database:\n", updated_row["value"])
    await conn.close()

if __name__ == "__main__":
    asyncio.run(update_costs())
