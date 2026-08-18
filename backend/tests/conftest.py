"""
Digital Growth Studio — Pytest Shared Fixtures
"""
import pytest_asyncio
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import get_settings


@pytest_asyncio.fixture
async def db() -> AsyncSession:
    """
    Provide an AsyncSession instance connected to the test database.
    Disable pooling with NullPool to prevent event loop teardown issues.
    """
    settings = get_settings()
    
    # Critical security guard to protect live production database from test runs!
    if "supabase" in settings.DATABASE_URL or "pooler" in settings.DATABASE_URL:
        raise RuntimeError(
            "TEST ABORTED: Pytest is pointing to the live production Supabase database! "
            "Please configure your local .env file to use a local development database for testing."
        )

    engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
    )
    
    async_session = async_sessionmaker(
        engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )
    
    async with async_session() as session:
        yield session
        
    await engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def clean_database_state(db: AsyncSession):
    """
    Purge all tables before each test to ensure complete database test isolation.
    """
    from sqlalchemy import delete
    from app.models.user import User
    from app.models.subscription import Subscription
    from app.models.subscription_addon import SubscriptionAddOn
    from app.models.meta import MetaConnection, MetaAdAccount
    from app.models.campaign import Campaign, AdSet, Ad
    from app.models.creative import Creative
    from app.models.recommendation import AIRecommendation

    await db.execute(delete(AIRecommendation))
    await db.execute(delete(Creative))
    await db.execute(delete(Ad))
    await db.execute(delete(AdSet))
    await db.execute(delete(Campaign))
    await db.execute(delete(MetaAdAccount))
    await db.execute(delete(MetaConnection))
    await db.execute(delete(SubscriptionAddOn))
    await db.execute(delete(Subscription))
    await db.execute(delete(User))
    await db.commit()
    db.expunge_all()
