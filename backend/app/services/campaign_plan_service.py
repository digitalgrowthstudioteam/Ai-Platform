"""
Digital Growth Studio — Campaign Plan Generation Service
"""
import json
import structlog
import httpx
from datetime import datetime, timezone
from typing import Dict, Any

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

class CampaignPlanService:
    """
    Analyzes user answers and generates a dynamic, structured campaign plan
    and readiness score using Gemini, with a robust local fallback.
    """

    @classmethod
    async def generate_plan(cls, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entrypoint to generate the campaign plan.
        """
        logger.info("Generating campaign plan", business_name=profile.get("business_name"))
        
        # 1. Build prompt context
        user_info_str = json.dumps(profile, indent=2)
        system_prompt = """You are the Digital Growth Studio Campaign Architect.
Based on the user's business profile and questionnaire responses, generate a highly personalized, structured, and realistic Meta Ads Campaign Plan.
Never promise specific ROAS, sales numbers, or guarantees. Avoid fabricated benchmarks.
Return a valid JSON object matching the schema below:
{
  "business_summary": "Detailed summary of the user's business, current offers, and campaign goals.",
  "recommended_objective": "Recommended Meta campaign objective (e.g., Sales, Leads, Engagement).",
  "objective_reasoning": "Why this objective is appropriate based on their budget and business size.",
  "recommended_structure": "Recommended campaign/ad-set structure (e.g. 1 Campaign, 2 Ad Sets: Broad vs Interest, 3 Creative Ads).",
  "audience_strategy": {
    "primary_audience": "Primary audience target group details.",
    "secondary_audience": "Secondary audience target group details.",
    "targeting_details": "Detailed locations, age, gender, and interests.",
    "reasoning": "Reasoning for choosing this target audience."
  },
  "budget_strategy": {
    "daily_budget": "Suggested daily budget.",
    "monthly_budget": "Suggested monthly budget.",
    "allocation": "How to distribute the budget (e.g. 70% testing, 30% remarketing).",
    "scaling": "Conditions and triggers for scaling the budget."
  },
  "creative_strategy": "Recommended ad formats (video vs image) and messaging themes.",
  "sample_concepts": [
    {"format": "Video/Reel", "concept": "Product demonstration showing immediate benefits", "angle": "Problem-solver"},
    {"format": "Single Image", "concept": "Clean product photo with discount code overlay", "angle": "Direct Offer"}
  ],
  "sample_copy": [
    {"headline": "Immediate Solution Headline", "primary_text": "Personalized primary text demonstrating value and call-to-action."}
  ],
  "tracking_requirements": ["Required tracking setup items (e.g. Pixel, Conversions API, UTMs)."],
  "testing_strategy": "Core aspects to test first (e.g. creatives, locations, hooks).",
  "priority_actions": ["Priority action 1", "Priority action 2", "Priority action 3"],
  "readiness_score": 75,
  "readiness_breakdown": {
    "ready": ["Aspects that are ready for launch"],
    "attention_needed": ["Aspects that need verification/tweak"],
    "priority_before_launch": ["Critical elements that must be fixed before spending money"]
  }
}
"""

        # 2. Try calling Gemini
        api_key = settings.resolved_api_key
        model_name = settings.GEMINI_MODEL
        if api_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"Here is the user's business profile:\n{user_info_str}\n\nPlease generate the campaign plan."}]
                    }
                ],
                "systemInstruction": {
                    "parts": [{"text": system_prompt}]
                },
                "generationConfig": {
                    "temperature": 0.2,
                    "responseMimeType": "application/json",
                    "maxOutputTokens": 1500
                }
            }
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed_plan = json.loads(text)
                        logger.info("Successfully generated plan via Gemini")
                        return parsed_plan
                    else:
                        logger.error("Gemini API call failed for campaign plan", status=resp.status_code, body=resp.text)
            except Exception as e:
                logger.error("Gemini call exception", error=str(e))

        # 3. Fallback to local rule-based reasoning engine
        logger.info("Falling back to local campaign plan generator")
        return cls._generate_local_fallback(profile)

    @classmethod
    def _generate_local_fallback(cls, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates a premium, highly realistic, custom plan based on industry and goals.
        """
        biz_name = profile.get("business_name", "your brand")
        industry = profile.get("industry", "Ecommerce")
        objective = profile.get("campaign_objective", "Website Sales")
        target_customer = profile.get("target_customer", "general audience")
        location = profile.get("target_location", "India")
        offer = profile.get("offer", "promotional discount")
        budget = profile.get("budget", "₹500–₹1,000/day")
        challenge = profile.get("main_challenge", "driving consistent conversions")

        # Basic industry customization
        is_retail = industry in ["Ecommerce", "Fashion & Apparel", "Beauty & Personal Care", "Food & Restaurants"]
        is_leadgen = industry in ["Real Estate", "Professional Services", "Finance", "Healthcare", "Education", "B2B"]
        
        # Determine recommended objective
        if is_retail:
            rec_objective = "Sales"
            obj_reason = "Retail businesses scale best using Meta's conversion algorithm optimized for Purchase events, directly syncing catalog items."
            tracking = ["Meta Pixel integration", "Purchase event optimization", "Conversions API (CAPI) for tracking fallback", "UTM parameter tagging"]
            creative_theme = "Dynamic Product Ads (DPA), high-contrast product reels, and clean lifestyle showcase graphics."
            concepts = [
                {"format": "Carousel (Catalog)", "concept": f"Dynamic product cards showing trending inventory with '{offer}' pricing.", "angle": "Intent Showcase"},
                {"format": "Reels Video", "concept": f"Unboxing / lifestyle demonstration showing exactly why customers buy {biz_name}.", "angle": "User Social Proof"}
            ]
            copy_headline = f"Get Your Favorites Today | {offer}"
            copy_text = f"Stop searching! {biz_name} brings you the premium selection with special value. Shop directly online now. Limited time offer."
        elif is_leadgen:
            rec_objective = "Leads"
            obj_reason = f"For {industry}, lead generation forms (either native on Meta or on website) ensure you capture contact details directly from high-intent prospects."
            tracking = ["Lead Event optimization", "CRM/Zapier automation", "Page view and Form submission tags", "Meta Conversions API"]
            creative_theme = "Educational hooks, client testimonials, service walk-throughs, and simple informational banners."
            concepts = [
                {"format": "Single Image", "concept": f"High-contrast graphic highlighting your service and the '{offer}' value hook.", "angle": "Expert Authority"},
                {"format": "Lead Form Video", "concept": f"Quick 15-second intro addressing the problem: '{challenge}', and offering the solution.", "angle": "Value First"}
            ]
            copy_headline = f"Get Your Free Consultation / Quote Today"
            copy_text = f"Tackling {challenge}? Let the experts handle it. Register below to claim your personalized {offer} and speak with our team."
        else:
            rec_objective = "Engagement"
            obj_reason = "Great for local reach, building initial brand awareness, and driving direct WhatsApp enquiries at a lower entry spend."
            tracking = ["WhatsApp conversion event", "Click-to-chat messaging setup", "Pixel PageView", "Custom conversion tagging"]
            creative_theme = "Direct invitation, high-quality images of the local setup, and direct message CTAs."
            concepts = [
                {"format": "Single Image (Click-to-WhatsApp)", "concept": f"Image showing local business front or product with a large WhatsApp button graphic.", "angle": "Direct Chat"},
                {"format": "Reel", "concept": f"Quick tour of your local operation showing behind-the-scenes service quality.", "angle": "Personal Connection"}
            ]
            copy_headline = f"Chat with Us Directly on WhatsApp"
            copy_text = f"Have questions? Tap the button below to message us. Get {offer} instantly on your first chat."

        # Dynamic scoring
        has_website = bool(profile.get("website"))
        has_experience = profile.get("previous_ads_experience") != "None"
        
        score = 65
        ready_items = ["Business goal is clearly identified"]
        attention_items = []
        priority_items = []

        if has_website:
            score += 10
            ready_items.append("Landing page website URL provided")
        else:
            attention_items.append("No active website URL provided (recommended for Sales campaigns)")

        if has_experience:
            score += 5
            ready_items.append("Prior Meta Ads platform familiarity")
        else:
            attention_items.append("First-time Meta advertiser (will require additional onboarding assistance)")

        if offer:
            score += 10
            ready_items.append("Compelling promotional offer ready")
        else:
            priority_items.append("No specific promotional offer defined (ads run best with clear promotional hooks)")

        if is_retail and not has_website:
            score -= 10
            priority_items.append("Sales campaign requires landing page and Pixel setup prior to launch")
            
        score = min(98, max(45, score))

        # Final structure
        return {
            "business_summary": f"Campaign plan for {biz_name} aiming to drive growth in the {industry} sector by tackling: '{challenge}'.",
            "recommended_objective": rec_objective,
            "objective_reasoning": obj_reason,
            "recommended_structure": "1 Campaign -> 2 Ad Sets (Broad demographic vs Interest stack) -> 3 Ad creatives under test.",
            "audience_strategy": {
                "primary_audience": f"Broad demographics targeting {location}.",
                "secondary_audience": f"Interest stacks matching {target_customer} requirements.",
                "targeting_details": f"Location: {location} | Targeting: Custom Interests & Broad demo parameters.",
                "reasoning": f"Leverages Meta's algorithmic broad targeting to discover customers matching '{target_customer}' profile."
            },
            "budget_strategy": {
                "daily_budget": f"{budget}",
                "monthly_budget": "30x daily budget",
                "allocation": "80% Testing phase / 20% Remarketing / Lookalikes",
                "scaling": "Scale budget by 20% once CPA falls below benchmark target for 3 consecutive days."
            },
            "creative_strategy": creative_theme,
            "sample_concepts": concepts,
            "sample_copy": [
                {
                    "headline": copy_headline,
                    "primary_text": copy_text
                }
            ],
            "tracking_requirements": tracking,
            "testing_strategy": "Test two distinct copy angles (Direct Offer vs Problem-Solver) using the same video reel to identify the best creative hook.",
            "priority_actions": priority_items or ["Verify Meta Pixel triggers successfully", "Connect WhatsApp Business API if utilizing click-to-chat"],
            "readiness_score": score,
            "readiness_breakdown": {
                "ready": ready_items,
                "attention_needed": attention_items or ["Prepare backup creative graphic asset"],
                "priority_before_launch": priority_items or ["Verify billing permissions inside Meta Business Suite"]
            }
        }
