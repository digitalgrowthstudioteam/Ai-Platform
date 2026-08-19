import asyncio
import sys
from sqlalchemy import select
from app.database import async_session_factory
from app.models.campaign import Campaign, AdSet

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    async with async_session_factory() as db:
        res = await db.execute(select(Campaign))
        for row in res.scalars().all():
            print(f"Campaign: ID={row.id}, Name={row.name}, Objective={row.objective}")
        
        res_as = await db.execute(select(AdSet))
        for row in res_as.scalars().all():
            print(f"AdSet: ID={row.id}, Name={row.name}, campaign_id={row.campaign_id}")

if __name__ == "__main__":
    asyncio.run(main())
