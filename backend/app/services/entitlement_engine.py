"""
Digital Growth Studio — Configuration-driven Entitlement Engine
"""
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List

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
        "historical_days": 90,
        "sync_interval_hours": 48,
        "max_team_members": 1,
        "ai_recommendations_limit": 999999,
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
        "max_team_members": 3,
        "ai_recommendations_limit": 999999,
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
        "historical_days": 99999,
        "sync_interval_hours": 6,
        "max_team_members": 10,
        "ai_recommendations_limit": 999999,
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
        "historical_days": 99999,
        "sync_interval_hours": 6,
        "max_team_members": 25,
        "ai_recommendations_limit": 999999,
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
    async def resolve_entitlements(cls, user: User, db: AsyncSession) -> Dict[str, Any]:
        """
        Combines user subscription plan limits and active add-on quantities.
        Dynamically checks for active trials and active paid subscriptions.
        """
        # 1. Check if user has active trial
        is_trial_active = False
        if user.trial_status == "active" and user.trial_ends_at:
            ends_at = user.trial_ends_at
            if ends_at.tzinfo is None:
                ends_at = ends_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) <= ends_at:
                is_trial_active = True

        # 2. Check if user has active paid subscription
        stmt = (
            select(Subscription)
            .where(Subscription.user_id == user.id)
            .where(Subscription.status == "active")
            .order_by(Subscription.expires_at.desc())
        )
        res = await db.execute(stmt)
        sub = res.scalar_one_or_none()

        if sub:
            # Self-healing trial removal if user has a paid subscription
            if user.trial_status != "none" or user.trial_ends_at is not None:
                user.trial_status = "none"
                user.trial_ends_at = None
                user.trial_started_at = None
                user.trial_used = True
                db.add(user)
                # Note: db.commit() is expected to be called by the caller, but we can safely call it or flush
            plan_id = sub.plan.lower()
            is_trial_active = False
        elif is_trial_active:
            plan_id = "starter"
        else:
            plan_id = "free"  # Zero-entitlement locked state

        base_config = cls.get_plan_config(plan_id)
        
        # Load user add-ons
        addons = await cls.get_active_addons(user.id, db)
        
        # 1. Total allowed accounts (Base + Additional Add-Ons)
        additional_accounts_qty = sum(a.quantity for a in addons if a.addon_id == "additional_account")
        max_meta_accounts = base_config["max_meta_accounts"] + additional_accounts_qty
        
        # 2. Total allowed team members (Base + Additional Members Add-Ons)
        additional_members_qty = sum(a.quantity for a in addons if a.addon_id == "additional_team_member")
        max_team_members = base_config["max_team_members"] + additional_members_qty

        # 3. Faster Sync overriding interval
        has_faster_sync = any(a.addon_id == "faster_sync" for a in addons)
        sync_interval_hours = 3 if has_faster_sync else base_config["sync_interval_hours"]

        # 4. Lifetime History overriding retention days
        has_lifetime_history = any(
            a.addon_id in ["lifetime_history_monthly", "lifetime_history_annual"] 
            for a in addons
        )
        
        # Resolve dynamic historical days limits
        if has_lifetime_history:
            historical_days = 99999
        elif is_trial_active:
            historical_days = 7
        elif plan_id in ["starter", "growth"]:
            historical_days = 90
        elif plan_id in ["pro", "agency"]:
            historical_days = 99999
        else:
            historical_days = base_config["historical_days"]

        # 5. AI Deep Analysis entitlement
        has_ai_deep = any(a.addon_id == "ai_deep_analysis" for a in addons) or (plan_id.lower() in ["growth", "pro", "agency"])

        # Compile resolved features dictionary
        feature_gates = dict(base_config["feature_gates"])
        if has_ai_deep:
            feature_gates["ai_deep_analysis"] = True

        return {
            "plan_id": plan_id,
            "max_meta_accounts": max_meta_accounts,
            "max_team_members": max_team_members,
            "sync_interval_hours": sync_interval_hours,
            "historical_days": historical_days,
            "ai_recommendations_limit": base_config["ai_recommendations_limit"],
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
            a.addon_id in ["AI_INTELLIGENCE_INDIVIDUAL_MONTHLY", "AI_INTELLIGENCE_INDIVIDUAL_YEARLY"]
            for a in addons
        )
        individual_slots = sum(
            a.quantity for a in addons 
            if a.addon_id in ["AI_INTELLIGENCE_INDIVIDUAL_MONTHLY", "AI_INTELLIGENCE_INDIVIDUAL_YEARLY"]
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
                
                expiry = max(a.expires_at for a in addons if a.addon_id in ["AI_INTELLIGENCE_INDIVIDUAL_MONTHLY", "AI_INTELLIGENCE_INDIVIDUAL_YEARLY"])
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
