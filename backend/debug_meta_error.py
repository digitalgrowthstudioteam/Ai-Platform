import asyncio
import httpx
from sqlalchemy import select
from app.database import async_session_factory
from app.models.user import User
from app.models.meta import MetaConnection, MetaAdAccount
from app.config import get_settings

async def main():
    settings = get_settings()
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

        token = conn.access_token
        
        stmt_acc = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
        res_acc = await db.execute(stmt_acc)
        acc = res_acc.scalars().first()
        if not acc:
            print("Ad Account not found!")
            return

        print(f"Testing act={acc.meta_account_id} with token prefix {token[:15]}...")

        headers = {"Authorization": f"Bearer {token}"}
        api_ver = settings.META_API_VERSION
        account_id = acc.meta_account_id

        # Make the me/adaccounts call to check access
        me_accounts_url = f"https://graph.facebook.com/{api_ver}/me/adaccounts?fields=id,name,account_status,currency&limit=500"
        
        async with httpx.AsyncClient() as client:
            try:
                r = await client.get(me_accounts_url, headers=headers)
                print(f"me/adaccounts HTTP Status: {r.status_code}")
                print("me/adaccounts Response JSON:")
                import json
                print(json.dumps(r.json(), indent=2))
            except Exception as e:
                print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(main())
