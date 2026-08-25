import asyncio
import asyncpg
import os
import sys

# Ensure backend root is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import get_settings

async def main():
    # Load database connection string from environment
    settings = get_settings()
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

    # Connect directly
    conn = await asyncpg.connect(db_url)
    try:
        # Get all users
        users = await conn.fetch("SELECT id, email FROM users")
        user_map = {u['id']: u for u in users}
        print("--- USERS ---")
        for u in users:
            print(f"ID: {u['id']}, Email: {u['email']}")

        # Get all ad packs
        packs = await conn.fetch("SELECT id, user_id, service_request_id, total_ad_credits, remaining_ad_credits, used_ad_credits, pack_type, status, purchased_at, expires_at FROM ad_packs")
        print("\n--- AD PACKS ---")
        for p in packs:
            user = user_map.get(p['user_id'])
            user_email = user['email'] if user else "Unknown"
            print(f"PackID: {p['id']}, UserEmail: {user_email}, ReqID: {p['service_request_id']}, Total: {p['total_ad_credits']}, Rem: {p['remaining_ad_credits']}, Type: {p['pack_type']}, Status: {p['status']}")
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
