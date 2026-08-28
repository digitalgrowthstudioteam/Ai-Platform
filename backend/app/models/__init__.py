"""
Digital Growth Studio — Models Package Exports
Import all models here so that they are registered on Base.metadata
and picked up by Alembic migrations autogenerate.
"""
from app.models.base import BaseModel
from app.models.user import User
from app.models.subscription import Subscription
from app.models.subscription_addon import SubscriptionAddOn
from app.models.meta import MetaConnection, MetaAdAccount
from app.models.campaign import Campaign, AdSet, Ad
from app.models.creative import Creative
from app.models.metrics import (
    CampaignDailyMetrics,
    AdSetDailyMetrics,
    AdDailyMetrics,
    AdBreakdownDailyMetrics,
    CampaignMetricsAggregate,
    AdSetMetricsAggregate,
    AdMetricsAggregate,
)
from app.models.recommendation import AIRecommendation
from app.models.daily_brief import AIDailyBrief, AIWeeklyBrief
from app.models.experiment import AccountMemory, AdExperiment
from app.models.ml_features import MLFeatureRecord, OptimizationAction
from app.models.team import TeamMember
from app.models.ticket import SupportTicket
from app.models.notification import Notification
from app.models.ai_optimization import AIOptimizationConfig, AIOptimizationLog
from app.models.ai_assistant import AIChatConversation, AIChatMessage, AICreditTransaction
from app.models.admin_config import AdminConfig
from app.models.ai_usage import AIUsageRecord
from app.models.funnel import FunnelRecommendation, FunnelAudit, FunnelEvent
from app.models.ads_service import MetaAdServiceRequest, AdPack, ServiceQuotation, CampaignPlan
from app.models.manual_expense import ManualExpense
from app.models.email_config import EmailTemplateConfig

__all__ = [
    "BaseModel",
    "EmailTemplateConfig",
    "User",
    "Subscription",
    "SubscriptionAddOn",
    "MetaConnection",
    "MetaAdAccount",
    "Campaign",
    "AdSet",
    "Ad",
    "Creative",
    "CampaignDailyMetrics",
    "AdSetDailyMetrics",
    "AdDailyMetrics",
    "AdBreakdownDailyMetrics",
    "CampaignMetricsAggregate",
    "AdSetMetricsAggregate",
    "AdMetricsAggregate",
    "AIRecommendation",
    "AIDailyBrief",
    "AIWeeklyBrief",
    "AccountMemory",
    "AdExperiment",
    "MLFeatureRecord",
    "OptimizationAction",
    "TeamMember",
    "SupportTicket",
    "Notification",
    "AIOptimizationConfig",
    "AIOptimizationLog",
    "AIChatConversation",
    "AIChatMessage",
    "AICreditTransaction",
    "AdminConfig",
    "AIUsageRecord",
    "FunnelRecommendation",
    "FunnelAudit",
    "FunnelEvent",
    "MetaAdServiceRequest",
    "AdPack",
    "ServiceQuotation",
    "CampaignPlan",
    "ManualExpense",
]
