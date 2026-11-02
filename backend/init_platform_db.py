"""
Digital Growth Studio — Platform DB Initializer & Demo Seeder
Initializes platform tables safely using SQLAlchemy and seeds demo accounts.
"""
import asyncio
import sys
import os
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(__file__))

from app.config import get_settings
from app.database import Base
import app.models  # Register all models on Base.metadata
from app.services.platform_seeder import seed_platform_database

settings = get_settings()

# Use NullPool for one-off CLI scripts so it consumes only 1 connection
script_engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args={"statement_cache_size": 0},
    poolclass=pool.NullPool,
)
script_session_factory = async_sessionmaker(script_engine, class_=AsyncSession, expire_on_commit=False)


async def main():
    print("Starting Multi-Vendor Platform Database Initialization...")
    async with script_engine.begin() as conn:
        print("Creating missing platform tables in Supabase PostgreSQL...")
        await conn.run_sync(Base.metadata.create_all)
        print("Platform tables created/verified successfully!")

    async with script_session_factory() as session:
        print("Seeding default plan, super admin, and demo vendors (ABC Fashion & XYZ Cosmetics)...")
        await seed_platform_database(session)
        print("Demo data seeded successfully!")
    
    await script_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
