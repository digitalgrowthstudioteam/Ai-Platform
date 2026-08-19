"""
Digital Growth Studio — Centralized Metric Engine (Phase 3)

Defines standardized metrics and provides a safe calculation engine 
with automatic handling for division by zero (returning None).
"""
from typing import Dict, Any, Optional, List

# Metric definition catalog mapping metadata and formatting info (Phase 10 Catalog Registry)
METRIC_CATALOG: Dict[str, Dict[str, Any]] = {
    "spend": {
        "metric_name": "spend",
        "display_name": "Spend",
        "category": "DELIVERY",
        "description": "Total amount of money spent on ads",
        "source": "Meta Ads",
        "source_field": "spend",
        "formula": "sum(spend)",
        "unit": "currency",
        "direction": "context-dependent",
        "entity_levels": ["account", "campaign", "adset", "ad"],
        "aggregation_type": "sum",
        "supported_windows": ["1D", "3D", "7D", "14D", "30D", "90D", "lifetime"],
        "availability_status": "available",
        "requires_crm": False,
        "requires_offline_data": False,
        "ai_enabled": True,
        "dashboard_enabled": True,
        "precision": 2
    },
    "impressions": {
        "metric_name": "impressions",
        "display_name": "Impressions",
        "category": "DELIVERY",
        "description": "Number of times ads were on screen",
        "source": "Meta Ads",
        "source_field": "impressions",
        "formula": "sum(impressions)",
        "unit": "count",
        "direction": "context-dependent",
        "entity_levels": ["account", "campaign", "adset", "ad"],
        "aggregation_type": "sum",
        "supported_windows": ["1D", "3D", "7D", "14D", "30D", "90D", "lifetime"],
        "availability_status": "available",
        "requires_crm": False,
        "requires_offline_data": False,
        "ai_enabled": True,
        "dashboard_enabled": True,
        "precision": 0
    },
    "reach": {
        "metric_name": "reach",
        "display_name": "Reach",
        "category": "DELIVERY",
        "description": "Number of unique people who saw ads",
        "source": "Meta Ads",
        "source_field": "reach",
        "formula": "sum(reach)",
        "unit": "count",
        "direction": "context-dependent",
        "entity_levels": ["account", "campaign", "adset", "ad"],
        "aggregation_type": "sum",
        "supported_windows": ["1D", "3D", "7D", "14D", "30D", "90D", "lifetime"],
        "availability_status": "available",
        "requires_crm": False,
        "requires_offline_data": False,
        "ai_enabled": True,
        "dashboard_enabled": True,
        "precision": 0
    },
    "frequency": {
        "metric_name": "frequency",
        "display_name": "Frequency",
        "category": "DELIVERY",
        "description": "Average number of times each person saw ads",
        "source": "Calculated",
        "source_field": "N/A",
        "formula": "impressions / reach",
        "unit": "count",
        "direction": "context-dependent",
        "entity_levels": ["account", "campaign", "adset", "ad"],
        "aggregation_type": "derived",
        "supported_windows": ["1D", "3D", "7D", "14D", "30D", "90D", "lifetime"],
        "availability_status": "available",
        "requires_crm": False,
        "requires_offline_data": False,
        "ai_enabled": True,
        "dashboard_enabled": True,
        "precision": 2
    },
    "cpm": {
        "metric_name": "cpm",
        "display_name": "CPM",
        "category": "DELIVERY",
        "description": "Cost per 1,000 impressions",
        "source": "Calculated",
        "source_field": "N/A",
        "formula": "spend / impressions * 1000",
        "unit": "currency",
        "direction": "lower_is_better",
        "entity_levels": ["account", "campaign", "adset", "ad"],
        "aggregation_type": "derived",
        "supported_windows": ["1D", "3D", "7D", "14D", "30D", "90D", "lifetime"],
        "availability_status": "available",
        "requires_crm": False,
        "requires_offline_data": False,
        "ai_enabled": True,
        "dashboard_enabled": True,
        "precision": 2
    },
    "link_clicks": {
        "metric_name": "link_clicks",
        "display_name": "Link Clicks",
        "category": "DIAGNOSTIC",
        "description": "Number of clicks on links inside ads",
        "source": "Meta Ads",
        "source_field": "actions:link_click",
        "formula": "sum(link_clicks)",
        "unit": "count",
        "direction": "higher_is_better",
        "entity_levels": ["account", "campaign", "adset", "ad"],
        "aggregation_type": "sum",
        "supported_windows": ["1D", "3D", "7D", "14D", "30D", "90D", "lifetime"],
        "availability_status": "available",
        "requires_crm": False,
        "requires_offline_data": False,
        "ai_enabled": True,
        "dashboard_enabled": True,
        "precision": 0
    },
    "link_ctr": {
        "metric_name": "link_ctr",
        "display_name": "Link CTR",
        "category": "DIAGNOSTIC",
        "description": "Link CTR ratio",
        "source": "Calculated",
        "source_field": "N/A",
        "formula": "link_clicks / impressions",
        "unit": "percent",
        "direction": "higher_is_better",
        "entity_levels": ["account", "campaign", "adset", "ad"],
        "aggregation_type": "derived",
        "supported_windows": ["1D", "3D", "7D", "14D", "30D", "90D", "lifetime"],
        "availability_status": "available",
        "requires_crm": False,
        "requires_offline_data": False,
        "ai_enabled": True,
        "dashboard_enabled": True,
        "precision": 2
    },
    "landing_page_views": {
        "metric_name": "landing_page_views",
        "display_name": "Landing Page Views",
        "category": "DIAGNOSTIC",
        "description": "Number of landing page views",
        "source": "Meta Ads",
        "source_field": "actions:landing_page_view",
        "formula": "sum(landing_page_views)",
        "unit": "count",
        "direction": "higher_is_better",
        "entity_levels": ["account", "campaign", "adset", "ad"],
        "aggregation_type": "sum",
        "supported_windows": ["1D", "3D", "7D", "14D", "30D", "90D", "lifetime"],
        "availability_status": "available",
        "requires_crm": False,
        "requires_offline_data": False,
        "ai_enabled": True,
        "dashboard_enabled": True,
        "precision": 0
    },
    "lpv_rate": {
        "metric_name": "lpv_rate",
        "display_name": "Landing Page View Rate",
        "category": "DIAGNOSTIC",
        "description": "Landing page views over link clicks ratio",
        "source": "Calculated",
        "source_field": "N/A",
        "formula": "landing_page_views / link_clicks",
        "unit": "percent",
        "direction": "higher_is_better",
        "entity_levels": ["account", "campaign", "adset", "ad"],
        "aggregation_type": "derived",
        "supported_windows": ["1D", "3D", "7D", "14D", "30D", "90D", "lifetime"],
        "availability_status": "available",
        "requires_crm": False,
        "requires_offline_data": False,
        "ai_enabled": True,
        "dashboard_enabled": True,
        "precision": 2
    },
    "landing_page_to_lead_conversion_rate": {
        "metric_name": "landing_page_to_lead_conversion_rate",
        "display_name": "Landing Page to Lead Conversion Rate",
        "category": "PRIMARY",
        "description": "Leads over landing page views ratio",
        "source": "Calculated",
        "source_field": "N/A",
        "formula": "leads / landing_page_views",
        "unit": "percent",
        "direction": "higher_is_better",
        "entity_levels": ["account", "campaign", "adset", "ad"],
        "aggregation_type": "derived",
        "supported_windows": ["1D", "3D", "7D", "14D", "30D", "90D", "lifetime"],
        "availability_status": "available",
        "requires_crm": False,
        "requires_offline_data": False,
        "ai_enabled": True,
        "dashboard_enabled": True,
        "precision": 2
    },
    "unique_link_clicks": {
        "metric_name": "unique_link_clicks",
        "display_name": "Unique Link Clicks",
        "category": "DIAGNOSTIC",
        "description": "Unique clicks count",
        "source": "Meta Ads",
        "source_field": "unique_clicks",
        "formula": "N/A",
        "unit": "count",
        "direction": "higher_is_better",
        "entity_levels": ["account"],
        "aggregation_type": "sum",
        "supported_windows": [],
        "availability_status": "unavailable",
        "requires_crm": False,
        "requires_offline_data": False,
        "ai_enabled": False,
        "dashboard_enabled": False,
        "precision": 0
    },
    "unique_outbound_clicks": {
        "metric_name": "unique_outbound_clicks",
        "display_name": "Unique Outbound Clicks",
        "category": "DIAGNOSTIC",
        "description": "Unique outbound clicks count",
        "source": "Meta Ads",
        "source_field": "unique_outbound_clicks",
        "formula": "N/A",
        "unit": "count",
        "direction": "higher_is_better",
        "entity_levels": ["account"],
        "aggregation_type": "sum",
        "supported_windows": [],
        "availability_status": "unavailable",
        "requires_crm": False,
        "requires_offline_data": False,
        "ai_enabled": False,
        "dashboard_enabled": False,
        "precision": 0
    },
    "lead_to_customer_rate": {
        "metric_name": "lead_to_customer_rate",
        "display_name": "Lead-to-Customer Rate",
        "category": "PRIMARY",
        "description": "CRM customer conversion rate",
        "source": "CRM Integration",
        "source_field": "customer_status",
        "formula": "N/A",
        "unit": "percent",
        "direction": "higher_is_better",
        "entity_levels": ["account"],
        "aggregation_type": "derived",
        "supported_windows": [],
        "availability_status": "unavailable",
        "requires_crm": True,
        "requires_offline_data": False,
        "ai_enabled": False,
        "dashboard_enabled": False,
        "precision": 2
    },
    "qualified_leads": {
        "metric_name": "qualified_leads",
        "display_name": "Qualified Leads",
        "category": "PRIMARY",
        "description": "CRM Qualified Leads count",
        "source": "CRM Integration",
        "source_field": "qualified_status",
        "formula": "N/A",
        "unit": "count",
        "direction": "higher_is_better",
        "entity_levels": ["account"],
        "aggregation_type": "sum",
        "supported_windows": [],
        "availability_status": "unavailable",
        "requires_crm": True,
        "requires_offline_data": False,
        "ai_enabled": False,
        "dashboard_enabled": False,
        "precision": 0
    },
    "cost_per_qualified_lead": {
        "metric_name": "cost_per_qualified_lead",
        "display_name": "Cost per Qualified Lead",
        "category": "PRIMARY",
        "description": "Spend divided by CRM qualified leads",
        "source": "Calculated",
        "source_field": "N/A",
        "formula": "spend / qualified_leads",
        "unit": "currency",
        "direction": "lower_is_better",
        "entity_levels": ["account"],
        "aggregation_type": "derived",
        "supported_windows": [],
        "availability_status": "unavailable",
        "requires_crm": True,
        "requires_offline_data": False,
        "ai_enabled": False,
        "dashboard_enabled": False,
        "precision": 2
    }
}

# Dynamically backport "name" key to preserve compatibility with existing backend files
for k, v in METRIC_CATALOG.items():
    if "name" not in v:
        v["name"] = v.get("display_name") or k.replace("_", " ").title()


class MetricEngine:
    """
    Mathematical formula execution engine with safe division protections.
    """

    @staticmethod
    def _safe_divide(numerator: float, denominator: float) -> Optional[float]:
        """Division with zero-handling return None if denominator is zero."""
        if denominator is None or denominator == 0:
            return None
        if numerator is None:
            return 0.0
        return float(numerator) / float(denominator)

    @classmethod
    def calculate_derived_metrics(cls, raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes raw metric numbers and calculates all derived business metrics safely.
        """
        spend = float(raw.get("spend") or 0.0)
        impressions = int(raw.get("impressions") or 0)
        reach = int(raw.get("reach") or 0)
        clicks = int(raw.get("clicks") or 0)
        link_clicks = int(raw.get("link_clicks") or 0)
        leads = int(raw.get("leads") or 0)
        qualified_leads = int(raw.get("qualified_leads") or 0)
        calls = int(raw.get("calls") or 0)
        conversations = int(raw.get("conversations") or 0)
        video_views = int(raw.get("video_views") or 0)
        thruplays = int(raw.get("thruplays") or 0)
        video_play_2 = int(raw.get("video_play_2") or 0)
        conversions = int(raw.get("conversions") or 0)
        purchases = int(raw.get("purchases") or 0)
        revenue = float(raw.get("revenue") or 0.0)
        
        # Video milestones
        video_play_25 = int(raw.get("video_play_25") or 0)
        video_play_50 = int(raw.get("video_play_50") or 0)
        video_play_75 = int(raw.get("video_play_75") or 0)
        video_play_95 = int(raw.get("video_play_95") or 0)
        video_play_100 = int(raw.get("video_play_100") or 0)

        # Social interactions
        comments = int(raw.get("comments") or 0)
        shares = int(raw.get("shares") or 0)
        saves = int(raw.get("saves") or 0)
        reactions = int(raw.get("reactions") or 0)

        # Messaging and apps
        messaging_leads = int(raw.get("messaging_leads") or 0)
        messaging_purchases = int(raw.get("messaging_purchases") or 0)
        event_responses = int(raw.get("event_responses") or 0)
        app_installs = int(raw.get("app_installs") or 0)
        app_events = int(raw.get("app_events") or 0)
        
        # Engagements
        post_engagement = int(raw.get("post_engagement") or 0)
        page_likes = int(raw.get("page_likes") or 0)
        profile_visits = int(raw.get("profile_visits") or 0)
        reminders = int(raw.get("reminders") or 0)
        ad_recall_lift = int(raw.get("ad_recall_lift") or 0)
        landing_page_views = int(raw.get("landing_page_views") or 0)

        # Standard outputs
        out = {
            "spend": spend,
            "impressions": impressions,
            "reach": reach,
            "clicks": clicks,
            "link_clicks": link_clicks,
            "leads": leads,
            "qualified_leads": qualified_leads,
            "calls": calls,
            "conversations": conversations,
            "video_views": video_views,
            "thruplays": thruplays,
            "video_play_2": video_play_2,
            "conversions": conversions,
            "purchases": purchases,
            "revenue": revenue,
            "messaging_leads": messaging_leads,
            "messaging_purchases": messaging_purchases,
            "event_responses": event_responses,
            "app_installs": app_installs,
            "app_events": app_events,
            "post_engagement": post_engagement,
            "page_likes": page_likes,
            "profile_visits": profile_visits,
            "reminders": reminders,
            "ad_recall_lift": ad_recall_lift,
            "landing_page_views": landing_page_views,
            "video_play_25": video_play_25,
            "video_play_50": video_play_50,
            "video_play_75": video_play_75,
            "video_play_95": video_play_95,
            "video_play_100": video_play_100,
            "comments": comments,
            "shares": shares,
            "saves": saves,
            "reactions": reactions,
        }

        # Calculations
        out["frequency"] = cls._safe_divide(impressions, reach)
        out["cpm"] = (
            cls._safe_divide(spend, impressions) * 1000.0
            if impressions > 0
            else None
        )
        out["cpc"] = cls._safe_divide(spend, link_clicks or clicks)
        out["ctr"] = (
            cls._safe_divide(clicks, impressions) * 100.0
            if impressions > 0
            else None
        )
        out["link_ctr"] = (
            cls._safe_divide(link_clicks, impressions) * 100.0
            if impressions > 0
            else None
        )
        out["cost_per_lpv"] = cls._safe_divide(spend, landing_page_views)
        out["lpv_rate"] = (
            cls._safe_divide(landing_page_views, link_clicks) * 100.0
            if link_clicks > 0
            else None
        )
        out["landing_page_to_lead_conversion_rate"] = (
            cls._safe_divide(leads, landing_page_views) * 100.0
            if landing_page_views > 0
            else None
        )

        # Video completion rates
        out["video_starts"] = video_views
        out["video_3s_plays"] = video_views
        out["video_25_rate"] = (
            cls._safe_divide(video_play_25, video_views) * 100.0
            if video_views > 0
            else None
        )
        out["video_50_rate"] = (
            cls._safe_divide(video_play_50, video_views) * 100.0
            if video_views > 0
            else None
        )
        out["video_75_rate"] = (
            cls._safe_divide(video_play_75, video_views) * 100.0
            if video_views > 0
            else None
        )
        out["video_95_rate"] = (
            cls._safe_divide(video_play_95, video_views) * 100.0
            if video_views > 0
            else None
        )
        out["video_100_rate"] = (
            cls._safe_divide(video_play_100, video_views) * 100.0
            if video_views > 0
            else None
        )
        out["video_hold_rate"] = (
            cls._safe_divide(thruplays, video_views) * 100.0
            if video_views > 0
            else None
        )

        # Leads
        out["cpl"] = cls._safe_divide(spend, leads)
        out["lead_rate"] = (
            cls._safe_divide(leads, impressions) * 100.0
            if impressions > 0
            else None
        )

        # Qualified leads
        out["cost_per_qualified_lead"] = cls._safe_divide(spend, qualified_leads)
        out["qualification_rate"] = (
            cls._safe_divide(qualified_leads, leads) * 100.0
            if leads > 0
            else None
        )

        # Calls
        out["cost_per_call"] = cls._safe_divide(spend, calls)
        out["call_rate"] = (
            cls._safe_divide(calls, impressions) * 100.0
            if impressions > 0
            else None
        )

        # Conversations
        out["cost_per_conversation"] = cls._safe_divide(spend, conversations)
        out["conversation_rate"] = (
            cls._safe_divide(conversations, impressions) * 100.0
            if impressions > 0
            else None
        )

        # Video
        out["cost_per_video_view"] = cls._safe_divide(spend, video_views)
        out["cost_per_thruplay"] = cls._safe_divide(spend, thruplays)
        out["thruplay_rate"] = (
            cls._safe_divide(thruplays, impressions) * 100.0
            if impressions > 0
            else None
        )
        out["cost_per_two_sec_view"] = cls._safe_divide(spend, video_play_2)
        out["two_sec_view_rate"] = (
            cls._safe_divide(video_play_2, impressions) * 100.0
            if impressions > 0
            else None
        )
        out["avg_watch_time"] = raw.get("avg_watch_time")

        # Conversions & Purchases
        out["cost_per_conversion"] = cls._safe_divide(spend, conversions)
        out["conversion_rate"] = (
            cls._safe_divide(conversions, impressions) * 100.0
            if impressions > 0
            else None
        )
        out["cpa"] = cls._safe_divide(spend, purchases)
        out["purchase_cvr"] = (
            cls._safe_divide(purchases, link_clicks or clicks) * 100.0
            if (link_clicks or clicks) > 0
            else None
        )
        out["roas"] = cls._safe_divide(revenue, spend)

        # Messaging leads & purchases
        out["cost_per_messaging_lead"] = cls._safe_divide(spend, messaging_leads)
        out["cost_per_messaging_purchase"] = cls._safe_divide(spend, messaging_purchases)

        # Events and apps
        out["cost_per_event_response"] = cls._safe_divide(spend, event_responses)
        out["event_response_rate"] = (
            cls._safe_divide(event_responses, impressions) * 100.0
            if impressions > 0
            else None
        )
        out["cost_per_app_install"] = cls._safe_divide(spend, app_installs)
        out["app_install_rate"] = (
            cls._safe_divide(app_installs, impressions) * 100.0
            if impressions > 0
            else None
        )
        out["cost_per_app_event"] = cls._safe_divide(spend, app_events)
        out["app_event_rate"] = (
            cls._safe_divide(app_events, impressions) * 100.0
            if impressions > 0
            else None
        )

        # Engagements
        out["cost_per_post_engagement"] = cls._safe_divide(spend, post_engagement)
        out["post_engagement_rate"] = (
            cls._safe_divide(post_engagement, impressions) * 100.0
            if impressions > 0
            else None
        )
        out["cost_per_page_like"] = cls._safe_divide(spend, page_likes)
        out["page_like_rate"] = (
            cls._safe_divide(page_likes, impressions) * 100.0
            if impressions > 0
            else None
        )
        out["cost_per_profile_visit"] = cls._safe_divide(spend, profile_visits)
        out["profile_visit_rate"] = (
            cls._safe_divide(profile_visits, impressions) * 100.0
            if impressions > 0
            else None
        )
        out["cost_per_reminder"] = cls._safe_divide(spend, reminders)
        out["reminder_rate"] = (
            cls._safe_divide(reminders, impressions) * 100.0
            if impressions > 0
            else None
        )
        out["cost_per_ad_recall_lift"] = cls._safe_divide(spend, ad_recall_lift)
        out["ad_recall_rate"] = (
            cls._safe_divide(ad_recall_lift, impressions) * 100.0
            if impressions > 0
            else None
        )

        return out
