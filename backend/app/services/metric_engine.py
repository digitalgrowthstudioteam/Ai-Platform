"""
Digital Growth Studio — Centralized Metric Engine (Phase 3)

Defines standardized metrics and provides a safe calculation engine 
with automatic handling for division by zero (returning None).
"""
from typing import Dict, Any, Optional, List

# Metric definition catalog mapping metadata and formatting info
METRIC_CATALOG: Dict[str, Dict[str, Any]] = {
    "spend": {"name": "Spend", "category": "DELIVERY", "unit": "currency", "format": "currency", "precision": 2},
    "impressions": {"name": "Impressions", "category": "DELIVERY", "unit": "count", "format": "integer", "precision": 0},
    "reach": {"name": "Reach", "category": "DELIVERY", "unit": "count", "format": "integer", "precision": 0},
    "frequency": {"name": "Frequency", "category": "DELIVERY", "unit": "count", "format": "float", "precision": 2},
    "cpm": {"name": "CPM", "category": "DELIVERY", "unit": "currency", "format": "currency", "precision": 2},
    
    "clicks": {"name": "Clicks", "category": "DIAGNOSTIC", "unit": "count", "format": "integer", "precision": 0},
    "link_clicks": {"name": "Link Clicks", "category": "DIAGNOSTIC", "unit": "count", "format": "integer", "precision": 0},
    "ctr": {"name": "CTR (All)", "category": "DIAGNOSTIC", "unit": "percent", "format": "percent", "precision": 2},
    "link_ctr": {"name": "Link Click CTR", "category": "DIAGNOSTIC", "unit": "percent", "format": "percent", "precision": 2},
    "cpc": {"name": "CPC (Link)", "category": "DIAGNOSTIC", "unit": "currency", "format": "currency", "precision": 2},
    "landing_page_views": {"name": "Landing Page Views", "category": "DIAGNOSTIC", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_lpv": {"name": "Cost per Landing Page View", "category": "DIAGNOSTIC", "unit": "currency", "format": "currency", "precision": 2},
    "lpv_rate": {"name": "LPView Rate", "category": "DIAGNOSTIC", "unit": "percent", "format": "percent", "precision": 2},

    "leads": {"name": "Leads", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cpl": {"name": "Cost per Lead", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "lead_rate": {"name": "Lead Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},

    "qualified_leads": {"name": "Qualified Leads", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_qualified_lead": {"name": "Cost per Qualified Lead", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "qualification_rate": {"name": "Lead Qualification Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},

    "calls": {"name": "Calls", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_call": {"name": "Cost per Call", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "call_rate": {"name": "Call Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},

    "conversations": {"name": "Messaging Connections", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_conversation": {"name": "Cost per Messaging Connection", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "conversation_rate": {"name": "Messaging Connection Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},

    "video_views": {"name": "3-Sec Video Views", "category": "VIDEO", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_video_view": {"name": "Cost per Video View", "category": "VIDEO", "unit": "currency", "format": "currency", "precision": 2},
    "thruplays": {"name": "ThruPlays", "category": "VIDEO", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_thruplay": {"name": "Cost per ThruPlay", "category": "VIDEO", "unit": "currency", "format": "currency", "precision": 2},
    "thruplay_rate": {"name": "ThruPlay Rate", "category": "VIDEO", "unit": "percent", "format": "percent", "precision": 2},
    "video_play_2": {"name": "2-Sec Video Views", "category": "VIDEO", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_two_sec_view": {"name": "Cost per 2-Sec Video View", "category": "VIDEO", "unit": "currency", "format": "currency", "precision": 2},
    "two_sec_view_rate": {"name": "2-Sec View Rate", "category": "VIDEO", "unit": "percent", "format": "percent", "precision": 2},
    "avg_watch_time": {"name": "Avg Watch Time", "category": "VIDEO", "unit": "seconds", "format": "float", "precision": 1},

    "conversions": {"name": "Website Conversions", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_conversion": {"name": "Cost per Conversion", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "conversion_rate": {"name": "Conversion Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},

    "purchases": {"name": "Purchases", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cpa": {"name": "Cost per Purchase (CPA)", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "purchase_cvr": {"name": "Purchase CVR", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},
    "roas": {"name": "Purchase ROAS", "category": "BUSINESS", "unit": "multiplier", "format": "float", "precision": 2},
    "revenue": {"name": "Revenue", "category": "BUSINESS", "unit": "currency", "format": "currency", "precision": 2},

    "messaging_leads": {"name": "Messaging Leads", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_messaging_lead": {"name": "Cost per Messaging Lead", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "messaging_purchases": {"name": "Messaging Purchases", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_messaging_purchase": {"name": "Cost per Messaging Purchase", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},

    "event_responses": {"name": "Event Responses", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_event_response": {"name": "Cost per Event Response", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "event_response_rate": {"name": "Event Response Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},

    "app_installs": {"name": "App Installs", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_app_install": {"name": "Cost per App Install", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "app_install_rate": {"name": "App Install Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},
    "app_events": {"name": "App Events", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_app_event": {"name": "Cost per App Event", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "app_event_rate": {"name": "App Event Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},

    "post_engagement": {"name": "Post Engagement", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_post_engagement": {"name": "Cost per Post Engagement", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "post_engagement_rate": {"name": "Post Engagement Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},

    "page_likes": {"name": "Page Likes", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_page_like": {"name": "Cost per Page Like", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "page_like_rate": {"name": "Page Like Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},

    "profile_visits": {"name": "Profile Visits", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_profile_visit": {"name": "Cost per Profile Visit", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "profile_visit_rate": {"name": "Profile Visit Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},

    "reminders": {"name": "Reminders Set", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_reminder": {"name": "Cost per Reminder Set", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "reminder_rate": {"name": "Reminder Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},

    "ad_recall_lift": {"name": "Ad Recall Lift", "category": "PRIMARY", "unit": "count", "format": "integer", "precision": 0},
    "cost_per_ad_recall_lift": {"name": "Cost per Recall Lift", "category": "PRIMARY", "unit": "currency", "format": "currency", "precision": 2},
    "ad_recall_rate": {"name": "Recall Rate", "category": "PRIMARY", "unit": "percent", "format": "percent", "precision": 2},
}


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
            cls._safe_divide(landing_page_views, impressions) * 100.0
            if impressions > 0
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
