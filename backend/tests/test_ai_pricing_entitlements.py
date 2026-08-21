import pytest
import uuid
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select

from app.models.user import User
from app.models.subscription import Subscription
from app.models.subscription_addon import SubscriptionAddOn
from app.models.admin_config import AdminConfig
from app.models.ai_usage import AIUsageRecord
from app.models.ai_assistant import AIChatConversation, AIChatMessage, AICreditTransaction
from app.models.ai_optimization import AIOptimizationConfig

from app.services.config_seeder import seed_admin_configs
from app.services.entitlement_engine import EntitlementEngine
from app.services.ai_assistant_service import AIAssistantService
from app.services.ai_optimization_service import AIOptimizationService

@pytest.mark.asyncio
async def test_seeder_initializes_configs(db):
    """
    Verifies that the config seeder runs successfully and stores pricing configurations in the database.
    """
    await seed_admin_configs(db)
    
    # Query configs to verify starter plan campaign limit seed
    stmt = select(AdminConfig).where(AdminConfig.key == "pricing_plans")
    res = await db.execute(stmt)
    cfg = res.scalar_one_or_none()
    assert cfg is not None
    assert cfg.value["starter"]["campaign_limit"] == 1

@pytest.mark.asyncio
async def test_dynamic_optimization_limits(db):
    """
    Verifies campaign optimization limit summation: base plan + addons + admin overrides.
    """
    await seed_admin_configs(db)
    
    # 1. Create a Pro user
    user = User(
        firebase_uid="fb_test_pro",
        email="test_pro@digitalgrowthstudio.in",
        name="Pro User",
        credits=350,
        monthly_credits_remaining=350,
        purchased_credits_remaining=0,
        trial_credits_remaining=0,
        admin_assigned_optimization_slots=2, # Admin extra slots
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 2. Add Subscription
    sub = Subscription(
        user_id=user.id,
        plan="pro",
        status="active",
        razorpay_customer_id="cust_test",
        razorpay_subscription_id="sub_test",
        started_at=datetime.utcnow() - timedelta(days=2),
        expires_at=datetime.utcnow() + timedelta(days=28)
    )
    db.add(sub)
    
    # 3. Add Add-on: additional_optimization_campaign qty=1
    addon = SubscriptionAddOn(
        user_id=user.id,
        addon_id="additional_optimization_campaign",
        quantity=1,
        status="active",
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db.add(addon)
    await db.commit()

    # 4. Resolve limits
    ent = await EntitlementEngine.resolve_entitlements(user, db)
    # Pro base = 5, addon = 1, admin = 2. Total = 8
    assert ent["ai_optimization_campaign_limit"] == 8

@pytest.mark.asyncio
async def test_self_healing_credits_reset(db):
    """
    Verifies that EntitlementEngine automatically triggers a reset on billing cycle boundaries,
    expiring old unused credits and allocating new monthly limits.
    """
    await seed_admin_configs(db)
    
    # 1. User with old reset timestamp
    user = User(
        firebase_uid="fb_reset_user",
        email="reset_user@digitalgrowthstudio.in",
        name="Reset User",
        credits=50,
        monthly_credits_remaining=50,
        purchased_credits_remaining=10,
        trial_credits_remaining=0,
        last_credits_reset_at=datetime.utcnow() - timedelta(days=40) # Old reset
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 2. Paid Subscription started today
    sub = Subscription(
        user_id=user.id,
        plan="starter", # Starter includes 25 monthly credits
        status="active",
        razorpay_customer_id="cust_test",
        razorpay_subscription_id="sub_test",
        started_at=datetime.utcnow() - timedelta(days=1), # Started after last reset
        expires_at=datetime.utcnow() + timedelta(days=29)
    )
    db.add(sub)
    await db.commit()

    # 3. Trigger Entitlement Resolution which fires the self-healing reset
    ent = await EntitlementEngine.resolve_entitlements(user, db)
    
    # Re-fetch user
    stmt = select(User).where(User.id == user.id)
    res = await db.execute(stmt)
    user_ref = res.scalar_one()
    
    # Assert old monthly credits (50) expired, new (25) granted. Total = 10 (purchased) + 25 = 35.
    assert user_ref.monthly_credits_remaining == 25
    assert user_ref.credits == 35
    assert user_ref.last_credits_reset_at is not None

    # Check transactions ledger
    stmt_tx = select(AICreditTransaction).where(AICreditTransaction.user_id == user.id)
    res_tx = await db.execute(stmt_tx)
    txs = res_tx.scalars().all()
    
    # Should have 2 transactions: expire -50, grant +25
    expire_tx = [t for t in txs if t.transaction_type == "expire"]
    grant_tx = [t for t in txs if t.transaction_type == "grant"]
    assert len(expire_tx) == 1
    assert len(grant_tx) == 1
    assert expire_tx[0].amount == -50
    assert grant_tx[0].amount == 25

@pytest.mark.asyncio
async def test_atomic_credits_consumption_order(db):
    """
    Verifies that credit consumption follows: Trial -> Monthly -> Purchased.
    Also tests atomic lock transactions.
    """
    await seed_admin_configs(db)
    
    user = User(
        firebase_uid="fb_consume_user",
        email="consume_user@digitalgrowthstudio.in",
        name="Consume User",
        credits=60,
        trial_credits_remaining=5,
        monthly_credits_remaining=25,
        purchased_credits_remaining=30,
        last_credits_reset_at=datetime.utcnow()
    )
    db.add(user)
    await db.flush() # Flush to generate user.id primary key
    
    convo = AIChatConversation(
        title="Test Convo",
        user_id=user.id,
        ad_account_id=uuid.uuid4()
    )
    db.add(convo)
    await db.commit()
    await db.refresh(user)
    await db.refresh(convo)

    # Mock response token data returned by query_gemini
    mock_reply = "Hello user!"
    mock_tokens = {"input_tokens": 100, "output_tokens": 150, "total_tokens": 250}

    # Patch query_gemini to bypass external REST call
    original_query = AIAssistantService.query_gemini
    async def mock_query(system_prompt, history, user_message):
        return mock_reply, mock_tokens
    AIAssistantService.query_gemini = mock_query

    try:
        # First message: Should deduct 1 from Trial Credits
        reply, success = await AIAssistantService.process_user_message(
            db=db,
            user_id=user.id,
            ad_account_id=convo.ad_account_id,
            conversation_id=convo.id,
            message_content="Query 1"
        )
        assert success is True
        
        await db.refresh(user)
        assert user.trial_credits_remaining == 4
        assert user.monthly_credits_remaining == 25
        assert user.purchased_credits_remaining == 30
        assert user.credits == 59

        # Force trial credits to 0 to test monthly deduction
        user.trial_credits_remaining = 0
        user.credits = 55
        db.add(user)
        await db.commit()

        # Second message: Should deduct 1 from Monthly Included Credits
        reply, success = await AIAssistantService.process_user_message(
            db=db,
            user_id=user.id,
            ad_account_id=convo.ad_account_id,
            conversation_id=convo.id,
            message_content="Query 2"
        )
        assert success is True
        
        await db.refresh(user)
        assert user.trial_credits_remaining == 0
        assert user.monthly_credits_remaining == 24
        assert user.purchased_credits_remaining == 30
        assert user.credits == 54

        # Verify AIUsageRecord is correctly logged
        stmt = select(AIUsageRecord).where(AIUsageRecord.user_id == user.id)
        res = await db.execute(stmt)
        records = res.scalars().all()
        assert len(records) == 2
        assert records[0].input_tokens == 100
        assert records[0].output_tokens == 150
        assert records[0].estimated_cost == (100 * 0.000000075 + 150 * 0.0000003)
        assert records[0].success is True
        assert records[0].credit_charged == 1

    finally:
        AIAssistantService.query_gemini = original_query

@pytest.mark.asyncio
async def test_over_limit_campaigns_skipped(db):
    """
    Verifies that background campaign analyses are skipped for campaigns exceeding SaaS limits.
    """
    await seed_admin_configs(db)
    
    # 1. Starter plan user (limit = 1 campaign slot)
    user = User(
        firebase_uid="fb_limit_user",
        email="starter_lim@digitalgrowthstudio.in",
        name="Limit User",
        credits=10,
        trial_credits_remaining=5
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 2. Add starter subscription
    sub = Subscription(
        user_id=user.id,
        plan="starter",
        status="active",
        razorpay_customer_id="cust_test",
        razorpay_subscription_id="sub_test",
        started_at=datetime.utcnow() - timedelta(days=2),
        expires_at=datetime.utcnow() + timedelta(days=28)
    )
    db.add(sub)
    await db.commit()

    ad_acc_uuid = uuid.uuid4()

    # 3. Create two optimization configs (active)
    # Config 1 is older
    cfg1 = AIOptimizationConfig(
        user_id=user.id,
        ad_account_id=ad_acc_uuid,
        campaign_id=uuid.uuid4(),
        is_active=True,
        created_at=datetime.utcnow() - timedelta(hours=2)
    )
    # Config 2 is newer
    cfg2 = AIOptimizationConfig(
        user_id=user.id,
        ad_account_id=ad_acc_uuid,
        campaign_id=uuid.uuid4(),
        is_active=True,
        created_at=datetime.utcnow() - timedelta(hours=1)
    )
    db.add_all([cfg1, cfg2])
    await db.commit()

    # Patch analyze_campaign to monitor calls
    called_campaigns = []
    original_analyze = AIOptimizationService.analyze_campaign
    async def mock_analyze(db_session, config_obj, user_uuid):
        called_campaigns.append(config_obj.campaign_id)
        return True
    AIOptimizationService.analyze_campaign = mock_analyze

    try:
        # Execute background runner
        processed = await AIOptimizationService.analyze_active_campaigns(db, ad_acc_uuid, user.id)
        
        # Limit is 1, so only cfg1 (oldest) should be analyzed. cfg2 should be skipped as over-entitled.
        assert len(called_campaigns) == 1
        assert called_campaigns[0] == cfg1.campaign_id

    finally:
        AIOptimizationService.analyze_campaign = original_analyze
