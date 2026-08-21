import asyncio
from sqlalchemy import select
from app.database import async_session_factory
from app.models.user import User
from app.models.meta import MetaConnection, MetaAdAccount
from app.models.ai_assistant import AIChatConversation

async def main():
    async with async_session_factory() as db:
        print("=== USERS ===")
        res = await db.execute(select(User))
        for u in res.scalars().all():
            print(f"User: ID={u.id}, Email={u.email}, FirebaseUID={u.firebase_uid}, Credits={u.credits}")
            
        print("\n=== CONNECTIONS ===")
        res_conn = await db.execute(select(MetaConnection))
        for c in res_conn.scalars().all():
            print(f"Connection: ID={c.id}, UserID={c.user_id}, MetaUserID={c.meta_user_id}, Status={c.status}")

        print("\n=== AD ACCOUNTS ===")
        res_acc = await db.execute(select(MetaAdAccount))
        for a in res_acc.scalars().all():
            print(f"AdAccount: ID={a.id}, MetaAccountID={a.meta_account_id}, Name={a.account_name}, UserID={a.user_id}")

        print("\n=== CHAT CONVERSATIONS ===")
        res_convo = await db.execute(select(AIChatConversation))
        for convo in res_convo.scalars().all():
            print(f"Conversation: ID={convo.id}, Title={convo.title}, AdAccountID={convo.ad_account_id}, UserID={convo.user_id}")

if __name__ == "__main__":
    asyncio.run(main())
