import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.services.ads_service_eligibility import evaluate_service_eligibility

@pytest.mark.asyncio
async def test_evaluate_service_eligibility_restoration(db: AsyncSession):
    # 1. Create a dummy user
    user = User(
        firebase_uid="test-firebase-uid",
        email="test@dgstudio.com",
        name="Test User",
        ads_service_eligible=True,
        restriction_reason=None,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 2. Trigger auto-restriction using a restricted keyword "marijuana"
    restricted_payload = {
        "industry": "Ecommerce",
        "industry_other": "",
        "business_description": "We sell organic marijuana online",
        "advertised_product": "Marijuana Vape",
        "campaign_objective": "Generate Leads",
    }

    result = await evaluate_service_eligibility(db, user, restricted_payload)
    
    assert result["eligible"] is False
    assert "Prohibited category detected" in result["reason"]
    
    # Verify database state for the user
    await db.refresh(user)
    assert user.ads_service_eligible is False
    assert "Prohibited category detected" in user.restriction_reason

    # 3. Correct the payload to be clean (no restricted keywords)
    clean_payload = {
        "industry": "Ecommerce",
        "industry_other": "",
        "business_description": "We sell organic herbal cosmetics locally",
        "advertised_product": "Ayurvedic Acne Face Serum",
        "campaign_objective": "Generate Leads",
    }

    result_clean = await evaluate_service_eligibility(db, user, clean_payload)

    assert result_clean["eligible"] is True
    assert result_clean["reason"] is None

    # Verify that eligibility has been restored in the database
    await db.refresh(user)
    assert user.ads_service_eligible is True
    assert user.restriction_reason is None


@pytest.mark.asyncio
async def test_grant_starter_plan_bonus(db: AsyncSession):
    from sqlalchemy import select
    from app.services.subscription_bonus import grant_starter_plan_bonus
    from app.models.subscription import Subscription

    # 1. Create a user
    user = User(
        firebase_uid="test-bonus-uid",
        email="bonus@dgstudio.com",
        name="Bonus User",
        plan_id="free",
        ads_service_eligible=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Verify they have no active subscriptions
    stmt = select(Subscription).where(Subscription.user_id == user.id)
    res = await db.execute(stmt)
    subs = res.scalars().all()
    assert len(subs) == 0

    # 2. Grant the starter plan bonus
    await grant_starter_plan_bonus(user, db, days=30)
    
    # Verify a subscription is created and user plan_id is upgraded to starter
    await db.refresh(user)
    assert user.plan_id == "starter"
    
    stmt = select(Subscription).where(Subscription.user_id == user.id)
    res = await db.execute(stmt)
    subs = res.scalars().all()
    assert len(subs) == 1
    assert subs[0].plan == "starter"
    assert subs[0].status == "active"
    
    expiry_1 = subs[0].expires_at
    
    # 3. Grant again to extend
    await grant_starter_plan_bonus(user, db, days=30)
    
    db.expire(subs[0])
    res2 = await db.execute(stmt)
    subs2 = res2.scalars().all()
    assert len(subs2) == 1
    assert subs2[0].expires_at > expiry_1
