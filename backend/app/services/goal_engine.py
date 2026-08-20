"""
Digital Growth Studio — Performance Goal Engine (SSOT)
"""
from typing import Dict, Any, List, Optional

# Core metrics list from CORE_51 to determine standard available fields
CORE_51_FIELDS = {
    "spend", "impressions", "reach", "frequency", "cpm", "clicks", "link_clicks", "ctr", 
    "cpc", "cpm", "leads", "cpl", "purchases", "revenue", "roas", "cpa", "add_to_cart", 
    "initiate_checkout", "post_engagement", "video_views", "thruplays", "comments", 
    "shares", "saves", "reactions", "landing_page_views"
}

# Goal to Outcome mapping dictionary defining priorities and funnel stages
GOAL_MAP: Dict[str, Dict[str, Any]] = {
    "awareness": {
        "reach": {
            "primary": ["reach", "impressions", "frequency"],
            "supporting": ["cpm", "spend"],
            "diagnostic": ["reach_trend", "impressions_trend", "frequency_trend", "creative_fatigue", "audience_saturation"],
            "guardrail": ["budget_pacing", "data_quality", "minimum_spend", "insufficient_data"],
            "funnel": ["impressions", "reach", "frequency"],
        },
        "brand_awareness": {
            "primary": ["reach", "impressions", "brand_recall"],
            "supporting": ["frequency", "cpm", "video_views", "spend"],
            "diagnostic": ["video_retention", "engagement_rate", "creative_performance", "frequency_trend"],
            "guardrail": ["audience_saturation", "budget_pacing", "data_quality"],
            "funnel": ["impressions", "reach", "frequency"],
        },
        "video_views": {
            "primary": ["video_views", "video_play_3s", "thruplays"],
            "supporting": ["video_play_25", "video_play_50", "video_play_75", "video_play_95", "video_play_100"],
            "diagnostic": ["hook_rate", "video_hold_rate", "retention_curve", "average_watch_time", "creative_fatigue"],
            "guardrail": ["cpm", "frequency", "spend", "data_quality"],
            "funnel": ["impressions", "video_views", "thruplays"],
        }
    },
    "traffic": {
        "website": {
            "primary": ["link_clicks", "landing_page_views", "cost_per_landing_page_view"],
            "supporting": ["ctr", "cpc", "outbound_clicks", "outbound_ctr", "cpm"],
            "diagnostic": ["lpv_rate", "click_to_lpv_dropoff", "ctr_trend", "cpc_trend", "cpm_trend", "creative_fatigue"],
            "guardrail": ["frequency", "budget_pacing", "data_quality"],
            "funnel": ["impressions", "link_clicks", "landing_page_views"],
        },
        "outbound_traffic": {
            "primary": ["outbound_clicks", "cost_per_outbound_click", "outbound_ctr"],
            "supporting": ["link_clicks", "ctr", "cpc", "cpm", "reach"],
            "diagnostic": ["landing_page_views", "lpv_rate", "click_to_lpv_dropoff", "traffic_quality"],
            "guardrail": ["frequency", "budget_pacing", "data_quality"],
            "funnel": ["impressions", "link_clicks", "outbound_clicks"],
        },
        "instagram_profile_visits": {
            "primary": ["instagram_profile_visits", "cost_per_profile_visit"],
            "supporting": ["reach", "impressions", "link_clicks", "ctr", "cpc", "cpm"],
            "diagnostic": ["profile_visit_rate", "engagement_rate", "frequency", "creative_performance"],
            "guardrail": ["budget_pacing", "data_quality"],
            "funnel": ["impressions", "reach", "instagram_profile_visits"],
        }
    },
    "engagement": {
        "post_engagement": {
            "primary": ["post_engagement", "engagement_rate", "cost_per_engagement"],
            "supporting": ["reactions", "comments", "shares", "saves"],
            "diagnostic": ["engagement_trend", "engagement_mix", "ctr", "frequency", "creative_performance"],
            "guardrail": ["cpm", "budget_pacing", "data_quality"],
            "funnel": ["impressions", "clicks", "post_engagement"],
        },
        "video_engagement": {
            "primary": ["video_views", "thruplays", "thruplay_rate"],
            "supporting": ["video_play_3s", "video_play_25", "video_play_50", "video_play_75", "video_play_95", "video_play_100"],
            "diagnostic": ["hook_rate", "video_hold_rate", "retention_curve", "creative_fatigue"],
            "guardrail": ["cpm", "frequency", "spend", "data_quality"],
            "funnel": ["impressions", "video_views", "thruplays"],
        },
        "calls": {
            "primary": ["calls", "cost_per_call", "call_rate"],
            "supporting": ["link_clicks", "ctr", "cpc", "cpm", "reach", "frequency"],
            "diagnostic": ["click_to_call_rate", "lpv_to_call_rate", "call_trend", "creative_fatigue", "audience_saturation"],
            "guardrail": ["budget_pacing", "data_quality", "tracking_health", "minimum_data"],
            "funnel": ["impressions", "clicks", "calls"],
        }
    },
    "leads": {
        "website_leads": {
            "primary": ["leads", "cpl", "lead_conversion_rate"],
            "supporting": ["landing_page_views", "lpv_rate", "link_clicks", "ctr", "cpc", "cpm"],
            "diagnostic": ["landing_page_to_lead_conversion_rate", "funnel_dropoff", "frequency", "creative_fatigue", "audience_saturation"],
            "guardrail": ["budget_pacing", "tracking_health", "data_quality", "minimum_data"],
            "funnel": ["impressions", "link_clicks", "landing_page_views", "leads"],
            "crm_metrics": ["qualified_leads", "cost_per_qualified_lead", "lead_to_customer_rate"],
        },
        "instant_forms": {
            "primary": ["leads", "cpl", "form_conversion_rate"],
            "supporting": ["form_opens", "form_completions", "ctr", "cpc", "cpm"],
            "diagnostic": ["form_open_to_submit_rate", "creative_performance", "frequency", "audience_saturation"],
            "guardrail": ["budget_pacing", "data_quality", "minimum_data"],
            "funnel": ["impressions", "link_clicks", "leads"],
        },
        "calls_lead": {
            "primary": ["calls", "cost_per_call", "call_rate"],
            "supporting": ["ctr", "cpc", "cpm", "reach", "frequency"],
            "diagnostic": ["click_to_call_rate", "lpv_to_call_rate", "creative_fatigue", "audience_saturation"],
            "guardrail": ["budget_pacing", "tracking_health", "data_quality"],
            "funnel": ["impressions", "clicks", "calls"],
        }
    },
    "messaging": {
        "messenger": {
            "primary": ["conversations", "cost_per_conversation", "conversation_rate"],
            "supporting": ["link_clicks", "ctr", "cpc", "cpm", "reach", "frequency"],
            "diagnostic": ["conversation_trend", "cost_per_conversation_trend", "creative_fatigue", "audience_saturation", "ctr_trend"],
            "guardrail": ["budget_pacing", "data_quality", "minimum_data"],
            "funnel": ["impressions", "clicks", "conversations"],
        },
        "instagram_messages": {
            "primary": ["conversations", "cost_per_conversation", "conversation_rate"],
            "supporting": ["link_clicks", "ctr", "cpc", "cpm", "reach", "frequency"],
            "diagnostic": ["conversation_trend", "cost_per_conversation_trend", "creative_fatigue", "audience_saturation"],
            "guardrail": ["budget_pacing", "data_quality"],
            "funnel": ["impressions", "clicks", "conversations"],
        },
        "whatsapp": {
            "primary": ["conversations", "cost_per_conversation", "conversation_rate"],
            "supporting": ["link_clicks", "ctr", "cpc", "cpm", "reach", "frequency"],
            "diagnostic": ["conversation_trend", "cost_per_conversation_trend", "creative_fatigue", "audience_saturation"],
            "guardrail": ["budget_pacing", "data_quality", "minimum_data"],
            "funnel": ["impressions", "clicks", "conversations"],
        }
    },
    "sales": {
        "website_purchases": {
            "primary": ["purchases", "revenue", "roas", "cpa", "purchase_conversion_rate"],
            "supporting": ["add_to_cart", "cost_per_add_to_cart", "initiate_checkout", "cost_per_initiate_checkout", "aov", "ctr", "cpc"],
            "diagnostic": ["add_to_cart_rate", "checkout_rate", "purchase_rate", "funnel_dropoff", "cpm", "frequency", "creative_fatigue"],
            "guardrail": ["budget_pacing", "tracking_health", "data_quality", "attribution_status"],
            "funnel": ["impressions", "link_clicks", "landing_page_views", "add_to_cart", "initiate_checkout", "purchases"],
        },
        "catalogue_sales": {
            "primary": ["purchases", "revenue", "roas", "cpa"],
            "supporting": ["product_views", "add_to_cart", "initiate_checkout", "aov"],
            "diagnostic": ["product_performance", "creative_performance", "frequency", "cpm"],
            "guardrail": ["budget_pacing", "tracking_health", "data_quality"],
            "funnel": ["impressions", "add_to_cart", "initiate_checkout", "purchases"],
        }
    },
    "app_promotion": {
        "app_installs": {
            "primary": ["app_installs", "cost_per_install"],
            "supporting": ["link_clicks", "ctr", "cpc", "cpm", "reach"],
            "diagnostic": ["install_rate", "click_to_install_rate", "creative_performance", "frequency"],
            "guardrail": ["budget_pacing", "data_quality"],
            "funnel": ["impressions", "link_clicks", "app_installs"],
        },
        "app_events": {
            "primary": ["app_event_completions", "cost_per_event", "event_rate"],
            "supporting": ["app_installs", "install_to_event_rate", "ctr", "cpc"],
            "diagnostic": ["event_funnel", "retention", "frequency", "creative_fatigue"],
            "guardrail": ["budget_pacing", "data_quality"],
            "funnel": ["impressions", "app_installs", "app_event_completions"],
        }
    }
}

# WhatsApp custom field display name mapping
DISPLAY_NAMES = {
    "post_engagement": "Post Engagement",
    "video_views": "Video Views",
    "thruplays": "ThruPlays",
    "conversations": "Conversations",
    "cost_per_conversation": "Cost per Conversation",
    "conversation_rate": "Conversation Rate",
    "calls": "Calls",
    "cost_per_call": "Cost per Call",
    "call_rate": "Call Rate",
    "app_installs": "App Installs",
    "cost_per_install": "Cost per Install",
    "app_event_completions": "App Event Completions",
    "cost_per_event": "Cost per Event",
    "event_rate": "Event Rate",
    "profile_visits": "Profile Visits",
    "instagram_profile_visits": "Instagram Profile Visits",
    "cost_per_profile_visit": "Cost per Profile Visit",
}

class PerformanceGoalEngine:
    """
    Central service mapping and validating campaign objectives, goals, and metric structures.
    """

    @classmethod
    def get_metric_profile(
        cls, 
        objective: str, 
        goal: Optional[str] = None, 
        outcome: Optional[str] = None,
        available_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Dynamically yields the metric profile and priorities (PRIMARY, SUPPORTING, DIAGNOSTIC, GUARDRAIL)
        for the given objective + goal + outcome settings.
        """
        obj_clean = (objective or "sales").lower()
        
        # Standardize objective names
        if "sales" in obj_clean or "outcome_sales" in obj_clean:
            obj_group = "sales"
            default_outcome = "website_purchases"
        elif "leads" in obj_clean or "outcome_leads" in obj_clean:
            obj_group = "leads"
            default_outcome = "website_leads"
        elif "engagement" in obj_clean or "outcome_engagement" in obj_clean:
            obj_group = "engagement"
            default_outcome = "post_engagement"
        elif "messaging" in obj_clean:
            obj_group = "messaging"
            default_outcome = "messenger"
        elif "traffic" in obj_clean:
            obj_group = "traffic"
            default_outcome = "website"
        elif "awareness" in obj_clean:
            obj_group = "awareness"
            default_outcome = "reach"
        elif "app" in obj_clean or "app_promotion" in obj_clean:
            obj_group = "app_promotion"
            default_outcome = "app_installs"
        else:
            obj_group = "sales"
            default_outcome = "website_purchases"

        # Resolve selected outcome structure
        outcome_clean = outcome
        if not outcome_clean and goal:
            g_lower = goal.lower()
            if g_lower in GOAL_MAP.get(obj_group, {}):
                outcome_clean = g_lower
            else:
                for key in GOAL_MAP.get(obj_group, {}).keys():
                    if g_lower in key or key in g_lower:
                        outcome_clean = key
                        break
                if not outcome_clean:
                    if "conversation" in g_lower or "messaging" in g_lower or "chat" in g_lower:
                        outcome_clean = "messenger"
                        obj_group = "messaging"
                    elif "lead" in g_lower:
                        outcome_clean = "website_leads"
                        obj_group = "leads"
                    elif "purchase" in g_lower or "sale" in g_lower:
                        outcome_clean = "website_purchases"
                        obj_group = "sales"
                    elif "call" in g_lower:
                        if obj_group == "leads":
                            outcome_clean = "calls_lead"
                        else:
                            outcome_clean = "calls"
                            obj_group = "engagement"
        outcome_clean = (outcome_clean or default_outcome).lower()
        
        # Load profile configurations
        profile = GOAL_MAP.get(obj_group, {}).get(outcome_clean)
        if not profile:
            # Fallback to first available outcome under objective group
            first_key = list(GOAL_MAP.get(obj_group, {}).keys())[0]
            profile = GOAL_MAP[obj_group][first_key]
            outcome_clean = first_key

        # Calculate dynamic availability statuses (AVAILABLE, CRM_REQUIRED, UNAVAILABLE, etc.)
        fields = set(available_fields or CORE_51_FIELDS)
        crm_metrics = GOAL_MAP.get(obj_group, {}).get(outcome_clean, {}).get("crm_metrics", [])
        
        metric_statuses = {}
        for category in ["primary", "supporting", "diagnostic", "guardrail"]:
            for metric in profile.get(category, []):
                if metric in crm_metrics:
                    metric_statuses[metric] = "CRM_REQUIRED"
                elif metric in fields or metric.endswith("_trend") or metric in ["conversations", "calls", "cost_per_conversation", "cost_per_call", "conversation_rate", "call_rate", "average_watch_time", "video_retention", "hook_rate", "video_hold_rate", "retention_curve", "brand_recall", "traffic_quality", "creative_fatigue", "audience_saturation", "creative_performance"]:
                    # Calculated / derived mock metrics or trend formats
                    if metric in ["brand_recall", "instagram_profile_visits", "profile_visits"]:
                        metric_statuses[metric] = "UNAVAILABLE"
                    else:
                        metric_statuses[metric] = "AVAILABLE"
                else:
                    metric_statuses[metric] = "NOT_APPLICABLE"

        # Explicitly ensure CRM metrics are registered in metric_statuses
        for metric in crm_metrics:
            metric_statuses[metric] = "CRM_REQUIRED"
        
        # Explicitly add lead_to_customer_rate to CRM required list
        metric_statuses["lead_to_customer_rate"] = "CRM_REQUIRED"

        return {
            "objective": obj_group,
            "outcome": outcome_clean,
            "primary": profile["primary"],
            "supporting": profile["supporting"],
            "diagnostic": profile["diagnostic"],
            "guardrail": profile["guardrail"],
            "funnel": profile["funnel"],
            "metric_statuses": metric_statuses,
        }
