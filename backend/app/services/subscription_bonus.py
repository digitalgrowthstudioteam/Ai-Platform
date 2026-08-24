import uuid
import structlog
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.subscription import Subscription
from app.services.entitlement_engine import EntitlementEngine

logger = structlog.get_logger()

async def grant_starter_plan_bonus(user: User, db: AsyncSession, days: int = 30) -> None:
    """
    Grants a free 30-day (1 month) Starter plan subscription extension to the user.
    If they already have an active 'starter' subscription, we extend it by 30 days.
    If they do not, we create a new active starter subscription.
    """
    now = datetime.now(timezone.utc)
    
    # 1. Look for latest active Starter subscription
    stmt = (
        select(Subscription)
        .where(Subscription.user_id == user.id)
        .where(Subscription.plan == "starter")
        .where(Subscription.status == "active")
        .order_by(Subscription.expires_at.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    sub = res.scalar_one_or_none()
    
    if sub:
        # Extend existing active Starter plan
        current_expiry = sub.expires_at
        if current_expiry.tzinfo is None:
            current_expiry = current_expiry.replace(tzinfo=timezone.utc)
            
        base_time = max(current_expiry, now)
        sub.expires_at = base_time + timedelta(days=days)
        db.add(sub)
        logger.info("extended_existing_starter_subscription", user_id=user.id, new_expiry=sub.expires_at)
    else:
        # Create a new active Starter plan subscription
        new_sub = Subscription(
            user_id=user.id,
            plan="starter",
            status="active",
            razorpay_customer_id=f"cust_{str(user.id)[:8]}",
            razorpay_subscription_id="free_grant_bonus",
            started_at=now,
            expires_at=now + timedelta(days=days),
        )
        db.add(new_sub)
        logger.info("created_new_starter_subscription", user_id=user.id, expiry=new_sub.expires_at)
        
    # 2. Update user plan_id to 'starter' if they are on a free/null tier
    if user.plan_id in [None, "free"]:
        user.plan_id = "starter"
        db.add(user)

    await db.commit()
    
    # 3. Reset monthly credits to ensure they get plan allocations
    try:
        await EntitlementEngine.check_and_reset_monthly_credits(user, db)
    except Exception as e:
        logger.error("check_and_reset_monthly_credits_failed", error=str(e))
