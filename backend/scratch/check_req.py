import asyncio
import uuid
from sqlalchemy import select
from app.database import async_session_factory
from app.models.ads_service import MetaAdServiceRequest
from app.models.user import User

async def check_id(req_id_str):
    print(f"Checking ID: {req_id_str}")
    try:
        req_id = uuid.UUID(req_id_str)
    except Exception as e:
        print(f"Invalid UUID: {e}")
        return

    async with async_session_factory() as db:
        print("Executing request query...")
        stmt = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == req_id)
        res = await db.execute(stmt)
        r = res.scalar_one_or_none()
        if not r:
            print("Request NOT found!")
            return
        
        print(f"Found Request: ID={r.id}, Business={r.business_name}, Email={r.email}, UserID={r.user_id}")

        print("Executing user query...")
        stmt_u = select(User).where(User.id == r.user_id)
        res_u = await db.execute(stmt_u)
        u = res_u.scalar_one_or_none()
        if u:
            print(f"Found User: Name={u.name}, Email={u.email}")
        else:
            print("User NOT found!")

async def main():
    await check_id("2ee0984e-3c92-4070-a68c-d370f6c58ca0")
    print("-" * 50)
    await check_id("4f125459-e16f-424e-992e-f8518239f520")

if __name__ == "__main__":
    asyncio.run(main())
