import asyncio
from sqlalchemy import select
from app.database import async_session_factory
from app.models.meta import MetaConnection

async def main():
    async with async_session_factory() as db:
        stmt = select(MetaConnection)
        res = await db.execute(stmt)
        conns = res.scalars().all()
        for conn in conns:
            print(f"Connection {conn.id}: status={conn.last_sync_status}, last_sync_at={conn.last_sync_at}, error={conn.last_sync_error}")

if __name__ == "__main__":
    asyncio.run(main())
