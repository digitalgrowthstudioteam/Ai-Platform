import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from app.database import async_session_factory
from app.models.user import User
from app.models.meta import MetaConnection

async def main():
    async with async_session_factory() as db:
        stmt = select(User).where(User.email == "suvarnakharat57@gmail.com")
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            print("User not found!")
            return

        stmt_conn = select(MetaConnection).where(MetaConnection.user_id == user.id)
        res_conn = await db.execute(stmt_conn)
        conn = res_conn.scalar_one_or_none()
        if not conn:
            print("Connection not found!")
            return

        now = datetime.now(timezone.utc)
        print(f"Setting last_sync_at to timezone-aware UTC: {now}")
        conn.last_sync_at = now
        conn.last_sync_status = "success"
        conn.last_sync_error = None
        await db.commit()
        print("Done! Sync timestamp updated with correct timezone.")

if __name__ == "__main__":
    asyncio.run(main())
