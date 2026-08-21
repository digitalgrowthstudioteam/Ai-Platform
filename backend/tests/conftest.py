"""
Digital Growth Studio — Pytest Shared Fixtures for SQLite in-memory testing
"""
import pytest
import pytest_asyncio
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import delete

import os
os.environ["ENCRYPTION_KEY"] = "8n7H_bQpZl7lqVwYpZl7lqVwYpZl7lqVwYpZl7lqVwY="

from app.database import Base, get_db
from app.main import app as fastapi_app
# Import all models to register on Base.metadata
import app.models

# In-memory SQLite async engine with StaticPool to share connection across sessions
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

test_sessionmaker = async_sessionmaker(
    test_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """
    Initializes the in-memory database schema before running any tests.
    """
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db() -> AsyncSession:
    """
    Provides an AsyncSession instance connected to the test database.
    """
    async with test_sessionmaker() as session:
        yield session


async def override_get_db():
    """
    FastAPI override callback for get_db dependency.
    """
    async with test_sessionmaker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest_asyncio.fixture(autouse=True)
def override_database_dependency():
    """
    Automatically overrides the database dependency for FastAPI routers during tests.
    """
    fastapi_app.dependency_overrides[get_db] = override_get_db
    yield
    fastapi_app.dependency_overrides.pop(get_db, None)


@pytest_asyncio.fixture(autouse=True)
async def clean_database_state(db: AsyncSession):
    """
    Purge all tables before each test to ensure complete database test isolation.
    """
    from app.models.user import User
    from app.models.subscription import Subscription
    from app.models.subscription_addon import SubscriptionAddOn
    from app.models.meta import MetaConnection, MetaAdAccount
    from app.models.campaign import Campaign, AdSet, Ad
    from app.models.creative import Creative
    from app.models.recommendation import AIRecommendation
    from app.models.daily_brief import AIDailyBrief, AIWeeklyBrief
    from app.models.experiment import AccountMemory, AdExperiment
    from app.models.ml_features import MLFeatureRecord, OptimizationAction
    from app.models.ai_optimization import AIOptimizationConfig, AIOptimizationLog
    from app.models.ai_assistant import AIChatConversation, AIChatMessage, AICreditTransaction
    from sqlalchemy import update

    # Order of deletion is important to satisfy SQLite foreign keys if enabled
    await db.execute(update(AIChatMessage).values(credit_transaction_id=None))
    await db.execute(delete(AIChatMessage))
    await db.execute(delete(AICreditTransaction))
    await db.execute(delete(AIChatConversation))
    await db.execute(delete(AIOptimizationConfig))
    await db.execute(delete(AIOptimizationLog))
    await db.execute(delete(MLFeatureRecord))
    await db.execute(delete(OptimizationAction))
    await db.execute(delete(AIDailyBrief))
    await db.execute(delete(AIWeeklyBrief))
    await db.execute(delete(AccountMemory))
    await db.execute(delete(AdExperiment))
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
