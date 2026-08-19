import asyncio
from sqlalchemy import select
from app.database import async_session_factory
from app.models.user import User
from app.models.meta import MetaConnection, MetaAdAccount

async def main():
    async with async_session_factory() as db:
        stmt = select(User).where(User.email == "suvarnakharat57@gmail.com")
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            print("User suvarnakharat57@gmail.com not found!")
            return

        print(f"User: {user.email} (ID: {user.id})")

        stmt_conn = select(MetaConnection).where(MetaConnection.user_id == user.id)
        res_conn = await db.execute(stmt_conn)
        conns = res_conn.scalars().all()

        for conn in conns:
            print(f"\nConnection: {conn.id}")
            print(f"  Access Token prefix: {conn.access_token[:15]}...")
            print(f"  Status: {conn.status}")
            print(f"  Last Sync Status: {conn.last_sync_status}")
            print(f"  Last Sync At: {conn.last_sync_at}")
            print(f"  Last Sync Error: {conn.last_sync_error}")

        stmt_acc = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
        res_acc = await db.execute(stmt_acc)
        accs = res_acc.scalars().all()
        for a in accs:
            print(f"\nAd Account: {a.account_name} ({a.meta_account_id})")
            print(f"  Is Connected: {a.is_connected}")
            print(f"  Status: {a.account_status}")

if __name__ == "__main__":
    asyncio.run(main())
