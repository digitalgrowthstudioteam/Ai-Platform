import pytest
from datetime import datetime, timezone, timedelta, date
from sqlalchemy import select

from app.models.user import User
from app.models.team import TeamMember
from app.models.subscription import Subscription
from app.services.entitlement_engine import EntitlementEngine

@pytest.mark.anyio
async def test_starter_vs_growth_historical_days(db):
    """
    Verifies that Starter plan resolves to 30 days and Growth plan to 90 days.
    """
    # Create Starter User (not trialing)
    user_starter = User(
        email="starter_user_no_trial@gmail.com",
        name="Starter User",
        plan_id="starter",
        firebase_uid="uid_starter_no_trial",
        trial_status="none",
    )
    db.add(user_starter)
    await db.commit()
    await db.refresh(user_starter)

    sub_starter = Subscription(
        user_id=user_starter.id,
        plan="starter",
        status="active",
        started_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(sub_starter)
    await db.commit()

    ent_starter = await EntitlementEngine.resolve_entitlements(user_starter, db)
    assert ent_starter["historical_days"] == 30

    # Create Growth User (not trialing)
    user_growth = User(
        email="growth_user_no_trial@gmail.com",
        name="Growth User",
        plan_id="growth",
        firebase_uid="uid_growth_no_trial",
        trial_status="none",
    )
    db.add(user_growth)
    await db.commit()
    await db.refresh(user_growth)

    sub_growth = Subscription(
        user_id=user_growth.id,
        plan="growth",
        status="active",
        started_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(sub_growth)
    await db.commit()

    ent_growth = await EntitlementEngine.resolve_entitlements(user_growth, db)
    assert ent_growth["historical_days"] == 90

@pytest.mark.anyio
async def test_enforce_historical_days(db):
    """
    Verifies that enforce_historical_days caps dates correctly for Starter and Growth plans.
    """
    user_starter = User(
        email="starter_enforce@gmail.com",
        name="Starter Enforce",
        plan_id="starter",
        firebase_uid="uid_starter_enforce",
        trial_status="none",
    )
    db.add(user_starter)
    await db.commit()
    await db.refresh(user_starter)

    sub_starter = Subscription(
        user_id=user_starter.id,
        plan="starter",
        status="active",
        started_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(sub_starter)
    await db.commit()

    # 45 days ago should get capped to 30 days ago
    requested_start = date.today() - timedelta(days=45)
    capped_start = await EntitlementEngine.enforce_historical_days(requested_start, user_starter, db)
    allowed_start = date.today() - timedelta(days=30)
    assert capped_start == allowed_start

    # 15 days ago should NOT get capped
    requested_start_2 = date.today() - timedelta(days=15)
    capped_start_2 = await EntitlementEngine.enforce_historical_days(requested_start_2, user_starter, db)
    assert capped_start_2 == requested_start_2

@pytest.mark.anyio
async def test_accessible_user_ids(db):
    """
    Verifies that get_accessible_user_ids returns workspace owners' user IDs who invited the user.
    """
    # Create Owner User
    owner = User(
        email="workspace_owner_abc@gmail.com",
        name="Workspace Owner",
        plan_id="growth",
        firebase_uid="uid_owner_abc",
    )
    db.add(owner)
    await db.commit()
    await db.refresh(owner)

    # Create Team Member User (invited by Owner)
    member_user = User(
        email="team_member_abc@gmail.com",
        name="Team Member",
        plan_id="free",
        firebase_uid="uid_member_abc",
    )
    db.add(member_user)
    await db.commit()
    await db.refresh(member_user)

    # Create TeamMember record mapping member email to owner ID
    invite = TeamMember(
        user_id=owner.id,
        email="team_member_abc@gmail.com",
        name="Team Member",
        role="member",
        status="active",
    )
    db.add(invite)
    await db.commit()

    # Verify that accessible IDs for member_user includes both member_user.id and owner.id
    accessible_ids = await EntitlementEngine.get_accessible_user_ids(member_user, db)
    assert member_user.id in accessible_ids
    assert owner.id in accessible_ids
