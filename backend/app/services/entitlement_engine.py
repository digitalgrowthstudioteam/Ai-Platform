"""
Digital Growth Studio — Configuration-driven Entitlement Engine
"""
import structlog
from datetime import datetime, timezone, date, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List, Optional

logger = structlog.get_logger()
from app.models.user import User
from app.models.subscription_addon import SubscriptionAddOn
from app.models.subscription import Subscription

# ──────────────────────────────────────────────
# Centralised SaaS Plan Entitlements Config
# ──────────────────────────────────────────────
PLANS_CONFIG = {
    "free": {
        "max_meta_accounts": 0,
        "historical_days": 0,
        "sync_interval_hours": 999999,
        "max_team_members": 0,
        "ai_recommendations_limit": 0,
        "ai_optimization_campaign_limit": 0,
        "monthly_credits": 0,
        "feature_gates": {
            "creative_analysis": False,
            "copy_analysis": False,
            "placement_analysis": False,
            "audience_analysis": False,
            "account_health_score": False,
            "campaign_comparison": False,
            "cross_campaign_analysis": False,
            "white_label_reports": False,
        }
    },
    "starter": {
        "max_meta_accounts": 1,
        "historical_days": 30,
        "sync_interval_hours": 48,
        "max_team_members": 1,
        "ai_recommendations_limit": 999999,
        "ai_optimization_campaign_limit": 1,
        "monthly_credits": 25,
        "feature_gates": {
            "creative_analysis": True,
            "copy_analysis": True,
            "placement_analysis": True,
            "audience_analysis": True,
            "account_health_score": True,
            "campaign_comparison": False,
            "cross_campaign_analysis": False,
            "white_label_reports": False,
        }
    },
    "growth": {
        "max_meta_accounts": 3,
        "historical_days": 90,
        "sync_interval_hours": 12,
        "max_team_members": 1,
        "ai_recommendations_limit": 999999,
        "ai_optimization_campaign_limit": 3,
        "monthly_credits": 150,


        "feature_gates": {
            "creative_analysis": True,
            "copy_analysis": True,
            "placement_analysis": True,
            "audience_analysis": True,
            "account_health_score": True,
            "campaign_comparison": True,
            "cross_campaign_analysis": False,
            "white_label_reports": False,
        }
    },
    "pro": {
        "max_meta_accounts": 10,
        "historical_days": 180,
        "sync_interval_hours": 6,
        "max_team_members": 1,
        "ai_recommendations_limit": 999999,
        "ai_optimization_campaign_limit": 5,
        "monthly_credits": 350,
        "feature_gates": {
            "creative_analysis": True,
            "copy_analysis": True,
            "placement_analysis": True,
            "audience_analysis": True,
            "account_health_score": True,
            "campaign_comparison": True,
            "cross_campaign_analysis": True,
            "white_label_reports": False,
        }
    },
    "agency": {
        "max_meta_accounts": 25,
        "historical_days": 365,
        "sync_interval_hours": 6,
        "max_team_members": 1,
        "ai_recommendations_limit": 999999,
        "ai_optimization_campaign_limit": 10,
        "monthly_credits": 500,

        "feature_gates": {
            "creative_analysis": True,
            "copy_analysis": True,
            "placement_analysis": True,
            "audience_analysis": True,
            "account_health_score": True,
            "campaign_comparison": True,
            "cross_campaign_analysis": True,
            "white_label_reports": True,
        }
    }
}

# ──────────────────────────────────────────────
# Centralised Paid Add-Ons Pricing Config
# ──────────────────────────────────────────────
ADDONS_CONFIG = {
    "additional_account": {
        "name": "Additional Meta Ad Account",
        "price_monthly": 299,
        "description": "Adds one additional Meta Ad Account beyond base plan limits",
    },
    "faster_sync": {
        "name": "Faster Sync (3-Hour)",
        "price_monthly": 999,
        "description": "Enables 3-hour synchronizations for all connected accounts",
    },
    "lifetime_history_monthly": {
        "name": "Lifetime Historical Data (Monthly)",
        "price_monthly": 199,
        "description": "Retain and analyze all historical data successfully imported",
    },
    "lifetime_history_annual": {
        "name": "Lifetime Historical Data (Annual)",
        "price_annual": 1999,
        "description": "Retain and analyze all historical data successfully imported (Save ₹389/yr)",
    },
    "ai_deep_analysis": {
        "name": "AI Deep Analysis",
        "price_monthly": 499,
        "description": "Unlock deeper campaign patterns and advanced recommendations",
    },
    "additional_team_member": {
        "name": "Additional Team Member",
        "price_monthly": 199,
        "description": "Adds one additional team member beyond base plan limits",
    },
    "AI_INTELLIGENCE_INDIVIDUAL_MONTHLY": {
        "name": "AI Intelligence - Individual (Monthly)",
        "price_monthly": 499,
        "description": "Unlock continuous full account intelligence for one selected Meta Ad Account",
    },
    "AI_INTELLIGENCE_INDIVIDUAL_YEARLY": {
        "name": "AI Intelligence - Individual (Annual)",
        "price_annual": 4999,
        "description": "Unlock continuous full account intelligence for one selected Meta Ad Account (Annual)",
    },
    "AI_INTELLIGENCE_ALL_MONTHLY": {
        "name": "AI Intelligence - All (Monthly)",
        "price_monthly": 9999,
        "description": "Unlock continuous full account intelligence for all Meta Ad Accounts",
    },
    "AI_INTELLIGENCE_ALL_YEARLY": {
        "name": "AI Intelligence - All (Annual)",
        "price_annual": 69999,
        "description": "Unlock continuous full account intelligence for all Meta Ad Accounts (Annual)",
    }
}


class EntitlementEngine:
    """
    Entitlement Engine.
    Resolves base pricing plans and paid add-on counts to effective feature flags and capacity limits.
    """

    @staticmethod
    def get_plan_config(plan_id: str) -> Dict[str, Any]:
        """Fetch settings variables for a plan, defaulting to Free tier."""
        plan_normalized = (plan_id or "free").lower()
        if plan_normalized not in PLANS_CONFIG:
            plan_normalized = "free"
        return PLANS_CONFIG[plan_normalized]

    @staticmethod
    async def get_active_addons(user_id: Any, db: AsyncSession) -> List[SubscriptionAddOn]:
        """Fetch active (not expired) purchased add-on records for user."""
        stmt = (
            select(SubscriptionAddOn)
            .where(SubscriptionAddOn.user_id == user_id)
            .where(SubscriptionAddOn.status == "active")
        )
        res = await db.execute(stmt)
        all_addons = list(res.scalars().all())
        
        now = datetime.now(timezone.utc)
        active_addons = []
        for a in all_addons:
            exp = a.expires_at
            if exp:
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp > now:
                    active_addons.append(a)
        return active_addons

    @classmethod
    async def check_and_reset_monthly_credits(cls, user: User, db: AsyncSession) -> None:
        """
        Self-healing credit reset logic.
        Detects if user is in a new billing cycle by comparing user.last_credits_reset_at
        with their active subscription's started_at. If they are in a new cycle:
        - Expire previous unused monthly credits.
        - Grant new plan-included credits.
        - Register signed ledger transactions.
        """
        from app.models.subscription import Subscription
        from app.models.ai_assistant import AICreditTransaction
        
        # 1. Fetch active subscriptions and resolve the highest ranking one
        stmt = (
            select(Subscription)
            .where(Subscription.user_id == user.id)
            .where(Subscription.status == "active")
        )
        res = await db.execute(stmt)
        active_subs = res.scalars().all()
        
        sub = None
        best_rank = -1
        plan_rank = {"free": 0, "starter": 1, "growth": 2, "pro": 3, "agency": 4}
        for s in active_subs:
            rank = plan_rank.get(s.plan.lower(), 0)
            if rank > best_rank:
                best_rank = rank
                sub = s
        
        if not sub:
            # Check trial credits init
            if user.trial_status == "active" and user.trial_credits_remaining == 0 and not user.trial_used:
                user.trial_credits_remaining = 5
                user.credits = user.purchased_credits_remaining + 5
                # Create ledger entry
                db.add(AICreditTransaction(
                    user_id=user.id,
                    credit_amount=5,
                    amount=5,
                    credit_type="trial",
                    transaction_type="grant",
                    description="Free Trial credits granted",
                    reason="Free Trial signup"
                ))
                user.trial_used = True
                db.add(user)
                await db.commit()
            return

        # Paid subscription active
        plan_id = sub.plan.lower()
        plan_config = cls.get_plan_config(plan_id)
        plan_included_credits = plan_config.get("monthly_credits", 0)

        # Determine if we should reset
        should_reset = False
        if user.last_credits_reset_at is None:
            should_reset = True
        else:
            reset_at = user.last_credits_reset_at
            if reset_at.tzinfo is None:
                reset_at = reset_at.replace(tzinfo=timezone.utc)
            sub_started = sub.started_at
            if sub_started.tzinfo is None:
                sub_started = sub_started.replace(tzinfo=timezone.utc)
            if reset_at < sub_started:
                should_reset = True

        if should_reset:
            logger.info("resetting_monthly_credits_billing_cycle", user_id=user.id, plan=plan_id)
            
            # Expire old monthly credits (audit record)
            old_remaining = user.monthly_credits_remaining
            if old_remaining > 0:
                db.add(AICreditTransaction(
                    user_id=user.id,
                    credit_amount=old_remaining,
                    amount=-old_remaining,
                    credit_type="monthly_included",
                    transaction_type="expire",
                    description=f"Expired {old_remaining} unused monthly credits from previous cycle",
                    reason="Monthly credit reset expiration"
                ))

            # Clear trial credits if any remaining
            old_trial = user.trial_credits_remaining
            if old_trial > 0:
                db.add(AICreditTransaction(
                    user_id=user.id,
                    credit_amount=old_trial,
                    amount=-old_trial,
                    credit_type="trial",
                    transaction_type="expire",
                    description=f"Expired {old_trial} unused trial credits upon upgrading/billing reset",
                    reason="Trial credits expiration"
                ))
                user.trial_credits_remaining = 0

            # Grant new monthly credits
            user.monthly_credits_remaining = plan_included_credits
            user.last_credits_reset_at = datetime.now(timezone.utc)
            user.credits = user.purchased_credits_remaining + plan_included_credits
            
            # Log grant transaction
            db.add(AICreditTransaction(
                user_id=user.id,
                credit_amount=plan_included_credits,
                amount=plan_included_credits,
                credit_type="monthly_included",
                transaction_type="grant",
                description=f"Granted {plan_included_credits} monthly included credits for {plan_id.upper()} plan",
                reason="Monthly plan credits allocation",
                reference_id=sub.razorpay_subscription_id
            ))
            
            db.add(user)
            await db.commit()

    @classmethod
    async def resolve_entitlements(cls, user: User, db: AsyncSession) -> Dict[str, Any]:
        """
        Combines user subscription plan limits and active add-on quantities.
        Dynamically checks for active trials and active paid subscriptions.
        """
        # Run self-healing monthly credits reset
        try:
            await cls.check_and_reset_monthly_credits(user, db)
        except Exception as reset_err:
            logger.error("failed_credits_reset_self_healing", user_id=user.id, error=str(reset_err))

        # Resolve accessible user IDs (which includes user.id and team owners who invited this user)
        from app.models.team import TeamMember
        from sqlalchemy import func
        stmt_owners = select(TeamMember.user_id).where(func.lower(TeamMember.email) == user.email.lower())
        res_owners = await db.execute(stmt_owners)
        owner_ids = list(res_owners.scalars().all())
        user_ids = [user.id] + owner_ids

        # 1. Check if user or any team owner has active trial
        is_trial_active = False
        if user.trial_status == "active" and user.trial_ends_at:
            ends_at = user.trial_ends_at
            if ends_at.tzinfo is None:
                ends_at = ends_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) <= ends_at:
                is_trial_active = True

        if not is_trial_active and len(owner_ids) > 0:
            stmt_trial = select(User).where(User.id.in_(owner_ids)).where(User.trial_status == "active")
            res_trial = await db.execute(stmt_trial)
            trial_users = res_trial.scalars().all()
            for tu in trial_users:
                if tu.trial_ends_at:
                    ends_at = tu.trial_ends_at
                    if ends_at.tzinfo is None:
                        ends_at = ends_at.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) <= ends_at:
                        is_trial_active = True
                        break

        # 2. Check active paid subscriptions for all user_ids
        stmt = (
            select(Subscription)
            .where(Subscription.user_id.in_(user_ids))
            .where(Subscription.status == "active")
            .order_by(Subscription.expires_at.desc())
        )
        res = await db.execute(stmt)
        subs = list(res.scalars().all())

        plan_rank = {"free": 0, "starter": 1, "growth": 2, "pro": 3, "agency": 4}
        best_sub = None
        best_rank = -1
        for s in subs:
            plan_name = s.plan.lower()
            rank = plan_rank.get(plan_name, 0)
            if rank > best_rank:
                best_rank = rank
                best_sub = s

        if best_sub:
            # Self-healing trial removal if user themselves has a paid subscription
            if best_sub.user_id == user.id:
                if user.trial_status != "none" or user.trial_ends_at is not None:
                    user.trial_status = "none"
                    user.trial_ends_at = None
                    user.trial_started_at = None
                    user.trial_used = True
                    db.add(user)
                    await db.commit()
            plan_id = best_sub.plan.lower()
            is_trial_active = False
        elif is_trial_active:
            plan_id = "starter"
        else:
            plan_id = "free"  # Zero-entitlement locked state

        base_config = cls.get_plan_config(plan_id)
        
        # Load user add-ons for all user IDs
        addons = []
        for uid in user_ids:
            addons.extend(await cls.get_active_addons(uid, db))
        
        # 1. Total allowed accounts (Base + Additional Add-Ons)
        additional_accounts_qty = sum(a.quantity for a in addons if a.addon_id == "additional_account")
        max_meta_accounts = base_config["max_meta_accounts"] + additional_accounts_qty
        
        # 2. Total allowed team members (Base + Additional Members Add-Ons)
        additional_members_qty = sum(a.quantity for a in addons if a.addon_id == "additional_team_member")
        max_team_members = base_config["max_team_members"] + additional_members_qty

        # 3. Faster Sync overriding interval
        has_faster_sync = any(a.addon_id == "faster_sync" for a in addons)
        sync_interval_hours = 3 if has_faster_sync else base_config["sync_interval_hours"]

        # Resolve dynamic historical days limits
        has_lifetime_history = any(a.addon_id in ["lifetime_history_monthly", "lifetime_history_annual"] for a in addons)

        if has_lifetime_history:
            historical_days = 99999
        elif is_trial_active:
            historical_days = 30
        elif plan_id == "starter":
            historical_days = 30
        elif plan_id == "growth":
            historical_days = 90
        elif plan_id == "pro":
            historical_days = 180
        elif plan_id == "agency":
            historical_days = 365
        else:
            historical_days = base_config["historical_days"]

        # 5. AI Deep Analysis entitlement
        has_ai_deep = any(a.addon_id == "ai_deep_analysis" for a in addons) or (plan_id.lower() in ["growth", "pro", "agency"])

        # Compile resolved features dictionary
        feature_gates = dict(base_config["feature_gates"])
        if has_ai_deep:
            feature_gates["ai_deep_analysis"] = True

        # AI Optimization campaign limit calculation
        additional_opt_qty = sum(a.quantity for a in addons if a.addon_id == "additional_optimization_campaign")
        base_opt_limit = base_config.get("ai_optimization_campaign_limit", 0)
        total_opt_limit = base_opt_limit + additional_opt_qty + getattr(user, "admin_assigned_optimization_slots", 0)

        return {
            "plan_id": plan_id,
            "max_meta_accounts": max_meta_accounts,
            "max_team_members": max_team_members,
            "sync_interval_hours": sync_interval_hours,
            "historical_days": historical_days,
            "ai_recommendations_limit": base_config["ai_recommendations_limit"],
            "ai_optimization_campaign_limit": total_opt_limit,
            "ai_deep_analysis": has_ai_deep,
            "feature_gates": feature_gates,
            "active_addons": [
                {
                    "addon_id": a.addon_id,
                    "quantity": a.quantity,
                    "expires_at": a.expires_at,
                } for a in addons
            ]
        }

    @classmethod
    async def has_full_ai_intelligence(
        cls, db: AsyncSession, user_id: Any, ad_account_id: str
    ) -> dict:
        """
        Determines if the active Meta Ad Account has Full AI Intelligence.
        Priority:
          ALL_ACCOUNTS (active add-on) -> enabled
          INDIVIDUAL_ACCOUNT (active add-on and selected) -> enabled
          BASE_PLAN_AI_LIMIT -> disabled
        """
        import uuid
        from app.models.meta import MetaAdAccount
        
        # Resolve targeted account link
        stmt = select(MetaAdAccount).where(MetaAdAccount.user_id == user_id)
        try:
            acc_uuid = uuid.UUID(ad_account_id)
            stmt = stmt.where(MetaAdAccount.id == acc_uuid)
        except (ValueError, TypeError):
            stmt = stmt.where(MetaAdAccount.meta_account_id == ad_account_id)
        res = await db.execute(stmt)
        acc = res.scalar_one_or_none()
        if acc and acc.historical_intelligence_status == "active" and acc.ai_intelligence_status != "active":
            addons = await cls.get_active_addons(user_id, db)
            has_lifetime_history = any(
                a.addon_id in ["lifetime_history_monthly", "lifetime_history_annual"] 
                for a in addons
            )
            has_ai_intelligence = any(
                a.addon_id in ["AI_INTELLIGENCE_ALL_MONTHLY", "AI_INTELLIGENCE_ALL_YEARLY", "AI_INTELLIGENCE_INDIVIDUAL_MONTHLY", "AI_INTELLIGENCE_INDIVIDUAL_YEARLY", "ai_deep_analysis"]
                for a in addons
            )
            if not has_lifetime_history and not has_ai_intelligence:
                acc.historical_intelligence_status = "paused"
                db.add(acc)
                await db.commit()
            else:
                return {
                    "enabled": acc.ai_intelligence_status == "active",
                    "scope": "ACCOUNT",
                    "source": "LIFETIME_HISTORY_ACTIVE",
                    "ad_account_id": str(acc.id),
                    "historical_access": "FULL",
                    "valid_until": None
                }

        if not acc:
            return {
                "enabled": False,
                "scope": "BASE_LIMIT",
                "source": "BASE_PLAN_AI_LIMIT",
                "historical_access": "BASE",
                "valid_until": None
            }

        # Resolve active addons to verify current validity
        addons = await cls.get_active_addons(user_id, db)
        
        has_all_accounts = any(
            a.addon_id in ["AI_INTELLIGENCE_ALL_MONTHLY", "AI_INTELLIGENCE_ALL_YEARLY"] 
            for a in addons
        )
        
        if has_all_accounts:
            # Find earliest expiration date among active All Account subscriptions
            expiry = max(a.expires_at for a in addons if a.addon_id in ["AI_INTELLIGENCE_ALL_MONTHLY", "AI_INTELLIGENCE_ALL_YEARLY"])
            
            # Sync meta account fields self-healingly
            if acc.ai_intelligence_status != "active":
                acc.ai_intelligence_status = "active"
                acc.historical_intelligence_status = "active"
                db.add(acc)
                await db.commit()
                
            return {
                "enabled": True,
                "scope": "ALL_ACCOUNTS",
                "source": "AI_INTELLIGENCE_ALL",
                "ad_account_id": str(acc.id),
                "historical_access": "FULL",
                "valid_until": expiry
            }
            
        # Check individual accounts active
        has_individual = any(
            a.addon_id in ["AI_INTELLIGENCE_INDIVIDUAL_MONTHLY", "AI_INTELLIGENCE_INDIVIDUAL_YEARLY", "ai_deep_analysis"]
            for a in addons
        )
        individual_slots = sum(
            a.quantity for a in addons 
            if a.addon_id in ["AI_INTELLIGENCE_INDIVIDUAL_MONTHLY", "AI_INTELLIGENCE_INDIVIDUAL_YEARLY", "ai_deep_analysis"]
        )
        
        if has_individual and individual_slots > 0:
            # Check if this specific account is currently assigned
            if acc.ai_intelligence_status == "active":
                # Check that we are within the slots count limit self-healingly
                stmt_active_assigned = (
                    select(MetaAdAccount)
                    .where(MetaAdAccount.user_id == user_id)
                    .where(MetaAdAccount.ai_intelligence_status == "active")
                )
                res_active = await db.execute(stmt_active_assigned)
                active_assigned = res_active.scalars().all()
                
                # If we exceed the slots (e.g. some slots expired), revert excess
                if len(active_assigned) > individual_slots:
                    # Keep the earliest active ones up to slot count, pause others
                    active_assigned.sort(key=lambda x: x.created_at)
                    for i, a_item in enumerate(active_assigned):
                        if i >= individual_slots:
                            a_item.ai_intelligence_status = "none"
                            a_item.historical_intelligence_status = "paused"
                            db.add(a_item)
                    await db.commit()
                    
                    # Re-evaluate current account status
                    if acc.ai_intelligence_status != "active":
                        return {
                            "enabled": False,
                            "scope": "BASE_LIMIT",
                            "source": "BASE_PLAN_AI_LIMIT",
                            "historical_access": "BASE",
                            "valid_until": None
                        }
                
                expiry = max(a.expires_at for a in addons if a.addon_id in ["AI_INTELLIGENCE_INDIVIDUAL_MONTHLY", "AI_INTELLIGENCE_INDIVIDUAL_YEARLY", "ai_deep_analysis"])
                return {
                    "enabled": True,
                    "scope": "ACCOUNT",
                    "source": "AI_INTELLIGENCE_INDIVIDUAL",
                    "ad_account_id": str(acc.id),
                    "historical_access": "FULL",
                    "valid_until": expiry
                }

        # If we have no active AI Intelligence entitlements, but account is still marked active, self-heal revert it to paused!
        if acc.ai_intelligence_status == "active":
            acc.ai_intelligence_status = "none"
            acc.historical_intelligence_status = "paused"
            db.add(acc)
            await db.commit()

        # Check base plan historical days
        return {
            "enabled": False,
            "scope": "BASE_LIMIT",
            "source": "BASE_PLAN_AI_LIMIT",
            "historical_access": "BASE",
            "valid_until": None
        }

    @classmethod
    async def enforce_historical_days(
        cls, 
        start_date: date, 
        user: User, 
        db: AsyncSession, 
        ad_account_id: Optional[str] = None
    ) -> date:
        """Capping the start date of a query window based on user plan entitlements."""
        ent = await cls.resolve_entitlements(user, db)
        historical_days = ent.get("historical_days", 30)
        
        # If we have a specific ad account, check assignment status
        if ad_account_id:
            import uuid
            from app.models.meta import MetaAdAccount
            stmt = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
            try:
                acc_uuid = uuid.UUID(ad_account_id)
                stmt = stmt.where(MetaAdAccount.id == acc_uuid)
            except (ValueError, TypeError):
                stmt = stmt.where(MetaAdAccount.meta_account_id == ad_account_id)
            res = await db.execute(stmt)
            acc = res.scalar_one_or_none()
            
            if acc and acc.historical_intelligence_status == "active":
                historical_days = 99999
            else:
                # If not active/assigned, cap at base plan limit (Trial=30, Starter=30, Growth=90, Pro=180, Agency=365)
                plan_id = user.plan_id or "free"
                is_trial_active = False
                if user.trial_status == "active" and user.trial_ends_at:
                    is_trial_active = user.trial_ends_at.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc)
                
                if is_trial_active or plan_id == "starter":
                    historical_days = 30
                elif plan_id == "growth":
                    historical_days = 90
                elif plan_id == "pro":
                    historical_days = 180
                elif plan_id == "agency":
                    historical_days = 365
                else:
                    historical_days = 30

        if historical_days > 3650:
            return start_date
        oldest_allowed = date.today() - timedelta(days=historical_days)
        return max(start_date, oldest_allowed)

    @staticmethod
    async def get_accessible_user_ids(user: User, db: AsyncSession) -> List[Any]:
        """Returns list of User UUIDs whose resources the logged-in user can access."""
        from app.models.team import TeamMember
        ids = [user.id]
        stmt = select(TeamMember.user_id).where(TeamMember.email == user.email.lower())
        res = await db.execute(stmt)
        invited_by_ids = res.scalars().all()
        ids.extend(invited_by_ids)
        return ids
