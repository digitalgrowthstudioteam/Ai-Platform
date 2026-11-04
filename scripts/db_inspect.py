import asyncio
import sys
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(env_path)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'platform_stores'
            ORDER BY ordinal_position;
        """))
        cols = [r[0] for r in res.fetchall()]
        print("COLUMNS IN platform_stores:")
        for c in cols:
            print(" -", c)

if __name__ == "__main__":
    asyncio.run(check())
