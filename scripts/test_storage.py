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
    try:
        secret = await conn.fetchval("SELECT current_setting('app.settings.jwt_secret', true)")
        print("jwt_secret:", secret)
        tokens = await conn.fetchval("SELECT current_setting('request.jwt.claim', true)")
        print("tokens:", tokens)
    except Exception as e:
        print("Error:", e)
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
