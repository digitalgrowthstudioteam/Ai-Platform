import asyncio
import asyncpg
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(env_path)

DB_URL = os.getenv("DATABASE_URL", "")
if DB_URL.startswith("postgresql+asyncpg://"):
    DB_URL = DB_URL.replace("postgresql+asyncpg://", "postgresql://", 1)

async def check():
    conn = await asyncpg.connect(DB_URL, ssl="require", statement_cache_size=0)
    cols = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'platform_vendors'")
    print("Columns in platform_vendors:")
    for c in cols:
        print(f" - {c['column_name']} ({c['data_type']})")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())

