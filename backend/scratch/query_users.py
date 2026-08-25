import asyncio
from sqlalchemy import select
from app.database import async_session_factory
from app.models.user import User

async def main():
    async with async_session_factory() as db:
        stmt = select(User)
        res = await db.execute(stmt)
        users = res.scalars().all()
        print(f"Total Users: {len(users)}")
        for u in users:
            print(f"- {u.name} | {u.email} | ID: {u.id}")

if __name__ == "__main__":
    asyncio.run(main())
