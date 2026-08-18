"""
Digital Growth Studio — Database Models & Connection Tests
"""
import pytest
from datetime import datetime, date, timedelta
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.subscription import Subscription
from app.models.meta import MetaConnection, MetaAdAccount
from app.models.campaign import Campaign, AdSet, Ad
from app.models.creative import Creative
from app.models.metrics import AdDailyMetrics


@pytest.mark.asyncio
async def test_db_session_and_user_creation(db: AsyncSession):
    """Verify that we can insert a user and query it successfully."""
    # Create test user
    new_user = User(
        firebase_uid="test_firebase_uid_db_123",
        email="db_test@example.com",
        name="DB Test User",
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    assert new_user.id is not None
    
    # Query user back
    stmt = select(User).where(User.email == "db_test@example.com")
    result = await db.execute(stmt)
    db_user = result.scalar_one_or_none()
    
    assert db_user is not None
    assert db_user.name == "DB Test User"
    assert db_user.firebase_uid == "test_firebase_uid_db_123"

    # Cleanup
    await db.delete(db_user)
    await db.commit()


@pytest.mark.asyncio
async def test_meta_connection_encryption(db: AsyncSession):
    """Verify that access tokens are encrypted at rest and decrypted on load."""
    new_user = User(
        firebase_uid="test_enc_uid",
        email="enc_test@example.com",
        name="Encryption Test User",
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    raw_token = "EAAGm0PX4ZBpsBA..."
    
    # Create Meta connection
    connection = MetaConnection(
        user_id=new_user.id,
        meta_user_id="meta_user_999",
        status="connected",
        access_token=raw_token,  # Setter encrypts this dynamically
    )
    db.add(connection)
    await db.commit()
    await db.refresh(connection)

    # Raw value stored in DB should be encrypted (not equal to raw_token)
    assert connection.access_token_encrypted != raw_token
    
    # Property reader should decrypt it back to original value
    assert connection.access_token == raw_token

    # Cleanup
    await db.delete(new_user)  # Cascades to meta_connections
    await db.commit()


@pytest.mark.asyncio
async def test_daily_metrics_unique_constraint(db: AsyncSession):
    """Verify that database unique constraints prevent inserting duplicate metrics for the same day."""
    new_user = User(
        firebase_uid="test_metrics_uid",
        email="metrics_test@example.com",
        name="Metrics Test User",
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    connection = MetaConnection(
        user_id=new_user.id,
        meta_user_id="meta_metrics_999",
        access_token="token",
    )
    db.add(connection)
    await db.commit()
    await db.refresh(connection)

    ad_account = MetaAdAccount(
        user_id=new_user.id,
        meta_connection_id=connection.id,
        meta_account_id="act_12345",
        account_name="Test Account",
    )
    db.add(ad_account)
    await db.commit()
    await db.refresh(ad_account)

    campaign = Campaign(
        ad_account_id=ad_account.id,
        meta_campaign_id="camp_123",
        name="Test Campaign",
        objective="CONVERSIONS",
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)

    ad_set = AdSet(
        campaign_id=campaign.id,
        meta_adset_id="set_123",
        name="Test Ad Set",
        optimization_goal="OFFSITE_CONVERSIONS",
        billing_event="IMPRESSIONS",
    )
    db.add(ad_set)
    await db.commit()
    await db.refresh(ad_set)

    ad = Ad(
        ad_set_id=ad_set.id,
        meta_ad_id="ad_123",
        name="Test Ad",
    )
    db.add(ad)
    await db.commit()
    await db.refresh(ad)

    # Insert daily metrics for Date T
    test_date = date.today()
    metrics_1 = AdDailyMetrics(
        ad_id=ad.id,
        date=test_date,
        spend=50.25,
        impressions=1000,
    )
    db.add(metrics_1)
    await db.commit()

    # Attempt to insert metrics for same Ad and Date (should fail)
    metrics_2 = AdDailyMetrics(
        ad_id=ad.id,
        date=test_date,
        spend=60.00,
        impressions=1200,
    )
    db.add(metrics_2)
    
    with pytest.raises(IntegrityError):
        await db.commit()

    # Rollback session since it failed
    await db.rollback()

    # Cleanup
    await db.delete(new_user)  # Cascades all relations
    await db.commit()
