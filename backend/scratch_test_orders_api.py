import asyncio
import asyncpg
import os
import sys
from datetime import datetime

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
        # Get user id of suvarnakharat57@gmail.com
        user = await conn.fetchrow("SELECT id, email FROM users WHERE email = 'suvarnakharat57@gmail.com'")
        if not user:
            print("User not found!")
            return
        
        user_id = user['id']
        print(f"Testing for user: {user['email']} (ID: {user_id})")

        # Let's run queries manually to see what's returned
        # Query 1: requests
        all_requests = await conn.fetch("SELECT id, status, business_name FROM meta_ad_service_requests WHERE user_id = $1", user_id)
        print(f"Requests count: {len(all_requests)}")

        # Query 2: manual ad packs
        manual_packs = await conn.fetch("SELECT id, user_id, service_request_id, total_ad_credits, remaining_ad_credits, used_ad_credits, status FROM ad_packs WHERE user_id = $1 AND service_request_id IS NULL", user_id)
        print(f"Manual packs count: {len(manual_packs)}")
        for p in manual_packs:
            print(f"Pack: ID={p['id']}, Total={p['total_ad_credits']}, Rem={p['remaining_ad_credits']}, Used={p['used_ad_credits']}, Status={p['status']}")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
