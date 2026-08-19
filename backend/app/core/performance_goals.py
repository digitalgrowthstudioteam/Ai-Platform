"""
Digital Growth Studio — Performance Goals Registry (Phase 2 & Phase 5)

Master taxonomy configuration registry for all Meta Performance Goals.
Ensures we do not hardcode goal behaviors throughout the application.
"""
from typing import Dict, Any, List

# Define all Performance Goal Profiles
PERFORMANCE_GOAL_REGISTRY: Dict[str, Dict[str, Any]] = {
    # ──────────────────────────────────────────────
    # GROUP 1: Core Performance Goals
    # ──────────────────────────────────────────────
    "reach": {
        "id": "reach",
        "name": "Maximise reach of ads",
        "campaign_objective": ["awareness", "traffic"],
        "motive": "awareness",
        "description": "Show your ads to the maximum number of unique people.",
        "optimization_event": "REACH",
        "conversion_location": "none",
        "primary_metrics": ["reach", "frequency", "cpm"],
        "secondary_metrics": ["impressions", "spend"],
        "diagnostic_metrics": ["clicks", "ctr"],
        "business_metrics": [],
        "invalid_metrics": ["cpl", "cpa", "roas", "purchases", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "reach"],
        "optional_data": [],
        "formula_ids": ["cpm", "frequency"],
        "health_score_profile": {
            "reach_efficiency": 0.40,
            "cpm_stability": 0.30,
            "frequency_control": 0.20,
            "trend": 0.10
        },
        "ai_profile": "brand_awareness",
        "status": "active"
    },
    "impressions": {
        "id": "impressions",
        "name": "Maximise number of impressions",
        "campaign_objective": ["awareness", "traffic"],
        "motive": "awareness",
        "description": "Deliver your ads to people as many times as possible.",
        "optimization_event": "IMPRESSIONS",
        "conversion_location": "none",
        "primary_metrics": ["impressions", "cpm", "frequency"],
        "secondary_metrics": ["reach", "spend"],
        "diagnostic_metrics": ["clicks", "ctr"],
        "business_metrics": [],
        "invalid_metrics": ["cpl", "cpa", "roas", "purchases", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions"],
        "optional_data": ["reach"],
        "formula_ids": ["cpm", "frequency"],
        "health_score_profile": {
            "cpm_stability": 0.40,
            "impression_volume": 0.30,
            "frequency_control": 0.20,
            "trend": 0.10
        },
        "ai_profile": "brand_awareness",
        "status": "active"
    },
    "link_clicks": {
        "id": "link_clicks",
        "name": "Maximise number of link clicks",
        "campaign_objective": ["traffic", "engagement", "leads"],
        "motive": "traffic",
        "description": "Direct people to your website, app, or shop links.",
        "optimization_event": "LINK_CLICKS",
        "conversion_location": "website",
        "primary_metrics": ["link_clicks", "cpc", "link_ctr"],
        "secondary_metrics": ["spend", "impressions", "cpm"],
        "diagnostic_metrics": ["clicks", "ctr", "frequency"],
        "business_metrics": ["leads", "purchases", "revenue"],
        "invalid_metrics": ["calls", "conversations"],
        "required_data": ["spend", "impressions", "link_clicks"],
        "optional_data": ["leads", "purchases", "revenue"],
        "formula_ids": ["cpc", "link_ctr", "cpm"],
        "health_score_profile": {
            "cpc_efficiency": 0.35,
            "click_volume": 0.25,
            "ctr_quality": 0.20,
            "trend": 0.10,
            "cpm_stability": 0.10
        },
        "ai_profile": "traffic_efficiency",
        "status": "active"
    },
    "landing_page_views": {
        "id": "landing_page_views",
        "name": "Maximise landing page views",
        "campaign_objective": ["traffic", "leads", "sales"],
        "motive": "traffic",
        "description": "Show ads to people most likely to load your landing page.",
        "optimization_event": "LANDING_PAGE_VIEWS",
        "conversion_location": "website",
        "primary_metrics": ["landing_page_views", "cost_per_lpv", "lpv_rate"],
        "secondary_metrics": ["link_clicks", "cpc", "spend", "impressions"],
        "diagnostic_metrics": ["link_ctr", "ctr", "cpm", "frequency"],
        "business_metrics": ["leads", "purchases", "revenue", "roas"],
        "invalid_metrics": ["calls", "conversations"],
        "required_data": ["spend", "impressions", "landing_page_views"],
        "optional_data": ["link_clicks", "leads", "purchases", "revenue", "roas"],
        "formula_ids": ["cost_per_lpv", "lpv_rate", "cpc", "cpm"],
        "health_score_profile": {
            "lpv_cost": 0.35,
            "lpv_volume": 0.25,
            "lpv_conversion_rate": 0.20,
            "trend": 0.10,
            "cpc_stability": 0.10
        },
        "ai_profile": "traffic_quality",
        "status": "active"
    },
    "leads": {
        "id": "leads",
        "name": "Maximise number of leads",
        "campaign_objective": ["leads"],
        "motive": "leads",
        "description": "Get people to share contact details via instant forms or website.",
        "optimization_event": "LEAD",
        "conversion_location": "website_or_form",
        "primary_metrics": ["leads", "cpl", "lead_rate"],
        "secondary_metrics": ["spend", "impressions", "reach", "cpm"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc", "landing_page_views"],
        "business_metrics": ["qualified_leads", "sales", "revenue", "roas"],
        "invalid_metrics": ["calls", "conversations"],
        "required_data": ["spend", "impressions", "leads"],
        "optional_data": ["qualified_leads", "sales", "revenue", "roas"],
        "formula_ids": ["cpl", "lead_rate", "cpc", "cpm"],
        "health_score_profile": {
            "cpl_efficiency": 0.35,
            "lead_volume": 0.25,
            "lead_rate": 0.20,
            "trend": 0.10,
            "cpm_stability": 0.10
        },
        "ai_profile": "leads_optimization",
        "status": "active"
    },
    "calls": {
        "id": "calls",
        "name": "Maximise number of calls",
        "campaign_objective": ["leads", "traffic", "engagement", "sales"],
        "motive": "leads",
        "description": "Prompt people most likely to call your business phone number.",
        "optimization_event": "CALL",
        "conversion_location": "phone",
        "primary_metrics": ["calls", "cost_per_call", "call_rate"],
        "secondary_metrics": ["reach", "impressions", "frequency", "cpm", "spend"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": ["qualified_calls", "sales", "revenue", "roas"],
        "invalid_metrics": ["cpl", "leads", "conversations"],
        "required_data": ["spend", "impressions", "calls"],
        "optional_data": ["qualified_calls", "sales", "revenue", "roas"],
        "formula_ids": ["cost_per_call", "call_rate", "cpm"],
        "health_score_profile": {
            "cost_per_call": 0.35,
            "call_volume": 0.25,
            "call_rate": 0.15,
            "trend": 0.10,
            "cpm_stability": 0.10,
            "frequency_control": 0.05
        },
        "ai_profile": "calls_optimization",
        "status": "active"
    },
    "conversations": {
        "id": "conversations",
        "name": "Maximise number of messaging conversations",
        "campaign_objective": ["engagement", "leads", "traffic"],
        "motive": "conversations",
        "description": "Start messaging chats with prospects on Messenger, WhatsApp, or Instagram.",
        "optimization_event": "CONVERSATION",
        "conversion_location": "messaging",
        "primary_metrics": ["conversations", "cost_per_conversation", "conversation_rate"],
        "secondary_metrics": ["reach", "impressions", "cpm", "spend"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": ["messaging_leads", "sales", "revenue", "roas"],
        "invalid_metrics": ["cpl", "leads", "calls"],
        "required_data": ["spend", "impressions", "conversations"],
        "optional_data": ["messaging_leads", "sales", "revenue", "roas"],
        "formula_ids": ["cost_per_conversation", "conversation_rate", "cpm"],
        "health_score_profile": {
            "cost_per_conversation": 0.35,
            "conversation_volume": 0.25,
            "conversation_rate": 0.15,
            "trend": 0.10,
            "cpm_stability": 0.10,
            "frequency_control": 0.05
        },
        "ai_profile": "conversations_optimization",
        "status": "active"
    },
    "video_views": {
        "id": "video_views",
        "name": "Maximise video views",
        "campaign_objective": ["awareness", "engagement"],
        "motive": "awareness",
        "description": "Deliver video ads to get the longest watch times.",
        "optimization_event": "VIDEO_VIEW",
        "conversion_location": "none",
        "primary_metrics": ["video_views", "cost_per_video_view", "thruplays", "cost_per_thruplay"],
        "secondary_metrics": ["impressions", "reach", "cpm", "spend"],
        "diagnostic_metrics": ["video_play_25", "video_play_50", "video_play_75", "video_play_95", "video_play_100", "avg_watch_time"],
        "business_metrics": [],
        "invalid_metrics": ["cpl", "roas", "purchases", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "video_views", "thruplays"],
        "optional_data": ["video_play_25", "video_play_50", "video_play_75", "video_play_95", "video_play_100", "avg_watch_time"],
        "formula_ids": ["cost_per_video_view", "cost_per_thruplay", "thruplay_rate", "cpm"],
        "health_score_profile": {
            "cost_per_thruplay": 0.30,
            "thruplay_volume": 0.25,
            "watch_time_quality": 0.20,
            "cpm_stability": 0.15,
            "trend": 0.10
        },
        "ai_profile": "video_quality",
        "status": "active"
    },
    "conversions": {
        "id": "conversions",
        "name": "Maximise website conversions",
        "campaign_objective": ["sales", "leads"],
        "motive": "sales",
        "description": "Drive specific actions on your website (e.g., registrations, checkouts).",
        "optimization_event": "CONVERSION",
        "conversion_location": "website",
        "primary_metrics": ["conversions", "cost_per_conversion", "conversion_rate"],
        "secondary_metrics": ["spend", "impressions", "cpm"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc", "landing_page_views"],
        "business_metrics": ["purchases", "revenue", "roas"],
        "invalid_metrics": ["calls", "conversations"],
        "required_data": ["spend", "impressions", "conversions"],
        "optional_data": ["purchases", "revenue", "roas"],
        "formula_ids": ["cost_per_conversion", "conversion_rate", "cpc", "cpm"],
        "health_score_profile": {
            "cost_per_conversion": 0.35,
            "conversion_volume": 0.25,
            "conversion_rate": 0.20,
            "trend": 0.10,
            "cpm_stability": 0.10
        },
        "ai_profile": "conversions_optimization",
        "status": "active"
    },
    "purchases": {
        "id": "purchases",
        "name": "Maximise number of purchases",
        "campaign_objective": ["sales"],
        "motive": "sales",
        "description": "Show ads to people most likely to buy your products or services.",
        "optimization_event": "PURCHASE",
        "conversion_location": "website_or_shop",
        "primary_metrics": ["purchases", "cpa", "purchase_cvr", "roas"],
        "secondary_metrics": ["spend", "impressions", "cpm"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc", "landing_page_views", "add_to_cart", "initiate_checkout"],
        "business_metrics": ["revenue"],
        "invalid_metrics": ["cpl", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "purchases", "revenue"],
        "optional_data": ["add_to_cart", "initiate_checkout"],
        "formula_ids": ["cpa", "purchase_cvr", "roas", "cpc", "cpm"],
        "health_score_profile": {
            "roas": 0.35,
            "purchase_volume": 0.25,
            "cpa": 0.15,
            "purchase_cvr": 0.10,
            "trend": 0.10,
            "cpm_stability": 0.05
        },
        "ai_profile": "sales_optimization",
        "status": "active"
    },
    "value": {
        "id": "value",
        "name": "Maximise purchase value / ROAS",
        "campaign_objective": ["sales"],
        "motive": "sales",
        "description": "Deliver ads to get higher purchase baskets (maximizing Return on Ad Spend).",
        "optimization_event": "VALUE",
        "conversion_location": "website_or_shop",
        "primary_metrics": ["roas", "revenue", "purchases", "cpa"],
        "secondary_metrics": ["spend", "impressions", "cpm"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc", "add_to_cart"],
        "business_metrics": [],
        "invalid_metrics": ["cpl", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "purchases", "revenue"],
        "optional_data": ["add_to_cart"],
        "formula_ids": ["roas", "cpa", "cpc", "cpm"],
        "health_score_profile": {
            "roas": 0.40,
            "revenue": 0.20,
            "purchases": 0.15,
            "cpa": 0.10,
            "trend": 0.10,
            "cpm_stability": 0.05
        },
        "ai_profile": "sales_optimization",
        "status": "active"
    },

    # ──────────────────────────────────────────────
    # GROUP 2: Lead/Business Performance Goals
    # ──────────────────────────────────────────────
    "qualified_leads": {
        "id": "qualified_leads",
        "name": "Maximise qualified leads",
        "campaign_objective": ["leads"],
        "motive": "leads",
        "description": "Optimize for leads classified as qualified by your downstream CRM sales data.",
        "optimization_event": "QUALIFIED_LEAD",
        "conversion_location": "crm",
        "primary_metrics": ["qualified_leads", "cost_per_qualified_lead", "qualification_rate"],
        "secondary_metrics": ["leads", "cpl", "spend", "impressions", "cpm"],
        "diagnostic_metrics": ["ctr", "cpc", "landing_page_views"],
        "business_metrics": ["sales", "revenue", "roas"],
        "invalid_metrics": ["cost_per_call", "video_play_100"],
        "required_data": ["spend", "impressions", "leads", "qualified_leads"],
        "optional_data": ["sales", "revenue", "roas"],
        "formula_ids": ["cost_per_qualified_lead", "qualification_rate", "cpl", "cpm"],
        "health_score_profile": {
            "cost_per_qualified_lead": 0.35,
            "qualified_lead_volume": 0.25,
            "qualification_rate": 0.20,
            "trend": 0.10,
            "cpl_efficiency": 0.10
        },
        "ai_profile": "crm_leads",
        "status": "active"
    },
    "messaging_leads": {
        "id": "messaging_leads",
        "name": "Maximise messaging leads",
        "campaign_objective": ["leads", "engagement"],
        "motive": "conversations",
        "description": "Drive messaging prospects to complete a qualification lead form in chat.",
        "optimization_event": "MESSAGING_LEAD",
        "conversion_location": "messaging",
        "primary_metrics": ["messaging_leads", "cost_per_messaging_lead", "conversations"],
        "secondary_metrics": ["spend", "impressions", "cpm"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": ["sales", "revenue", "roas"],
        "invalid_metrics": ["cpl", "leads", "calls"],
        "required_data": ["spend", "impressions", "conversations", "messaging_leads"],
        "optional_data": ["sales", "revenue", "roas"],
        "formula_ids": ["cost_per_messaging_lead", "cpm", "cpc"],
        "health_score_profile": {
            "cost_per_messaging_lead": 0.35,
            "messaging_lead_volume": 0.25,
            "conversation_volume": 0.20,
            "trend": 0.10,
            "cpm_stability": 0.10
        },
        "ai_profile": "conversations_optimization",
        "status": "active"
    },
    "messaging_purchases": {
        "id": "messaging_purchases",
        "name": "Maximise messaging purchases",
        "campaign_objective": ["sales", "engagement"],
        "motive": "conversations",
        "description": "Drive messaging prospects to make a direct purchase inside chat.",
        "optimization_event": "MESSAGING_PURCHASE",
        "conversion_location": "messaging",
        "primary_metrics": ["messaging_purchases", "cost_per_messaging_purchase", "conversations"],
        "secondary_metrics": ["spend", "impressions", "cpm"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": ["revenue", "roas"],
        "invalid_metrics": ["cpl", "leads", "calls"],
        "required_data": ["spend", "impressions", "conversations", "messaging_purchases"],
        "optional_data": ["revenue", "roas"],
        "formula_ids": ["cost_per_messaging_purchase", "cpm", "cpc"],
        "health_score_profile": {
            "cost_per_messaging_purchase": 0.35,
            "messaging_purchase_volume": 0.25,
            "conversation_volume": 0.20,
            "trend": 0.10,
            "cpm_stability": 0.10
        },
        "ai_profile": "conversations_optimization",
        "status": "active"
    },
    "event_responses": {
        "id": "event_responses",
        "name": "Maximise event responses",
        "campaign_objective": ["engagement"],
        "motive": "engagement",
        "description": "Show ads to get event registrations or responses on Facebook Events.",
        "optimization_event": "EVENT_RESPONSE",
        "conversion_location": "facebook",
        "primary_metrics": ["event_responses", "cost_per_event_response", "event_response_rate"],
        "secondary_metrics": ["spend", "impressions", "reach", "cpm"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": [],
        "invalid_metrics": ["cpl", "cpa", "roas", "purchases", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "event_responses"],
        "optional_data": [],
        "formula_ids": ["cost_per_event_response", "event_response_rate", "cpm"],
        "health_score_profile": {
            "cost_per_event_response": 0.40,
            "response_volume": 0.30,
            "cpm_stability": 0.20,
            "trend": 0.10
        },
        "ai_profile": "engagement_optimization",
        "status": "active"
    },
    "app_installs": {
        "id": "app_installs",
        "name": "Maximise app installs",
        "campaign_objective": ["app_promotion"],
        "motive": "app",
        "description": "Show ads to people most likely to download your mobile app.",
        "optimization_event": "APP_INSTALL",
        "conversion_location": "app",
        "primary_metrics": ["app_installs", "cost_per_app_install", "app_install_rate"],
        "secondary_metrics": ["spend", "impressions", "cpm"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": ["app_events", "purchases", "revenue", "roas"],
        "invalid_metrics": ["cpl", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "app_installs"],
        "optional_data": ["app_events", "purchases", "revenue", "roas"],
        "formula_ids": ["cost_per_app_install", "app_install_rate", "cpc", "cpm"],
        "health_score_profile": {
            "cost_per_app_install": 0.35,
            "install_volume": 0.25,
            "install_rate": 0.20,
            "trend": 0.10,
            "cpm_stability": 0.10
        },
        "ai_profile": "app_growth",
        "status": "active"
    },
    "app_events": {
        "id": "app_events",
        "name": "Maximise specific app events",
        "campaign_objective": ["app_promotion"],
        "motive": "app",
        "description": "Deliver ads to get specific actions inside your mobile app (e.g. log in, trial).",
        "optimization_event": "APP_EVENT",
        "conversion_location": "app",
        "primary_metrics": ["app_events", "cost_per_app_event", "app_event_rate"],
        "secondary_metrics": ["app_installs", "cost_per_app_install", "spend", "impressions", "cpm"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": ["purchases", "revenue", "roas"],
        "invalid_metrics": ["cpl", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "app_events"],
        "optional_data": ["app_installs", "purchases", "revenue", "roas"],
        "formula_ids": ["cost_per_app_event", "app_event_rate", "cpc", "cpm"],
        "health_score_profile": {
            "cost_per_app_event": 0.35,
            "event_volume": 0.25,
            "event_rate": 0.20,
            "trend": 0.10,
            "cpm_stability": 0.10
        },
        "ai_profile": "app_growth",
        "status": "active"
    },

    # ──────────────────────────────────────────────
    # GROUP 3: Engagement/Awareness Performance Goals
    # ──────────────────────────────────────────────
    "post_engagement": {
        "id": "post_engagement",
        "name": "Maximise post engagement",
        "campaign_objective": ["engagement"],
        "motive": "engagement",
        "description": "Get comments, shares, likes, and photo clicks on your page post.",
        "optimization_event": "POST_ENGAGEMENT",
        "conversion_location": "facebook",
        "primary_metrics": ["post_engagement", "cost_per_post_engagement", "post_engagement_rate"],
        "secondary_metrics": ["reach", "impressions", "cpm", "spend"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": [],
        "invalid_metrics": ["cpl", "cpa", "roas", "purchases", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "post_engagement"],
        "optional_data": [],
        "formula_ids": ["cost_per_post_engagement", "post_engagement_rate", "cpm"],
        "health_score_profile": {
            "cost_per_post_engagement": 0.35,
            "engagement_volume": 0.25,
            "engagement_rate": 0.20,
            "cpm_stability": 0.10,
            "trend": 0.10
        },
        "ai_profile": "engagement_optimization",
        "status": "active"
    },
    "page_likes": {
        "id": "page_likes",
        "name": "Maximise page likes",
        "campaign_objective": ["engagement"],
        "motive": "engagement",
        "description": "Direct people most likely to like/follow your Facebook Business Page.",
        "optimization_event": "PAGE_LIKE",
        "conversion_location": "facebook",
        "primary_metrics": ["page_likes", "cost_per_page_like", "page_like_rate"],
        "secondary_metrics": ["reach", "impressions", "cpm", "spend"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": [],
        "invalid_metrics": ["cpl", "cpa", "roas", "purchases", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "page_likes"],
        "optional_data": [],
        "formula_ids": ["cost_per_page_like", "page_like_rate", "cpm"],
        "health_score_profile": {
            "cost_per_page_like": 0.40,
            "like_volume": 0.30,
            "cpm_stability": 0.20,
            "trend": 0.10
        },
        "ai_profile": "engagement_optimization",
        "status": "active"
    },
    "profile_visits": {
        "id": "profile_visits",
        "name": "Maximise Instagram profile visits",
        "campaign_objective": ["traffic", "engagement"],
        "motive": "engagement",
        "description": "Drive people to visit your Instagram profile page.",
        "optimization_event": "PROFILE_VISIT",
        "conversion_location": "instagram",
        "primary_metrics": ["profile_visits", "cost_per_profile_visit", "profile_visit_rate"],
        "secondary_metrics": ["reach", "impressions", "cpm", "spend"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": [],
        "invalid_metrics": ["cpl", "cpa", "roas", "purchases", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "profile_visits"],
        "optional_data": [],
        "formula_ids": ["cost_per_profile_visit", "profile_visit_rate", "cpm"],
        "health_score_profile": {
            "cost_per_profile_visit": 0.35,
            "visit_volume": 0.25,
            "visit_rate": 0.20,
            "cpm_stability": 0.10,
            "trend": 0.10
        },
        "ai_profile": "engagement_optimization",
        "status": "active"
    },
    "reminders": {
        "id": "reminders",
        "name": "Maximise reminders set",
        "campaign_objective": ["engagement"],
        "motive": "engagement",
        "description": "Encourage people to set reminders for your event, launch, or broadcast.",
        "optimization_event": "REMINDER",
        "conversion_location": "facebook",
        "primary_metrics": ["reminders", "cost_per_reminder", "reminder_rate"],
        "secondary_metrics": ["reach", "impressions", "cpm", "spend"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": [],
        "invalid_metrics": ["cpl", "cpa", "roas", "purchases", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "reminders"],
        "optional_data": [],
        "formula_ids": ["cost_per_reminder", "reminder_rate", "cpm"],
        "health_score_profile": {
            "cost_per_reminder": 0.40,
            "reminder_volume": 0.30,
            "cpm_stability": 0.20,
            "trend": 0.10
        },
        "ai_profile": "engagement_optimization",
        "status": "active"
    },
    "brand_awareness": {
        "id": "brand_awareness",
        "name": "Maximise ad recall lift",
        "campaign_objective": ["awareness"],
        "motive": "awareness",
        "description": "Show ads to people most likely to remember them if asked.",
        "optimization_event": "AD_RECALL_LIFT",
        "conversion_location": "none",
        "primary_metrics": ["ad_recall_lift", "cost_per_ad_recall_lift", "ad_recall_rate"],
        "secondary_metrics": ["reach", "impressions", "cpm", "spend"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": [],
        "invalid_metrics": ["cpl", "cpa", "roas", "purchases", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "ad_recall_lift"],
        "optional_data": ["reach"],
        "formula_ids": ["cost_per_ad_recall_lift", "ad_recall_rate", "cpm"],
        "health_score_profile": {
            "cost_per_ad_recall_lift": 0.40,
            "lift_volume": 0.30,
            "cpm_stability": 0.20,
            "trend": 0.10
        },
        "ai_profile": "brand_awareness",
        "status": "active"
    },
    "thruplay": {
        "id": "thruplay",
        "name": "Maximise ThruPlays",
        "campaign_objective": ["awareness", "engagement"],
        "motive": "awareness",
        "description": "Show video ads to get ThruPlays (video plays of 15 seconds or more).",
        "optimization_event": "THRUPLAY",
        "conversion_location": "none",
        "primary_metrics": ["thruplays", "cost_per_thruplay", "thruplay_rate"],
        "secondary_metrics": ["video_views", "impressions", "reach", "cpm", "spend"],
        "diagnostic_metrics": ["video_play_25", "video_play_50", "video_play_75", "video_play_95", "video_play_100", "avg_watch_time"],
        "business_metrics": [],
        "invalid_metrics": ["cpl", "roas", "purchases", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "thruplays"],
        "optional_data": ["video_play_25", "video_play_50", "video_play_75", "video_play_100", "avg_watch_time"],
        "formula_ids": ["cost_per_thruplay", "thruplay_rate", "cpm"],
        "health_score_profile": {
            "cost_per_thruplay": 0.35,
            "thruplay_volume": 0.25,
            "thruplay_rate": 0.20,
            "cpm_stability": 0.10,
            "trend": 0.10
        },
        "ai_profile": "video_quality",
        "status": "active"
    },
    "two_sec_video_views": {
        "id": "two_sec_video_views",
        "name": "Maximise 2-second video views",
        "campaign_objective": ["awareness", "engagement"],
        "motive": "awareness",
        "description": "Show video ads to get continuous video plays of 2 seconds or more.",
        "optimization_event": "TWO_SEC_VIDEO_VIEW",
        "conversion_location": "none",
        "primary_metrics": ["video_play_2", "cost_per_two_sec_view", "two_sec_view_rate"],
        "secondary_metrics": ["video_views", "impressions", "reach", "cpm", "spend"],
        "diagnostic_metrics": ["video_play_25", "video_play_50", "video_play_75", "video_play_95", "video_play_100", "avg_watch_time"],
        "business_metrics": [],
        "invalid_metrics": ["cpl", "roas", "purchases", "leads", "calls", "conversations"],
        "required_data": ["spend", "impressions", "video_play_2"],
        "optional_data": ["video_play_25", "video_play_50", "video_play_75", "video_play_100", "avg_watch_time"],
        "formula_ids": ["cost_per_two_sec_view", "two_sec_view_rate", "cpm"],
        "health_score_profile": {
            "cost_per_two_sec_view": 0.35,
            "view_volume": 0.25,
            "view_rate": 0.20,
            "cpm_stability": 0.10,
            "trend": 0.10
        },
        "ai_profile": "video_quality",
        "status": "active"
    }
}


def get_goal_profile(goal_id: str) -> Dict[str, Any]:
    """
    Lookup a Performance Goal Profile from the registry.
    Falls back to a default profile if the goal_id is unknown, allowing 
    all 51+ Meta Performance Goals to map dynamically.
    """
    if goal_id in PERFORMANCE_GOAL_REGISTRY:
        return PERFORMANCE_GOAL_REGISTRY[goal_id]

    # Fallback default profile mapping dynamically to avoid breaking
    return {
        "id": goal_id,
        "name": f"Performance Goal: {goal_id.replace('_', ' ').title()}",
        "campaign_objective": ["traffic", "sales", "leads", "engagement"],
        "motive": "website",
        "description": "Meta native optimization goal.",
        "optimization_event": goal_id.upper(),
        "conversion_location": "website",
        "primary_metrics": ["conversions", "cost_per_conversion"],
        "secondary_metrics": ["spend", "impressions", "cpm"],
        "diagnostic_metrics": ["link_clicks", "ctr", "cpc"],
        "business_metrics": [],
        "invalid_metrics": [],
        "required_data": ["spend", "impressions"],
        "optional_data": [],
        "formula_ids": ["cost_per_conversion", "cpm"],
        "health_score_profile": {
            "cost_per_conversion": 0.40,
            "conversion_volume": 0.30,
            "cpm_stability": 0.20,
            "trend": 0.10
        },
        "ai_profile": "conversions_optimization",
        "status": "active"
    }
