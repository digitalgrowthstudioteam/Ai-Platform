"""
Digital Growth Studio — AI Ads Optimizer
Database connection module using SQLAlchemy async + asyncpg
"""
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

import sys
from sqlalchemy import pool

settings = get_settings()

# Create async engine connected to Supabase PostgreSQL
# Pass statement_cache_size=0 to connect_args to support pgbouncer transaction mode
# Disable pooling with NullPool when running tests to avoid closed event loop errors
is_testing = "pytest" in sys.modules
pool_kwargs = {
    "poolclass": pool.NullPool,
} if is_testing else {
    "pool_size": settings.DATABASE_POOL_SIZE,
    "max_overflow": settings.DATABASE_MAX_OVERFLOW,
    "pool_pre_ping": True,
    "pool_recycle": 3600,
}

engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args={"statement_cache_size": 0},
    echo=settings.DEBUG,
    **pool_kwargs
)

# Session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncSession:
    """
    Dependency that provides an async database session.
    Automatically commits on success, rolls back on error.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database — create tables if needed (development only)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Close database engine on shutdown."""
    await engine.dispose()
