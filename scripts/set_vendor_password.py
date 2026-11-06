import asyncio
import asyncpg
import hashlib
import secrets
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(env_path)

DB_URL = os.getenv("DATABASE_URL", "")
if DB_URL.startswith("postgresql+asyncpg://"):
    DB_URL = DB_URL.replace("postgresql+asyncpg://", "postgresql://", 1)

def hash_pwd(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}:{key.hex()}"

async def update_passwords():
    if not DB_URL:
        raise ValueError("DATABASE_URL is not configured in backend/.env")
    conn = await asyncpg.connect(DB_URL, ssl="require", statement_cache_size=0)
    hashed = hash_pwd("Partner@2026")
    for email in ["wadkarvikram10@gmail.com", "vikramrwadkar@gmail.com"]:
        res = await conn.execute("UPDATE platform_users SET hashed_password = $1 WHERE email = $2", hashed, email)
        print("Updated", email, res)
    await conn.close()

if __name__ == "__main__":
    asyncio.run(update_passwords())
