import asyncio
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
            print("User suvarnakharat57@gmail.com not found!")
            return

        stmt_conn = select(MetaConnection).where(MetaConnection.user_id == user.id)
        res_conn = await db.execute(stmt_conn)
        conns = res_conn.scalars().all()

        for conn in conns:
            if conn.last_sync_status == "in_progress":
                print(f"Resetting connection {conn.id} from in_progress to failed...")
                conn.last_sync_status = "failed"
                conn.last_sync_error = "Sync timed out / manually reset"
                await db.commit()
                print("Reset complete!")
            else:
                print(f"Connection {conn.id} has status: {conn.last_sync_status} (no reset needed)")

if __name__ == "__main__":
    asyncio.run(main())
