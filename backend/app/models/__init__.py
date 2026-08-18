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
from app.models.team import TeamMember
from app.models.ticket import SupportTicket
from app.models.notification import Notification

__all__ = [
    "BaseModel",
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
    "TeamMember",
    "SupportTicket",
    "Notification",
]
