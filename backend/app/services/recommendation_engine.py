"""
Digital Growth Studio — AI Recommendation Engine
"""
import uuid
import httpx
import structlog
import math
from datetime import date, datetime, timedelta
from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Tuple, Dict, Any

from app.config import get_settings
from app.models.campaign import Campaign, AdSet, Ad
from app.models.meta import MetaAdAccount, MetaConnection
from app.models.metrics import CampaignDailyMetrics, AdDailyMetrics
from app.models.recommendation import AIRecommendation
from app.services.data_quality_guard import DataQualityGuard

logger = structlog.get_logger()
settings = get_settings()


class RecommendationEngine:
    """
    Analyzes Meta performance logs and compiles actionable rule-based optimization alerts,
    including advanced platform/placement and age/gender demographic breakdowns.
    """

    @classmethod
    def calculate_priority_and_confidence(
        cls,
        impact: float,  # 0.0 to 1.0
        urgency: float,  # 0.0 to 1.0
        spend: float,
        benchmark_spend: float = 1000.0,
        num_conversions: int = 0,
        impressions: int = 0,
        duration_days: int = 7,
    ) -> Tuple[str, float]:
        """
        Calculates priority score and confidence level dynamically.
        Priority = Impact * Confidence * Urgency * Spend Exposure.
        Returns: (priority_level_string, confidence_score_float)
        """
        # 1. Spend Exposure: logarithmic scale of spend relative to benchmark
        if spend <= 0:
            spend_exposure = 0.1
        else:
            spend_exposure = min(1.0, max(0.1, spend / benchmark_spend))

        # 2. Confidence based on data volume
        base_confidence = 0.40
        
        # Spend scaling
        if spend > 10000:
            base_confidence += 0.25
        elif spend > 3000:
            base_confidence += 0.15
        elif spend > 500:
            base_confidence += 0.05
            
        # Impressions scaling
        if impressions > 50000:
            base_confidence += 0.15
        elif impressions > 10000:
            base_confidence += 0.08
        elif impressions > 2000:
            base_confidence += 0.03
            
        # Conversions scaling
        if num_conversions > 20:
            base_confidence += 0.15
        elif num_conversions > 5:
            base_confidence += 0.08
        elif num_conversions > 1:
            base_confidence += 0.02

        # Duration scaling
        if duration_days >= 14:
            base_confidence += 0.05
        elif duration_days >= 7:
            base_confidence += 0.02

        confidence_score = min(0.99, max(0.15, base_confidence))

        # 3. Priority Score calculation
        priority_score = impact * confidence_score * urgency * spend_exposure

        # Map to priority levels
        if priority_score >= 0.50:
            priority = "critical"
        elif priority_score >= 0.30:
            priority = "high"
        elif priority_score >= 0.15:
            priority = "medium"
        else:
            priority = "low"

        return priority, confidence_score

    @classmethod
    async def compile_recommendations(
        cls, db: AsyncSession, ad_account_uuid: uuid.UUID, user_uuid: uuid.UUID
    ) -> int:
        """
        Runs performance checks against historical metrics and upserts recommendations.
        Fetches dynamic platform/placement and demographic breakdowns from Meta.
        """
        logger.info("Running AI Recommendations compilation", ad_account_id=ad_account_uuid)
        
        # 1. Look up ad account and connection token
        stmt_acc = select(MetaAdAccount).where(MetaAdAccount.id == ad_account_uuid)
        res_acc = await db.execute(stmt_acc)
        ad_acc = res_acc.scalar_one_or_none()

        token = None
        is_mock = True
        if ad_acc:
            stmt_conn = select(MetaConnection).where(MetaConnection.id == ad_acc.meta_connection_id)
            res_conn = await db.execute(stmt_conn)
            conn = res_conn.scalar_one_or_none()
            if conn:
                token = conn.access_token
                is_mock = token.startswith("EAAGm0PX") or token == "mock_access_token" or ad_acc.meta_account_id in {"act_101010101", "act_202020202", "act_303030303"}

        # Resolve AI Intelligence entitlement
        from app.services.entitlement_engine import EntitlementEngine
        from app.models.user import User
        
        ent_check = await EntitlementEngine.has_full_ai_intelligence(db, user_uuid, str(ad_account_uuid))
        if ent_check.get("enabled"):
            historical_days = 365
        else:
            stmt_user = select(User).where(User.id == user_uuid)
            res_user = await db.execute(stmt_user)
            user_obj = res_user.scalar_one_or_none()
            if user_obj:
                base_ent = await EntitlementEngine.resolve_entitlements(user_obj, db)
                historical_days = base_ent.get("historical_days", 90)
            else:
                historical_days = 90

        today = date.today()
        start_date = today - timedelta(days=historical_days)
        recommendations_to_add = []

        # Compute Account Average CTR dynamically based on historical plan days
        ctr_stmt = (
            select(
                func.sum(CampaignDailyMetrics.clicks).label("clicks"),
                func.sum(CampaignDailyMetrics.impressions).label("impressions")
            )
            .join(Campaign, CampaignDailyMetrics.campaign_id == Campaign.id)
            .where(Campaign.ad_account_id == ad_account_uuid)
            .where(CampaignDailyMetrics.date >= start_date)
        )
        ctr_res = await db.execute(ctr_stmt)
        ctr_row = ctr_res.fetchone()
        
        account_avg_ctr = 0.015  # Default benchmark is 1.5%
        is_custom_baseline = False
        if ctr_row and ctr_row[0] is not None and ctr_row[1] is not None and ctr_row[1] > 0:
            avg_ctr = float(ctr_row[0]) / float(ctr_row[1])
            if avg_ctr > 0:
                account_avg_ctr = avg_ctr
                is_custom_baseline = True

        # Resolve active campaigns in the account to determine primary objective (Conversations, Leads, etc.)
        active_stmt = select(Campaign).where(Campaign.ad_account_id == ad_account_uuid).where(Campaign.status == "ACTIVE").options(selectinload(Campaign.ad_sets))
        active_res = await db.execute(active_stmt)
        active_campaigns = active_res.scalars().all()
        if not active_campaigns:
            all_stmt = select(Campaign).where(Campaign.ad_account_id == ad_account_uuid).options(selectinload(Campaign.ad_sets))
            all_res = await db.execute(all_stmt)
            active_campaigns = all_res.scalars().all()
        
        is_messaging_acc = False
        is_leads_acc = False
        
        if active_campaigns:
            conv_count = 0
            lead_count = 0
            for c in active_campaigns:
                if "ENGAGEMENT" in (c.objective or "").upper():
                    conv_count += 1
                elif "LEADS" in (c.objective or "").upper():
                    lead_count += 1
                else:
                    for as_item in c.ad_sets:
                        perf_goal = (as_item.performance_goal or "").upper()
                        opt_event = (as_item.optimization_event or "").upper()
                        if "CONVERSATION" in perf_goal or "MESSAGING" in perf_goal or "CONVERSATION" in opt_event:
                            conv_count += 1
                            break
                        elif "LEAD" in perf_goal or "LEAD" in opt_event:
                            lead_count += 1
                            break
            
            if conv_count > len(active_campaigns) / 2:
                is_messaging_acc = True
            elif lead_count > len(active_campaigns) / 2:
                is_leads_acc = True

        # ──────────────────────────────────────────────
        # CORE ANALYSIS: Fetch and process breakdowns
        # ──────────────────────────────────────────────
        platform_breakdowns = []
        demographic_breakdowns = []

        if not is_mock and token and ad_acc:
            try:
                # Fetch Platform Breakdowns from Meta Marketing API
                async with httpx.AsyncClient() as client:
                    platform_url = (
                        f"https://graph.facebook.com/{settings.META_API_VERSION}/{ad_acc.meta_account_id}/insights"
                        f"?date_preset=last_14d&breakdowns=publisher_platform"
                        f"&fields=spend,impressions,clicks,actions,action_values"
                        f"&access_token={token}"
                    )
                    r = await client.get(platform_url, timeout=15.0)
                    if r.status_code == 200:
                        platform_breakdowns = r.json().get("data", [])

                    # Fetch Age & Gender Demographic Breakdowns from Meta Marketing API
                    demo_url = (
                        f"https://graph.facebook.com/{settings.META_API_VERSION}/{ad_acc.meta_account_id}/insights"
                        f"?date_preset=last_14d&breakdowns=age,gender"
                        f"&fields=spend,impressions,clicks,actions,action_values"
                        f"&access_token={token}"
                    )
                    r = await client.get(demo_url, timeout=15.0)
                    if r.status_code == 200:
                        demographic_breakdowns = r.json().get("data", [])
            except Exception as e:
                logger.warn("Failed to fetch live breakdowns from Meta. Falling back to default rules.", error=str(e))

        # Handle Mock/Demo Breakdown generation if mock pipeline
        if is_mock:
            action_type_mock = "purchase"
            if is_messaging_acc:
                action_type_mock = "onsite_conversion.messaging_conversation_started_7d"
            elif is_leads_acc:
                action_type_mock = "lead"

            platform_breakdowns = [
                {"publisher_platform": "facebook", "spend": 4500.00, "impressions": 50000, "clicks": 800, "actions": [{"action_type": action_type_mock, "value": 8}], "action_values": [] if (is_messaging_acc or is_leads_acc) else [{"action_type": "purchase", "value": 6400.00}]},
                {"publisher_platform": "instagram", "spend": 3200.00, "impressions": 40000, "clicks": 950, "actions": [{"action_type": action_type_mock, "value": 15}], "action_values": [] if (is_messaging_acc or is_leads_acc) else [{"action_type": "purchase", "value": 12000.00}]},
                {"publisher_platform": "audience_network", "spend": 950.00, "impressions": 12000, "clicks": 110, "actions": [], "action_values": []},
            ]
            demographic_breakdowns = [
                {"age": "18-24", "gender": "female", "spend": 1200.00, "impressions": 15000, "clicks": 180, "actions": [{"action_type": action_type_mock, "value": 1}], "action_values": [] if (is_messaging_acc or is_leads_acc) else [{"action_type": "purchase", "value": 800.00}]},
                {"age": "18-24", "gender": "male", "spend": 1100.00, "impressions": 14000, "clicks": 150, "actions": [{"action_type": action_type_mock, "value": 0}], "action_values": []},
                {"age": "25-34", "gender": "female", "spend": 3500.00, "impressions": 40000, "clicks": 720, "actions": [{"action_type": action_type_mock, "value": 14}], "action_values": [] if (is_messaging_acc or is_leads_acc) else [{"action_type": "purchase", "value": 11200.00}]},
                {"age": "25-34", "gender": "male", "spend": 2800.00, "impressions": 30000, "clicks": 600, "actions": [{"action_type": action_type_mock, "value": 10}], "action_values": [] if (is_messaging_acc or is_leads_acc) else [{"action_type": "purchase", "value": 8000.00}]},
            ]

        # ──────────────────────────────────────────────
        # RULE: Platform/Placement Optimization (8.9)
        # ──────────────────────────────────────────────
        # ──────────────────────────────────────────────
        # RULE: Platform/Placement Optimization (8.9)
        # ──────────────────────────────────────────────
        total_platform_spend = sum(float(p.get("spend", 0)) for p in platform_breakdowns)
        for platform in platform_breakdowns:
            platform_name = platform.get("publisher_platform")
            spend = float(platform.get("spend", 0))
            
            results = 0
            revenue = 0.0
            roas = 0.0
            
            action_type_key = "purchase"
            if is_messaging_acc:
                action_type_key = "onsite_conversion.messaging_conversation_started_7d"
            elif is_leads_acc:
                action_type_key = "lead"

            for act in platform.get("actions", []):
                act_type = act.get("action_type", "")
                if act_type == action_type_key or (is_messaging_acc and "conversation" in act_type) or (is_leads_acc and "lead" in act_type):
                    results += int(act.get("value", 0))

            if not (is_messaging_acc or is_leads_acc):
                for val in platform.get("action_values", []):
                    if val.get("action_type") == "purchase":
                        revenue = float(val.get("value", 0.0))
                roas = (revenue / spend) if spend > 0 else 0.0

            spend_share = (spend / total_platform_spend) if total_platform_spend > 0 else 0.0

            # 1. Placement Opportunity
            is_opp = False
            cost_per_res = 0.0
            if is_messaging_acc:
                cost_per_res = spend / results if results > 0 else spend
                is_opp = results >= 5 and cost_per_res <= 35.00
            elif is_leads_acc:
                cost_per_res = spend / results if results > 0 else spend
                is_opp = results >= 2 and cost_per_res <= 130.00
            else:
                is_opp = roas >= 2.0

            if platform_name == "instagram" and is_opp and spend_share < 0.50:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.70, urgency=0.50, spend=spend, num_conversions=results
                )
                
                desc_detail = f"generates strong conversion efficiency with a ROAS of {roas:.2f}x" if not (is_messaging_acc or is_leads_acc) else f"generates strong efficiency with a Cost Per Result of ₹{cost_per_res:.2f}"
                evidence_str = f"Reels ROAS is {roas:.2f}x" if not (is_messaging_acc or is_leads_acc) else f"Reels Cost is ₹{cost_per_res:.2f}"

                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad_account",
                        entity_id=ad_account_uuid,
                        recommendation_type="PLACEMENT_OPPORTUNITY",
                        title=f"Placement Opportunity: Prioritize Reels/Instagram Delivery",
                        description=f"Instagram delivery {desc_detail}, while consuming only {spend_share*100:.0f}% of total budget.",
                        reason="Reels placement exhibits lower cost per conversion than other placements.",
                        objective="Conversations" if is_messaging_acc else ("Leads" if is_leads_acc else "Sales"),
                        problem=None,
                        root_cause=None,
                        evidence=f"{evidence_str} vs account average. Spend share is {spend_share*100:.1f}%.",
                        expected_impact="Prioritizing Instagram Reels delivery in your next creative cycle will scale conversions and reduce average CPA.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"spend": spend, "roas": roas, "purchases": results, "placement": platform_name},
                        status="new",
                    )
                )
            
            # 2. Exclude Placement if low performance
            else:
                is_low = False
                if is_messaging_acc:
                    cost_per_res = spend / results if results > 0 else spend
                    is_low = spend >= 100.00 and (results == 0 or cost_per_res > 55.00)
                elif is_leads_acc:
                    cost_per_res = spend / results if results > 0 else spend
                    is_low = spend >= 150.00 and (results == 0 or cost_per_res > 220.00)
                else:
                    is_low = spend >= 100.00 and roas < 0.8

                if is_low:
                    priority, confidence = cls.calculate_priority_and_confidence(
                        impact=0.65, urgency=0.60, spend=spend, num_conversions=results
                    )
                    
                    rec_type = "PLACEMENT_OPTIMIZATION"
                    title = f"Exclude underperforming placement: {platform_name.upper()}"
                    if confidence < 0.50:
                        rec_type = "WATCH"
                        title = f"Watch placement delivery: {platform_name.upper()}"

                    desc_detail = f"generated only {results} conversions with a ROAS of {roas:.2f}x" if not (is_messaging_acc or is_leads_acc) else f"generated only {results} results with a high Cost Per Result of ₹{cost_per_res:.2f}"
                    evidence_str = f"ROAS: {roas:.2f}x, conversions: {results}" if not (is_messaging_acc or is_leads_acc) else f"conversions: {results}, Cost: ₹{cost_per_res:.2f}"

                    recommendations_to_add.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="ad_account",
                            entity_id=ad_account_uuid,
                            recommendation_type=rec_type,
                            title=title,
                            description=(
                                f"The {platform_name.upper()} placement is delivering conversions inefficiently. "
                                f"It consumed ₹{spend:.2f} but {desc_detail}."
                            ),
                            reason=f"Excluding the underperforming {platform_name} placement redirects budget to higher-converting placements like Instagram Reels.",
                            objective="Conversations" if is_messaging_acc else ("Leads" if is_leads_acc else "Sales"),
                            problem="Inefficient placement spend",
                            root_cause="Over-delivery on low-conversion placement",
                            evidence=f"Spend: ₹{spend:.2f}, {evidence_str}",
                            expected_impact="Excluding this placement saves wasted spend and improves campaign conversion efficiency.",
                            confidence_score=confidence,
                            priority=priority,
                            supporting_metrics={"spend": spend, "roas": roas, "purchases": results, "placement": platform_name},
                            status="new",
                        )
                    )

        # ──────────────────────────────────────────────
        # RULE: Age & Gender Target Tuning (8.10 Audience)
        # ──────────────────────────────────────────────
        for demo in demographic_breakdowns:
            age_group = demo.get("age")
            gender = demo.get("gender")
            spend = float(demo.get("spend", 0))
            
            results = 0
            revenue = 0.0
            roas = 0.0
            
            action_type_key = "purchase"
            if is_messaging_acc:
                action_type_key = "onsite_conversion.messaging_conversation_started_7d"
            elif is_leads_acc:
                action_type_key = "lead"

            for act in demo.get("actions", []):
                act_type = act.get("action_type", "")
                if act_type == action_type_key or (is_messaging_acc and "conversation" in act_type) or (is_leads_acc and "lead" in act_type):
                    results += int(act.get("value", 0))

            if not (is_messaging_acc or is_leads_acc):
                for val in demo.get("action_values", []):
                    if val.get("action_type") == "purchase":
                        revenue = float(val.get("value", 0.0))
                roas = (revenue / spend) if spend > 0 else 0.0

            # Audience Opportunity
            is_opp = False
            cost_per_res = 0.0
            if is_messaging_acc:
                cost_per_res = spend / results if results > 0 else spend
                is_opp = spend >= 1000.00 and results >= 20 and cost_per_res <= 25.00
            elif is_leads_acc:
                cost_per_res = spend / results if results > 0 else spend
                is_opp = spend >= 1000.00 and results >= 8 and cost_per_res <= 100.00
            else:
                is_opp = spend >= 1000.00 and roas >= 2.8

            if is_opp:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.75, urgency=0.50, spend=spend, num_conversions=results
                )
                
                desc_detail = f"generates strong conversions with a ROAS of {roas:.2f}x" if not (is_messaging_acc or is_leads_acc) else f"generates strong efficiency with a Cost Per Result of ₹{cost_per_res:.2f}"
                evidence_str = f"ROAS of {roas:.2f}x" if not (is_messaging_acc or is_leads_acc) else f"Cost of ₹{cost_per_res:.2f}"

                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad_account",
                        entity_id=ad_account_uuid,
                        recommendation_type="AUDIENCE_OPPORTUNITY",
                        title=f"Audience Opportunity: Scale target demographic {gender.upper()} {age_group}",
                        description=f"Demographic segment {gender.upper()} ({age_group}) {desc_detail}.",
                        reason="Target audience segment has high conversion rates.",
                        objective="Conversations" if is_messaging_acc else ("Leads" if is_leads_acc else "Sales"),
                        problem=None,
                        root_cause=None,
                        evidence=f"Segment spent ₹{spend:.2f} with a {evidence_str}.",
                        expected_impact="Consider testing additional creative variations tailored specifically to this segment.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"spend": spend, "roas": roas, "purchases": results, "demographics": f"{gender}_{age_group}"},
                        status="new",
                    )
                )

            # Exclude low performing audience segment
            else:
                is_low = False
                if is_messaging_acc:
                    cost_per_res = spend / results if results > 0 else spend
                    is_low = spend >= 100.00 and (results == 0 or cost_per_res > 55.00)
                elif is_leads_acc:
                    cost_per_res = spend / results if results > 0 else spend
                    is_low = spend >= 150.00 and (results == 0 or cost_per_res > 220.00)
                else:
                    is_low = spend >= 100.00 and roas < 0.5

                if is_low:
                    priority, confidence = cls.calculate_priority_and_confidence(
                        impact=0.60, urgency=0.55, spend=spend, num_conversions=results
                    )
                    
                    rec_type = "DEMOGRAPHIC_TUNING"
                    title = f"Narrow target audience: Exclude {gender.upper()} {age_group}"
                    if confidence < 0.50:
                        rec_type = "WATCH"
                        title = f"Watch demographic segment: {gender.upper()} {age_group}"

                    desc_detail = f"with low purchase intent. It has consumed ₹{spend:.2f} with a ROAS of {roas:.2f}x" if not (is_messaging_acc or is_leads_acc) else f"with high Cost Per Result. It has consumed ₹{spend:.2f} with a Cost Per Result of ₹{cost_per_res:.2f}"
                    evidence_str = f"ROAS: {roas:.2f}x" if not (is_messaging_acc or is_leads_acc) else f"Cost: ₹{cost_per_res:.2f}"

                    recommendations_to_add.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="ad_account",
                            entity_id=ad_account_uuid,
                            recommendation_type=rec_type,
                            title=title,
                            description=(
                                f"Audience segment {gender.upper()} ({age_group}) is consuming budget {desc_detail}."
                            ),
                            reason=f"Refining targeting to exclude {gender} aged {age_group} will improve campaign efficiency.",
                            objective="Conversations" if is_messaging_acc else ("Leads" if is_leads_acc else "Sales"),
                            problem="Targeting leakage",
                            root_cause="Over-targeting low intent demographic",
                            evidence=f"Spend: ₹{spend:.2f}, {evidence_str}",
                            expected_impact="Excluding this demographic redirects budget to higher intent groups.",
                            confidence_score=confidence,
                            priority=priority,
                            supporting_metrics={"spend": spend, "roas": roas, "purchases": results, "demographics": f"{gender}_{age_group}"},
                            status="new",
                        )
                    )

        # ──────────────────────────────────────────────
        # RULE: Underperforming Ads & Money at Risk (8.3)
        # ──────────────────────────────────────────────
        ad_stmt = (
            select(Ad)
            .join(AdSet, Ad.ad_set_id == AdSet.id)
            .join(Campaign, AdSet.campaign_id == Campaign.id)
            .where(Campaign.ad_account_id == ad_account_uuid)
            .where(Ad.status == "ACTIVE")
            .options(selectinload(Ad.ad_set).selectinload(AdSet.campaign))
        )
        res = await db.execute(ad_stmt)
        active_ads = res.scalars().all()

        underperforming_ads_list = []
        total_risk_spend = 0.0

        for ad in active_ads:
            m_stmt = (
                select(AdDailyMetrics)
                .where(AdDailyMetrics.ad_id == ad.id)
                .where(AdDailyMetrics.date >= start_date)
            )
            m_res = await db.execute(m_stmt)
            metrics_rows = m_res.scalars().all()
            if not metrics_rows:
                continue

            spend = sum(float(r.spend or 0.0) for r in metrics_rows)
            if spend == 0.0:
                continue

            impressions = sum(int(r.impressions or 0) for r in metrics_rows)
            clicks = sum(int(r.clicks or 0) for r in metrics_rows)
            purchases = sum(int(r.purchases or 0) for r in metrics_rows)
            revenue = sum(float(r.revenue or 0.0) for r in metrics_rows)
            
            conversations = sum(int((r.actions or {}).get("conversations", 0)) for r in metrics_rows)
            leads = sum(int(r.leads or (r.actions or {}).get("leads", 0)) for r in metrics_rows)
            calls = sum(int((r.actions or {}).get("calls", 0)) for r in metrics_rows)

            campaign = ad.ad_set.campaign
            obj = (campaign.objective or "").upper()
            perf_goal = (ad.ad_set.performance_goal or "").upper()
            opt_event = (ad.ad_set.optimization_event or "").upper()

            is_conv = opt_event == "CONVERSATION" or "CONVERSATION" in perf_goal or "MESSAGING" in perf_goal or "ENGAGEMENT" in obj
            is_lead = opt_event == "LEAD" or "LEAD" in perf_goal or "LEADS" in obj
            is_call = opt_event == "CALL" or "CALL" in perf_goal

            is_underperforming = False
            pct_worse = 0.0
            description = ""
            reason = ""
            evidence = ""
            rec_title_pause = ""
            rec_title_watch = ""
            rec_obj = "Sales"
            num_conversions = purchases

            ctr = (clicks / impressions) if impressions > 0 else 0.0

            if is_conv:
                num_conversions = conversations
                rec_obj = "Conversations"
                cost = (spend / conversations) if conversations > 0 else spend
                if conversations == 0 and spend >= 50.00:
                    is_underperforming = True
                    pct_worse = 100.0
                elif conversations > 0 and cost > 45.00:
                    is_underperforming = True
                    pct_worse = min(100.0, ((cost - 30.0) / 30.0) * 100)
                
                description = (
                    f"This active ad has generated a high cost-per-conversation of ₹{cost:.2f} over the last 14 days, "
                    f"spending ₹{spend:.2f} and returning only {conversations} conversations."
                )
                reason = "Cost-per-conversation is significantly higher than account benchmark targets."
                evidence = f"Spend: ₹{spend:.2f}, Conversations: {conversations}, Cost: ₹{cost:.2f}/conv"
                rec_title_pause = f"Pause high CPA Ad: {ad.name}"
                rec_title_watch = f"Watch cost per conversation on Ad: {ad.name}"

            elif is_lead:
                num_conversions = leads
                rec_obj = "Leads"
                cost = (spend / leads) if leads > 0 else spend
                if leads == 0 and spend >= 100.00:
                    is_underperforming = True
                    pct_worse = 100.0
                elif leads > 0 and cost > 180.00:
                    is_underperforming = True
                    pct_worse = min(100.0, ((cost - 120.0) / 120.0) * 100)
                
                description = (
                    f"This active ad has generated a high cost-per-lead of ₹{cost:.2f} over the last 14 days, "
                    f"spending ₹{spend:.2f} and returning only {leads} leads."
                )
                reason = "Cost-per-lead is higher than target benchmarks."
                evidence = f"Spend: ₹{spend:.2f}, Leads: {leads}, Cost: ₹{cost:.2f}/lead"
                rec_title_pause = f"Pause high CPA Ad: {ad.name}"
                rec_title_watch = f"Watch cost per lead on Ad: {ad.name}"

            elif is_call:
                num_conversions = calls
                rec_obj = "Calls"
                cost = (spend / calls) if calls > 0 else spend
                if calls == 0 and spend >= 120.00:
                    is_underperforming = True
                    pct_worse = 100.0
                elif calls > 0 and cost > 220.00:
                    is_underperforming = True
                    pct_worse = min(100.0, ((cost - 150.0) / 150.0) * 100)
                
                description = (
                    f"This active ad has generated a high cost-per-call of ₹{cost:.2f} over the last 14 days, "
                    f"spending ₹{spend:.2f} and returning only {calls} phone calls."
                )
                reason = "Cost-per-call is higher than benchmark targets."
                evidence = f"Spend: ₹{spend:.2f}, Calls: {calls}, Cost: ₹{cost:.2f}/call"
                rec_title_pause = f"Pause high CPA Ad: {ad.name}"
                rec_title_watch = f"Watch cost per call on Ad: {ad.name}"

            else:
                # Sales / ROAS based
                roas = (revenue / spend) if spend > 0 else 0.0
                if roas < 1.20:
                    is_underperforming = True
                    pct_worse = min(100.0, ((1.6 - roas) / 1.6) * 100)
                
                description = (
                    f"This active ad has generated a low ROAS of {roas:.2f}x over the last 14 days, "
                    f"spending ₹{spend:.2f} and returning only ₹{revenue:.2f} in purchases revenue."
                )
                reason = "Cost-per-acquisition is too high compared to return values."
                evidence = f"Spend: ₹{spend:.2f}, ROAS: {roas:.2f}x, CTR: {ctr*100:.2f}%"
                rec_title_pause = f"Pause low ROAS Ad: {ad.name}"
                rec_title_watch = f"Watch performance on Ad: {ad.name}"

            if is_underperforming:
                underperforming_ads_list.append({
                    "name": ad.name,
                    "id": str(ad.id),
                    "spend": spend,
                    "purchases": num_conversions,
                    "pct_worse": pct_worse
                })
                total_risk_spend += spend

            # Emitting Underperforming Ad Recommendation
            if spend >= 50.00 and is_underperforming:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.80, urgency=0.75, spend=spend, num_conversions=num_conversions, impressions=impressions
                )

                rec_type = "UNDERPERFORMING_AD"
                title = rec_title_pause
                if confidence < 0.50:
                    rec_type = "WATCH"
                    title = rec_title_watch

                resolved_campaign_id = ad.ad_set.campaign_id if ad.ad_set else None

                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad",
                        entity_id=ad.id,
                        campaign_id=resolved_campaign_id,
                        adset_id=ad.ad_set_id,
                        ad_id=ad.id,
                        recommendation_type=rec_type,
                        title=title,
                        description=description,
                        reason=reason,
                        objective=rec_obj,
                        problem="Inefficient creative performance",
                        root_cause="High CPA or low conversion rate on creative variant",
                        evidence=evidence,
                        expected_impact="Pausing this ad allows Meta's delivery algorithm to prioritize higher performing assets in the ad set.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"spend": spend, "pct_worse": pct_worse},
                        status="new",
                    )
                )

            # Low CTR Check compared to account average CTR baseline
            if impressions >= 500 and ctr < account_avg_ctr:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.65, urgency=0.60, spend=spend, num_conversions=num_conversions, impressions=impressions
                )
                
                rec_type = "UNDERPERFORMING_CREATIVE"
                title = f"Refresh low CTR Ad copy/headline: {ad.name}"
                if confidence < 0.50:
                    rec_type = "WATCH"
                    title = f"Watch click engagement: {ad.name}"

                resolved_campaign_id = ad.ad_set.campaign_id if ad.ad_set else None

                description_text = (
                    f"CTR is currently {ctr*100:.2f}%, which is below your account's average historical CTR of {account_avg_ctr*100:.2f}% "
                    f"(calculated over the last {historical_days} days). "
                    f"Out of {impressions} impressions, it has captured only {clicks} clicks."
                ) if is_custom_baseline else (
                    f"CTR is currently {ctr*100:.2f}%, which is below the recommended benchmark of 1.50%. "
                    f"Out of {impressions} impressions, it has captured only {clicks} clicks."
                )

                evidence_text = (
                    f"Impressions: {impressions}, CTR: {ctr*100:.2f}%, Account Avg CTR: {account_avg_ctr*100:.2f}%, clicks: {clicks}"
                ) if is_custom_baseline else (
                    f"Impressions: {impressions}, CTR: {ctr*100:.2f}%, Benchmark CTR: 1.50%, clicks: {clicks}"
                )

                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad",
                        entity_id=ad.id,
                        campaign_id=resolved_campaign_id,
                        adset_id=ad.ad_set_id,
                        ad_id=ad.id,
                        recommendation_type=rec_type,
                        title=title,
                        description=description_text,
                        reason="Ad fatigue or copy message is not engaging the target audience.",
                        objective="General",
                        problem="Low ad click-through rate",
                        root_cause="Creative wearout or copy hook mismatch",
                        evidence=evidence_text,
                        expected_impact="Refreshing copy/headline or swapping the visual card will improve click share and lower CPC.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"ctr": ctr, "impressions": impressions, "clicks": clicks, "account_avg_ctr": account_avg_ctr},
                        status="new",
                    )
                )

        # 3. Compile Money at Risk Recommendation if list is not empty (8.3)
        if underperforming_ads_list:
            priority, confidence = cls.calculate_priority_and_confidence(
                impact=0.85, urgency=0.80, spend=total_risk_spend, num_conversions=sum(x["purchases"] for x in underperforming_ads_list)
            )
            recommendations_to_add.append(
                AIRecommendation(
                    user_id=user_uuid,
                    ad_account_id=ad_account_uuid,
                    entity_type="ad_account",
                    entity_id=ad_account_uuid,
                    recommendation_type="BUDGET_OPPORTUNITY",
                    title="Potential Spend at Risk",
                    description=f"Our analysis identifies a total of ₹{total_risk_spend:.2f} of ad spend allocated to sub-benchmark creative variations.",
                    reason="Several active ads are performing significantly worse than campaign benchmarks.",
                    objective="Sales",
                    problem="Budget leakage on underperforming ads",
                    root_cause="Meta budget scaling over-allocating on sub-benchmark ads",
                    evidence=f"{len(underperforming_ads_list)} active ads represent ₹{total_risk_spend:.2f} of potential risk.",
                    expected_impact="Adjusting weights or pausing these ad elements redirect budget to high-performing versions, boosting campaign ROAS.",
                    confidence_score=confidence,
                    priority=priority,
                    supporting_metrics={
                        "total_risk": total_risk_spend, 
                        "underperforming_entities": underperforming_ads_list
                    },
                    status="new",
                )
            )

        # ──────────────────────────────────────────────
        # RULE: Budget Efficiency Engine (8.4 & 8.5)
        # ──────────────────────────────────────────────
        camp_stmt = select(Campaign).where(Campaign.ad_account_id == ad_account_uuid).where(Campaign.status == "ACTIVE").options(selectinload(Campaign.ad_sets))
        camp_res = await db.execute(camp_stmt)
        active_camps = camp_res.scalars().all()

        total_account_spend = 0.0
        total_account_conversions = 0
        campaign_performance_metrics = []

        for camp in active_camps:
            m_stmt = (
                select(
                    func.coalesce(func.sum(CampaignDailyMetrics.spend), 0).label("spend"),
                    func.coalesce(func.sum(CampaignDailyMetrics.purchases), 0).label("purchases"),
                    func.coalesce(func.sum(CampaignDailyMetrics.leads), 0).label("leads"),
                )
                .where(CampaignDailyMetrics.campaign_id == camp.id)
                .where(CampaignDailyMetrics.date >= start_date)
            )
            m_res = await db.execute(m_stmt)
            m_row = m_res.fetchone()
            if not m_row or float(m_row.spend or 0.0) == 0.0:
                continue

            spend = float(m_row.spend)
            purchases = int(m_row.purchases or 0)
            leads = int(m_row.leads or 0)
            conversions = purchases + leads

            total_account_spend += spend
            total_account_conversions += conversions
            campaign_performance_metrics.append({
                "campaign": camp,
                "spend": spend,
                "conversions": conversions
            })

        # Calculate efficiency scores and emit budget opportunities
        if total_account_spend > 0 and total_account_conversions > 0:
            for item in campaign_performance_metrics:
                camp = item["campaign"]
                spend = item["spend"]
                conversions = item["conversions"]

                spend_share = spend / total_account_spend
                result_share = conversions / total_account_conversions
                efficiency_score = (result_share - spend_share) * 100  # percentage points

                # 8.4 Budget Scaling / Budget Opportunity
                if efficiency_score >= 12.0:
                    priority, confidence = cls.calculate_priority_and_confidence(
                        impact=0.90, urgency=0.60, spend=spend, num_conversions=conversions
                    )
                    recommendations_to_add.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            campaign_id=camp.id,
                            recommendation_type="BUDGET_OPPORTUNITY",
                            title=f"Budget Scaling: Under-allocated Campaign: {camp.name}",
                            description=(
                                f"This campaign is highly efficient, generating {result_share*100:.0f}% of conversions "
                                f"while receiving only {spend_share*100:.0f}% of total spend (+{efficiency_score:.1f} pp efficiency)."
                            ),
                            reason="Campaign result share exceeds its budget allocation share.",
                            objective=camp.objective,
                            problem=None,
                            root_cause=None,
                            evidence=f"Spend share: {spend_share*100:.1f}%, Result share: {result_share*100:.1f}%, Efficiency: +{efficiency_score:.1f} pp.",
                            expected_impact="Increasing this campaign's budget by 15-20% is highly likely to scale overall volume efficiently.",
                            confidence_score=confidence,
                            priority=priority,
                            supporting_metrics={"spend_share": spend_share, "result_share": result_share, "efficiency": efficiency_score},
                            status="new",
                        )
                    )
                elif efficiency_score <= -15.0:
                    priority, confidence = cls.calculate_priority_and_confidence(
                        impact=0.85, urgency=0.75, spend=spend, num_conversions=conversions
                    )
                    recommendations_to_add.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            campaign_id=camp.id,
                            recommendation_type="BUDGET_OPPORTUNITY",
                            title=f"Budget Optimization: Over-allocated Campaign: {camp.name}",
                            description=(
                                f"This campaign is highly inefficient, consuming {spend_share*100:.0f}% of total budget "
                                f"but generating only {result_share*100:.0f}% of conversions ({efficiency_score:.1f} pp efficiency)."
                            ),
                            reason="Campaign spend share exceeds conversion results share.",
                            objective=camp.objective,
                            problem="Over-allocated ad spend",
                            root_cause="Low conversion rate on campaign audience",
                            evidence=f"Spend share: {spend_share*100:.1f}%, Result share: {result_share*100:.1f}%, Efficiency: {efficiency_score:.1f} pp.",
                            expected_impact="Reducing budget or restructuring creative assets will limit wasted spend.",
                            confidence_score=confidence,
                            priority=priority,
                            supporting_metrics={"spend_share": spend_share, "result_share": result_share, "efficiency": efficiency_score},
                            status="new",
                        )
                    )

        # ──────────────────────────────────────────────
        # RULE: Objectives-Aware Campaign Diagnosis (8.11 & 8.7)
        # ──────────────────────────────────────────────
        for camp in active_camps:
            m_stmt = (
                select(CampaignDailyMetrics)
                .where(CampaignDailyMetrics.campaign_id == camp.id)
                .where(CampaignDailyMetrics.date >= start_date)
            )
            m_res = await db.execute(m_stmt)
            metrics_rows = m_res.scalars().all()
            if not metrics_rows:
                continue

            spend = sum(float(r.spend or 0.0) for r in metrics_rows)
            if spend == 0.0:
                continue

            revenue = sum(float(r.revenue or 0.0) for r in metrics_rows)
            purchases = sum(int(r.purchases or 0) for r in metrics_rows)
            impressions = sum(int(r.impressions or 0) for r in metrics_rows)
            clicks = sum(int(r.clicks or 0) for r in metrics_rows)
            link_clicks = sum(int(r.link_clicks or 0) for r in metrics_rows)
            leads = sum(int(r.leads or (r.actions or {}).get("leads", 0)) for r in metrics_rows)
            reach = sum(int(r.reach or 0) for r in metrics_rows)
            
            frequency_list = [float(r.frequency) for r in metrics_rows if r.frequency is not None]
            frequency = sum(frequency_list) / len(frequency_list) if frequency_list else 1.0
            
            conversations = sum(int((r.actions or {}).get("conversations", 0)) for r in metrics_rows)
            calls = sum(int((r.actions or {}).get("calls", 0)) for r in metrics_rows)

            ctr = (clicks / impressions) if impressions > 0 else 0.0
            cpc = (spend / clicks) if clicks > 0 else 0.0
            roas = (revenue / spend) if spend > 0 else 0.0
            cpl = (spend / leads) if leads > 0 else 0.0

            obj = camp.objective.upper()
            
            # Identify exact campaign context
            is_conv_camp = "CONVERSATION" in (camp.name or "").upper() or "MESSAGING" in (camp.name or "").upper() or "ENGAGEMENT" in obj or conversations > 0
            is_lead_camp = "LEAD" in obj or "LEAD" in (camp.name or "").upper() or (leads > 0 and not is_conv_camp)

            # 1. Scaling Opportunity Check (8.7 Scaling Opportunity)
            is_scale_candidate = False
            scale_evidence = ""
            scale_desc = ""
            num_conversions = purchases
            
            if is_conv_camp:
                num_conversions = conversations
                cost_per_conv = spend / conversations if conversations > 0 else spend
                is_scale_candidate = spend >= 50.00 and conversations >= 15 and cost_per_conv <= 25.00 and frequency <= 2.2
                scale_evidence = f"Conversations: {conversations}, Cost: ₹{cost_per_conv:.2f}/conv, Frequency is {frequency:.2f}"
                scale_desc = f"This campaign has maintained strong messaging efficiency ({scale_evidence}) for 14 days and is suitable for controlled budget testing."
            elif is_lead_camp:
                num_conversions = leads
                is_scale_candidate = spend >= 50.00 and leads >= 10 and cpl <= 100.00 and frequency <= 2.2
                scale_evidence = f"Leads: {leads}, Cost: ₹{cpl:.2f}/lead, Frequency is {frequency:.2f}"
                scale_desc = f"This campaign has maintained strong lead acquisition efficiency ({scale_evidence}) for 14 days and is suitable for controlled budget testing."
            else:
                is_scale_candidate = spend >= 50.00 and purchases >= 5 and roas >= 2.50 and frequency <= 2.2
                scale_evidence = f"ROAS is {roas:.2f}x, Frequency is {frequency:.2f}"
                scale_desc = f"This campaign has maintained strong purchase returns (ROAS: {roas:.2f}x) for 14 days and is suitable for controlled budget testing."

            if is_scale_candidate:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.90, urgency=0.55, spend=spend, num_conversions=num_conversions, duration_days=14
                )
                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="SCALING_OPPORTUNITY",
                        title=f"Scaling Opportunity: controlled testing",
                        description=scale_desc,
                        reason="Stable delivery efficiency and low audience frequency saturation.",
                        objective="Conversations" if is_conv_camp else ("Leads" if is_lead_camp else "Sales"),
                        problem=None,
                        root_cause=None,
                        evidence=scale_evidence,
                        expected_impact="Controlled budget increases of 15-20% will scale conversion volume without triggering creative fatigue.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"spend": spend, "roas": roas, "frequency": frequency},
                        status="new"
                    )
                )

            # 2. Conversion Opportunity Check (8.11 post-click / downstream funnel leak)
            if is_conv_camp:
                if clicks >= 80 and ctr > account_avg_ctr and cpc < 25.0:
                    conversion_rate = (conversations / clicks) if clicks > 0 else 0.0
                    if conversion_rate < 0.10:
                        priority, confidence = cls.calculate_priority_and_confidence(
                            impact=0.85, urgency=0.70, spend=spend, num_conversions=conversations
                        )
                        recommendations_to_add.append(
                            AIRecommendation(
                                user_id=user_uuid,
                                ad_account_id=ad_account_uuid,
                                entity_type="campaign",
                                entity_id=camp.id,
                                campaign_id=camp.id,
                                recommendation_type="CONVERSION_OPPORTUNITY",
                                title="Post-Click Messaging Funnel Leak",
                                description=f"Ad click relevance is high (CTR: {ctr*100:.2f}%), but click-to-conversation initiation rate is only {conversion_rate*100:.2f}%.",
                                reason="Post-click messaging entry barrier. Clicks are registering, but users fail to trigger the chat flow.",
                                objective="Conversations",
                                problem="Low chat trigger rate",
                                root_cause="Messenger/WhatsApp welcome template friction or link destination latency",
                                evidence=f"CTR: {ctr*100:.2f}%, Clicks: {clicks}, Conversations: {conversations}",
                                expected_impact="Do not pause the ad. Optimize the greeting message template and ensure the call-to-action redirects immediately to the active chat screen.",
                                confidence_score=confidence,
                                priority=priority,
                                supporting_metrics={"clicks": clicks, "conversations": conversations, "conversion_rate": conversion_rate},
                                status="new"
                            )
                        )
            
            elif is_lead_camp:
                if clicks >= 100 and ctr > account_avg_ctr and cpc < 20.0:
                    conversion_rate = (leads / clicks) if clicks > 0 else 0.0
                    if conversion_rate < 0.02:
                        priority, confidence = cls.calculate_priority_and_confidence(
                            impact=0.85, urgency=0.70, spend=spend, num_conversions=leads
                        )
                        recommendations_to_add.append(
                            AIRecommendation(
                                user_id=user_uuid,
                                ad_account_id=ad_account_uuid,
                                entity_type="campaign",
                                entity_id=camp.id,
                                campaign_id=camp.id,
                                recommendation_type="CONVERSION_OPPORTUNITY",
                                title="Post-Click Lead Conversion Leak",
                                description=f"Ad delivery is highly efficient (CTR: {ctr*100:.2f}%, CPC: ₹{cpc:.2f}), but link click-to-lead conversion is only {conversion_rate*100:.2f}%.",
                                reason="Post-click opportunity. Audience clicks but fails to submit lead form.",
                                objective="Leads",
                                problem="Landing page/lead form dropoff",
                                root_cause="Form complexity or landing page load latency",
                                evidence=f"CTR: {ctr*100:.2f}%, CPC: ₹{cpc:.2f}, Form Conversion: {conversion_rate*100:.2f}%",
                                expected_impact="Do not change the ad. Ad delivery is optimal. Audit the landing page form fields and latency issues instead.",
                                confidence_score=confidence,
                                priority=priority,
                                supporting_metrics={"clicks": clicks, "leads": leads, "conversion_rate": conversion_rate},
                                status="new"
                            )
                        )
            
            # Sales objective leak
            elif "SALES" in obj or "CONVERSIONS" in obj:
                if clicks >= 100 and ctr > account_avg_ctr and purchases == 0 and spend > 150.00:
                    priority, confidence = cls.calculate_priority_and_confidence(
                        impact=0.85, urgency=0.75, spend=spend, num_conversions=0
                    )
                    recommendations_to_add.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            campaign_id=camp.id,
                            recommendation_type="CONVERSION_OPPORTUNITY",
                            title="Post-Click Checkout Funnel Leak",
                            description=f"Ad click engagement is high (CTR: {ctr*100:.2f}%), but purchase conversion rate is 0.0%.",
                            reason="Checkout/purchase opportunity downstream.",
                            objective="Sales",
                            problem="High drop-off in checkout funnel stages",
                            root_cause="Friction during add to cart or payment steps",
                            evidence=f"CTR: {ctr*100:.2f}%, Clicks: {clicks}, Purchases: 0",
                            expected_impact="Do not change the ad. Ad delivery is optimal. Audit checkout page latency, pricing clarity, or payment options instead.",
                            confidence_score=confidence,
                            priority=priority,
                            supporting_metrics={"clicks": clicks, "purchases": purchases},
                            status="new"
                        )
                    )

            # 3. Creative fatigue alert
            if frequency > 3.0 and spend >= 50.00:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.80, urgency=0.70, spend=spend, num_conversions=purchases+leads, impressions=impressions
                )
                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="CREATIVE_FATIGUE",
                        title=f"Creative Fatigue: {camp.name}",
                        description=f"Ad frequency has reached {frequency:.2f}. Audience is saturating, leading to declining CTR and increasing cost per conversion.",
                        reason="Audience saturation.",
                        objective=camp.objective,
                        problem="Ad wearout",
                        root_cause="Repeated exposures to the same audience pool",
                        evidence=f"Frequency: {frequency:.2f}, Click-through rate: {ctr*100:.2f}%",
                        expected_impact="Rotate creative visual assets or test a new copy version to refresh audience interest.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"frequency": frequency, "ctr": ctr},
                        status="new"
                    )
                )

            # 4. Creative Opportunity Check (8.8)
            # If active ads in the campaign are fewer than 3
            ad_count = len([x for x in active_ads if x.ad_set_id in [y.id for y in camp.ad_sets] if hasattr(x, "ad_set_id")]) if hasattr(camp, "ad_sets") else 2
            if ad_count > 0 and ad_count <= 2:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.60, urgency=0.45, spend=spend
                )
                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="CREATIVE_OPPORTUNITY",
                        title="Develop additional creative variations",
                        description="Your strongest creative pattern has only 2 active variations in this campaign.",
                        reason="Mitigate future creative fatigue and CTR drops.",
                        objective=camp.objective,
                        problem=None,
                        root_cause=None,
                        evidence=f"Only {ad_count} active variations running in this campaign.",
                        expected_impact="Develop additional creative variations around the winning pattern to reduce future fatigue risk.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"active_variations": ad_count},
                        status="new"
                    )
                )

            # 5. Root-Cause Diagnosis Evaluation
            root_cause_diagnoses = await cls.evaluate_root_cause_diagnosis(
                db, camp, user_uuid, ad_account_uuid
            )
            recommendations_to_add.extend(root_cause_diagnoses)

        # 1. Fetch existing recommendations for this ad account
        existing_stmt = select(AIRecommendation).where(AIRecommendation.ad_account_id == ad_account_uuid)
        existing_res = await db.execute(existing_stmt)
        existing_recs = list(existing_res.scalars().all())
        
        existing_lookup = {}
        for r in existing_recs:
            key = (r.campaign_id, r.recommendation_type, r.root_cause)
            existing_lookup[key] = r

        # Cache campaign objectives, outcomes, and historical baselines
        from app.services.goal_engine import PerformanceGoalEngine
        campaign_info = {}
        campaign_baselines = {}
        for c_item in active_campaigns:
            pg_item = c_item.ad_sets[0].performance_goal if c_item.ad_sets else None
            prof_item = PerformanceGoalEngine.get_metric_profile(objective=c_item.objective, goal=pg_item)
            campaign_info[c_item.id] = {
                "goal": prof_item["objective"],
                "outcome": prof_item["outcome"]
            }

            # Fetch all daily metrics for this campaign to compute historical baselines
            stmt_all = (
                select(CampaignDailyMetrics)
                .where(CampaignDailyMetrics.campaign_id == c_item.id)
                .order_by(CampaignDailyMetrics.date.desc())
            )
            res_all = await db.execute(stmt_all)
            all_rows = list(res_all.scalars().all())

            today_date = date.today()

            def calc_period_stats(metric_rows):
                if not metric_rows:
                    return {"spend": 0.0, "conversions": 0, "ctr": 0.0, "cpc": 0.0, "cpa": 0.0, "cpl": 0.0, "purchases": 0, "leads": 0}
                total_spend = sum(float(r.spend or 0.0) for r in metric_rows)
                total_impr = sum(int(r.impressions or 0) for r in metric_rows)
                total_clicks = sum(int(r.clicks or 0) for r in metric_rows)
                total_leads = sum(int(r.leads or 0) for r in metric_rows)
                total_purchases = sum(int(r.purchases or 0) for r in metric_rows)
                
                ctr = total_clicks / total_impr if total_impr > 0 else 0.0
                cpc = total_spend / total_clicks if total_clicks > 0 else 0.0
                cpa = total_spend / total_purchases if total_purchases > 0 else 0.0
                cpl = total_spend / total_leads if total_leads > 0 else 0.0
                
                return {
                    "spend": total_spend,
                    "conversions": total_leads + total_purchases,
                    "ctr": ctr,
                    "cpc": cpc,
                    "cpa": cpa,
                    "cpl": cpl,
                    "purchases": total_purchases,
                    "leads": total_leads
                }

            rows_7d = [r for r in all_rows if (today_date - r.date).days <= 7]
            rows_14d = [r for r in all_rows if (today_date - r.date).days <= 14]
            rows_30d = [r for r in all_rows if (today_date - r.date).days <= 30]
            rows_90d = [r for r in all_rows if (today_date - r.date).days <= 90]

            baseline_7d = calc_period_stats(rows_7d)
            baseline_14d = calc_period_stats(rows_14d)
            baseline_30d = calc_period_stats(rows_30d)
            baseline_90d = calc_period_stats(rows_90d)
            baseline_lifetime = calc_period_stats(all_rows)

            cpa_anomaly = (baseline_7d["cpa"] - baseline_30d["cpa"]) / baseline_30d["cpa"] > 0.40 if baseline_30d["cpa"] > 0 else False
            cpl_anomaly = (baseline_7d["cpl"] - baseline_30d["cpl"]) / baseline_30d["cpl"] > 0.40 if baseline_30d["cpl"] > 0 else False
            cpc_anomaly = (baseline_7d["cpc"] - baseline_30d["cpc"]) / baseline_30d["cpc"] > 0.40 if baseline_30d["cpc"] > 0 else False
            ctr_anomaly = (baseline_7d["ctr"] - baseline_30d["ctr"]) / baseline_30d["ctr"] < -0.30 if baseline_30d["ctr"] > 0 else False

            cpc_trend = "RISING" if baseline_7d["cpc"] > baseline_14d["cpc"] > baseline_30d["cpc"] else ("FALLING" if baseline_7d["cpc"] < baseline_14d["cpc"] < baseline_30d["cpc"] else "STABLE")
            ctr_trend = "DECLINING" if baseline_7d["ctr"] < baseline_14d["ctr"] < baseline_30d["ctr"] else ("IMPROVING" if baseline_7d["ctr"] > baseline_14d["ctr"] > baseline_30d["ctr"] else "STABLE")
            cpa_trend = "RISING" if baseline_7d["cpa"] > baseline_14d["cpa"] > baseline_30d["cpa"] else ("FALLING" if baseline_7d["cpa"] < baseline_14d["cpa"] < baseline_30d["cpa"] else "STABLE")

            campaign_baselines[c_item.id] = {
                "baseline_7d": baseline_7d,
                "baseline_14d": baseline_14d,
                "baseline_30d": baseline_30d,
                "baseline_90d": baseline_90d,
                "baseline_lifetime": baseline_lifetime,
                "anomalies": {
                    "cpa_anomaly": cpa_anomaly,
                    "cpl_anomaly": cpl_anomaly,
                    "cpc_anomaly": cpc_anomaly,
                    "ctr_anomaly": ctr_anomaly
                },
                "trends": {
                    "cpc_trend": cpc_trend,
                    "ctr_trend": ctr_trend,
                    "cpa_trend": cpa_trend
                }
            }

        matched_ids = set()
        count = 0
        for rec in recommendations_to_add:
            if rec.supporting_metrics is None:
                rec.supporting_metrics = {}
                
            info = campaign_info.get(rec.campaign_id or rec.entity_id)
            if info:
                if "goal" not in rec.supporting_metrics:
                    rec.supporting_metrics["goal"] = info["goal"]
                if "outcome" not in rec.supporting_metrics:
                    rec.supporting_metrics["outcome"] = info["outcome"]

            # Set historical baseline metrics in supporting_metrics
            camp_id = rec.campaign_id or rec.entity_id
            base_data = campaign_baselines.get(camp_id)
            if base_data:
                rec.supporting_metrics.update(base_data)
                    
            if "data_period" not in rec.supporting_metrics:
                rec.supporting_metrics["data_period"] = "last_14_days" if rec.recommendation_type == "SCALING_OPPORTUNITY" else "last_7_days"
            if "comparison_period" not in rec.supporting_metrics:
                rec.supporting_metrics["comparison_period"] = "previous_14_days" if rec.recommendation_type == "SCALING_OPPORTUNITY" else "previous_7_days"
                
            # Suggested action mapping for main suggestions
            if "suggested_action" not in rec.supporting_metrics:
                action = "MONITOR"
                r_type = rec.recommendation_type.upper()
                if "SCALING" in r_type or "SCALE" in r_type:
                    action = "CONSIDER_SCALING"
                elif "CONVERSION" in r_type:
                    action = "REVIEW_FUNNEL"
                elif "CREATIVE" in r_type or "FATIGUE" in r_type:
                    action = "REVIEW_CREATIVE"
                rec.supporting_metrics["suggested_action"] = action

            # Enforce opportunity priority
            if "OPPORTUNITY" in rec.recommendation_type.upper():
                rec.priority = "opportunity"

            # Run data quality check using the recommendation's supporting metrics
            metrics = rec.supporting_metrics or {}
            verdict = DataQualityGuard.check_entity(
                impressions=int(metrics.get("impressions", 1000)),
                spend=float(metrics.get("spend", 500)),
                conversions=int(metrics.get("purchases", 0)) + int(metrics.get("leads", 0)) + int(metrics.get("conversions", 5)),
                clicks=int(metrics.get("clicks", 50)),
                days_active=int(metrics.get("days_active", 7)),
                entity_name=rec.title,
                entity_type=rec.entity_type or "entity",
            )

            if not verdict.is_sufficient:
                # Downgrade aggressive recommendations on insufficient data
                new_priority, new_type = DataQualityGuard.should_downgrade_recommendation(
                    verdict, rec.priority
                )
                rec.priority = new_priority
                rec.recommendation_type = new_type
                rec.confidence_score = min(rec.confidence_score, verdict.confidence_modifier)
                rec.evidence = (rec.evidence or "") + f" [DataQuality: {verdict.verdict} — {verdict.reason}]"
                logger.debug("Recommendation downgraded by DataQualityGuard", title=rec.title, verdict=verdict.verdict)

            # Check duplication/upsert
            key = (rec.campaign_id, rec.recommendation_type, rec.root_cause)
            if key in existing_lookup:
                old_rec = existing_lookup[key]
                old_rec.title = rec.title
                old_rec.description = rec.description
                old_rec.reason = rec.reason
                old_rec.evidence = rec.evidence
                old_rec.expected_impact = rec.expected_impact
                old_rec.confidence_score = rec.confidence_score
                old_rec.priority = rec.priority
                # Merge supporting metrics
                old_metrics = old_rec.supporting_metrics or {}
                old_metrics.update(rec.supporting_metrics or {})
                old_rec.supporting_metrics = old_metrics
                # Reactivate if it was expired
                if old_rec.status == "expired":
                    old_rec.status = "new"
                old_rec.updated_at = datetime.utcnow()
                matched_ids.add(old_rec.id)
            else:
                db.add(rec)
                count += 1

        # Expire stale recommendations
        for r in existing_recs:
            if r.id not in matched_ids and r.status in ("new", "viewed"):
                r.status = "expired"
                if r.supporting_metrics is None:
                    r.supporting_metrics = {}
                r.supporting_metrics["expired_at"] = datetime.utcnow().isoformat()
                r.updated_at = datetime.utcnow()
            
        await db.commit()
        logger.info("AI Recommendations compiled (with lifecycle updates)", count=count)
        return count


    @classmethod
    async def evaluate_root_cause_diagnosis(
        cls, db: AsyncSession, camp: Campaign, user_uuid: uuid.UUID, ad_account_uuid: uuid.UUID
    ) -> list:
        """
        Decomposes campaign performance trends to isolate the root cause behind metric changes
        by comparing the current 7 days with the previous 7 days.
        """
        diagnoses = []
        today = date.today()
        current_start = today - timedelta(days=7)
        prev_start = today - timedelta(days=14)

        from app.services.metric_engine import MetricEngine

        # Fetch Current Period Metrics
        stmt_curr_rows = (
            select(CampaignDailyMetrics)
            .where(CampaignDailyMetrics.campaign_id == camp.id)
            .where(CampaignDailyMetrics.date >= current_start)
        )
        res_curr_rows = await db.execute(stmt_curr_rows)
        curr_rows = res_curr_rows.scalars().all()

        # Fetch Previous Period Metrics
        stmt_prev_rows = (
            select(CampaignDailyMetrics)
            .where(CampaignDailyMetrics.campaign_id == camp.id)
            .where(CampaignDailyMetrics.date >= prev_start)
            .where(CampaignDailyMetrics.date < current_start)
        )
        res_prev_rows = await db.execute(stmt_prev_rows)
        prev_rows = res_prev_rows.scalars().all()

        def aggregate_rows(rows) -> dict:
            out = {
                "spend": 0.0,
                "impressions": 0,
                "clicks": 0,
                "link_clicks": 0,
                "leads": 0,
                "purchases": 0,
                "revenue": 0.0,
                "frequency": 1.0,
                "reach": 0,
                "calls": 0,
                "conversations": 0,
                "thruplays": 0,
                "video_views": 0,
                "video_play_2": 0
            }
            freqs = []
            for r in rows:
                out["spend"] += float(r.spend or 0.0)
                out["impressions"] += int(r.impressions or 0)
                out["clicks"] += int(r.clicks or 0)
                out["link_clicks"] += int(r.link_clicks or 0)
                out["leads"] += int(r.leads or 0)
                out["purchases"] += int(r.purchases or 0)
                out["revenue"] += float(r.revenue or 0.0)
                out["reach"] += int(r.reach or 0)
                if r.frequency:
                    freqs.append(float(r.frequency))
                if r.actions:
                    out["calls"] += int(r.actions.get("calls") or 0)
                    out["conversations"] += int(r.actions.get("conversations") or 0)
                    out["thruplays"] += int(r.actions.get("thruplays") or 0)
                    out["video_views"] += int(r.actions.get("video_views") or 0)
                    out["video_play_2"] += int(r.actions.get("video_play_2") or 0)
            if freqs:
                out["frequency"] = sum(freqs) / len(freqs)
            return out

        curr = aggregate_rows(curr_rows)
        prev = aggregate_rows(prev_rows)

        # Derived calculations via MetricEngine
        c_derived = MetricEngine.calculate_derived_metrics(curr)
        p_derived = MetricEngine.calculate_derived_metrics(prev)

        c_spend = curr["spend"]
        
        # Determine Goal and Outcome of the Campaign via PerformanceGoalEngine (SSOT)
        from app.services.goal_engine import PerformanceGoalEngine
        
        pg = "conversions"
        if camp.ad_sets:
            pg = camp.ad_sets[0].performance_goal or "conversions"
        else:
            # Fallback to objective parsing
            obj = (camp.objective or "").upper()
            if "LEAD" in obj:
                pg = "leads"
            elif "SALES" in obj or "CONVERSIONS" in obj:
                pg = "purchases"
            elif "MESSAGING" in obj or "CONVERSATION" in obj or "ENGAGEMENT" in obj:
                pg = "conversations"

        profile = PerformanceGoalEngine.get_metric_profile(objective=camp.objective, goal=pg)
        outcome = profile.get("outcome")
        goal_val = profile.get("objective")
        primary_metric = profile.get("primary")[0] if profile.get("primary") else "purchases"

        # Determine if it's messaging/conversation goal
        is_messaging_goal = outcome in ("messenger", "instagram_messages", "whatsapp")
        
        # Determine performance goal mapped key
        perf_goal = "conversions"
        if outcome in ("website_purchases", "catalogue_sales"):
            perf_goal = "purchases"
        elif outcome in ("website_leads", "instant_forms"):
            perf_goal = "leads"
        elif outcome in ("calls", "calls_lead"):
            perf_goal = "calls"
        elif is_messaging_goal:
            perf_goal = "conversations"
        elif outcome in ("video_views", "video_engagement"):
            perf_goal = "video_views"
        
        # Calculate objective-specific primary conversion count (Generic conversions count removed)
        c_conversions = 0
        if primary_metric == "link_clicks":
            c_conversions = int(curr.get("link_clicks") or 0)
        elif primary_metric == "reach":
            c_conversions = int(curr.get("reach") or 0)
        else:
            c_conversions = int(curr.get(primary_metric) or 0)

        # Skip evaluation if primary metric is not available/applicable or requires CRM
        statuses = profile.get("metric_statuses", {})
        if statuses.get(primary_metric) in ("CRM_REQUIRED", "UNAVAILABLE", "NOT_APPLICABLE"):
            return diagnoses

        # ──────────────────────────────────────────
        # 8.1 Don't Change Engine: Insufficient Data / Learning Period Check
        # ──────────────────────────────────────────
        if c_spend < 500.00 or c_conversions < 3:
            priority, confidence = cls.calculate_priority_and_confidence(
                impact=0.30, urgency=0.20, spend=c_spend, num_conversions=c_conversions
            )
            diagnoses.append(
                AIRecommendation(
                    user_id=user_uuid,
                    ad_account_id=ad_account_uuid,
                    entity_type="campaign",
                    entity_id=camp.id,
                    campaign_id=camp.id,
                    recommendation_type="DONT_CHANGE",
                    title="Don't Change: Insufficient Delivery Data",
                    description=f"This campaign has spent only ₹{c_spend:.2f} and generated {c_conversions} conversions in the last 7 days.",
                    reason="Insufficient data volume to yield stable statistical diagnosis. Continue collecting delivery logs.",
                    objective=camp.objective,
                    problem="Insufficient data for optimization",
                    root_cause="Campaign in early learning phase or low daily budget pacing",
                    evidence=f"Spend ₹{c_spend:.2f} is under baseline ₹500 threshold.",
                    expected_impact="Don't intervene yet. Changing parameters now will reset Meta learning phases unnecessarily.",
                    confidence_score=confidence,
                    priority=priority,
                    supporting_metrics={"spend": c_spend, "conversions": c_conversions},
                    status="new"
                )
            )
            return diagnoses

        # Calculate rate changes ratios
        def pct_change(c_val, p_val) -> float:
            if p_val is None or p_val == 0:
                return 0.0
            if c_val is None:
                return -1.0
            return (float(c_val) - float(p_val)) / float(p_val)

        cpm_change = pct_change(c_derived.get("cpm"), p_derived.get("cpm"))
        ctr_change = pct_change(c_derived.get("ctr"), p_derived.get("ctr"))
        cpc_change = pct_change(c_derived.get("cpc"), p_derived.get("cpc"))
        freq_change = pct_change(curr["frequency"], prev["frequency"])

        # ──────────────────────────────────────────
        # 8.2 Temporary Fluctuation Safeguard
        # ──────────────────────────────────────────
        c_kpi_change = 0.0
        if perf_goal == "leads":
            c_kpi_change = pct_change(c_derived.get("cpl"), p_derived.get("cpl"))
        elif perf_goal == "calls":
            c_kpi_change = pct_change(c_derived.get("cost_per_call"), p_derived.get("cost_per_call"))
        elif perf_goal == "conversations":
            c_kpi_change = pct_change(c_derived.get("cost_per_conversation"), p_derived.get("cost_per_conversation"))
        elif perf_goal in ("thruplay", "video_views"):
            c_kpi_change = pct_change(c_derived.get("cost_per_thruplay"), p_derived.get("cost_per_thruplay"))
        elif perf_goal in ("purchases", "value", "conversions"):
            c_kpi_change = pct_change(c_derived.get("cpa"), p_derived.get("cpa"))

        if 0.10 < c_kpi_change < 0.20:
            priority, confidence = cls.calculate_priority_and_confidence(
                impact=0.40, urgency=0.30, spend=c_spend, num_conversions=c_conversions
            )
            diagnoses.append(
                AIRecommendation(
                    user_id=user_uuid,
                    ad_account_id=ad_account_uuid,
                    entity_type="campaign",
                    entity_id=camp.id,
                    campaign_id=camp.id,
                    recommendation_type="DONT_CHANGE",
                    title="Don't Change: Temporary Performance Fluctuation",
                    description=(
                        f"Although cost per result increased {c_kpi_change*100:.1f}% recently on Campaign: {camp.name}, "
                        f"the 7-day historical performance remains stable and conversion volume is normal."
                    ),
                    reason="Temporary fluctuation within expected statistical boundaries.",
                    objective=camp.objective,
                    problem="Temporary increase in CPA/CPL/Cost-per-result",
                    root_cause="Short-term auction volatility",
                    evidence=f"Cost change is {c_kpi_change*100:.1f}% but 7-day averages are consistent.",
                    expected_impact="Don't intervene yet. Changing targeting parameters now will reset Meta learning phases unnecessarily.",
                    confidence_score=0.84,
                    priority="low",
                    supporting_metrics={"change": c_kpi_change},
                    status="new"
                )
            )

        # ──────────────────────────────────────────
        # CPM Diagnosis (Auction Pressure vs Saturation Fatigue)
        # ──────────────────────────────────────────
        if cpm_change > 0.15:
            if freq_change > 0.15 and ctr_change < -0.10:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.85, urgency=0.75, spend=c_spend, num_conversions=c_conversions
                )
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="CREATIVE_FATIGUE",
                        title=f"CPM Surge - Audience Saturation: {camp.name}",
                        description=f"CPM increased by {cpm_change*100:.1f}% over the last 7 days. This is caused by audience saturation and creative fatigue, as frequency has increased and click engagement (CTR) has declined.",
                        reason="Evidence: Frequency increased, CTR decreased, CPM increased across placements.",
                        objective=camp.objective,
                        problem="Auction CPM surge",
                        root_cause="Audience saturation causing visual fatigue",
                        evidence=f"CPM rose {cpm_change*100:.1f}%, frequency rose {freq_change*100:.1f}%, CTR fell {ctr_change*100:.1f}%.",
                        expected_impact="Rotating creative assets immediately will refresh audience interest and recover CTR, lowering CPM.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"cpm_change": cpm_change, "freq_change": freq_change, "ctr_change": ctr_change},
                        status="new"
                    )
                )
            elif ctr_change >= -0.05 and cpc_change > 0.10:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.70, urgency=0.60, spend=c_spend, num_conversions=c_conversions
                )
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="HIGH_CPM",
                        title=f"CPM Surge - Auction Pressure: {camp.name}",
                        description=f"CPM increased by {cpm_change*100:.1f}% over the last 7 days. However, CTR remains stable, indicating that auction competition has increased.",
                        reason="Evidence: Frequency stable, CTR stable, CPM increased. Bidding pressure is systemic.",
                        objective=camp.objective,
                        problem="Auction CPM surge",
                        root_cause="Increased auction bid competition in target segment",
                        evidence=f"CPM rose {cpm_change*100:.1f}%, CTR change: {ctr_change*100:.1f}% (stable).",
                        expected_impact="Broaden targeting parameter scope or add placement channels to escape bidding congestion.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"cpm_change": cpm_change, "ctr_change": ctr_change},
                        status="new"
                    )
                )

        # ──────────────────────────────────────────
        # CTR Diagnosis (Creative Fatigue vs Message Mismatch)
        # ──────────────────────────────────────────
        if ctr_change < -0.15:
            if curr["frequency"] > 2.8 and cpc_change > 0.10:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.85, urgency=0.75, spend=c_spend, num_conversions=c_conversions
                )
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="CREATIVE_FATIGUE",
                        title=f"CTR Drop - Creative Fatigue: {camp.name}",
                        description=f"CTR decreased by {abs(ctr_change)*100:.1f}%. Frequency has risen to {curr['frequency']:.2f} while CPM remains stable, confirming fatigue.",
                        reason=f"Evidence: Frequency increased {prev['frequency']:.1f} -> {curr['frequency']:.1f}, CTR decreased, CPM stable, CPC increased {cpc_change*100:.1f}%.",
                        objective=camp.objective,
                        problem="Ad click engagement drop",
                        root_cause="Visual wearout of main creatives",
                        evidence=f"CTR fell {abs(ctr_change)*100:.1f}%, Frequency rose to {curr['frequency']:.2f}.",
                        expected_impact="Rotate creative variations to restore audience click engagement.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"ctr_change": ctr_change, "frequency": curr["frequency"], "cpc_change": cpc_change},
                        status="new"
                    )
                )

        # ──────────────────────────────────────────
        # CPC Diagnosis (Creative Lag vs Bidding Spikes)
        # ──────────────────────────────────────────
        if cpc_change > 0.15:
            if ctr_change < -0.10 and abs(cpm_change) < 0.10:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.75, urgency=0.65, spend=c_spend, num_conversions=c_conversions
                )
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="HIGH_CPC",
                        title=f"CPC Surge - Creative Lag: {camp.name}",
                        description=f"CPC increased by {cpc_change*100:.1f}% primarily because click engagement (CTR) fell by {abs(ctr_change)*100:.1f}% while auction cost remained stable.",
                        reason="Evidence: CPC increased, CTR decreased, CPM stable.",
                        objective=camp.objective,
                        problem="Rising click cost",
                        root_cause="Decline in ad click relevance CTR",
                        evidence=f"CPC rose {cpc_change*100:.1f}%, CTR fell {abs(ctr_change)*100:.1f}%, CPM change is stable.",
                        expected_impact="Refining copy message will improve CTR, lowering CPC.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"cpc_change": cpc_change, "ctr_change": ctr_change, "cpm_change": cpm_change},
                        status="new"
                    )
                )
            elif ctr_change >= -0.05 and cpm_change > 0.10:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.70, urgency=0.60, spend=c_spend, num_conversions=c_conversions
                )
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="HIGH_CPC",
                        title=f"CPC Surge - Auction Pressure: {camp.name}",
                        description=f"CPC increased by {cpc_change*100:.1f}% because CPM rose by {cpm_change*100:.1f}% despite stable CTR.",
                        reason="Evidence: CPC increased, CTR stable, CPM increased.",
                        objective=camp.objective,
                        problem="Rising click cost",
                        root_cause="Bidding competition pressure raising CPM costs",
                        evidence=f"CPC rose {cpc_change*100:.1f}%, CPM rose {cpm_change*100:.1f}%, CTR was stable.",
                        expected_impact="Broaden targeting to include additional placement options.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"cpc_change": cpc_change, "cpm_change": cpm_change, "ctr_change": ctr_change},
                        status="new"
                    )
                )

        # ──────────────────────────────────────────
        # Goal-Aware Efficiency Diagnostics (Phases 8 & 9)
        # ──────────────────────────────────────────
        if perf_goal == "leads":
            cpl_change = pct_change(c_derived.get("cpl"), p_derived.get("cpl"))
            if cpl_change > 0.15:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.85, urgency=0.75, spend=c_spend, num_conversions=curr["leads"]
                )
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="HIGH_CPL",
                        title=f"CPL Surge: {camp.name}",
                        description=f"Cost per Lead rose by {cpl_change*100:.1f}% on your Leads campaign. CPC rose {cpc_change*100:.1f}% due to lower ad relevance.",
                        reason="Leads campaign cost metrics exceeded previous historical baselines.",
                        objective=camp.objective,
                        problem="High CPL cost",
                        root_cause="Visual creative fatigue or landing page conversion rate dropoff",
                        evidence=f"CPL increased {cpl_change*100:.1f}% vs last week.",
                        expected_impact="Test new visual cards to lower average CPL.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"cpl_change": cpl_change},
                        status="new"
                    )
                )

            # Landing Page Problem rule (Section 6)
            if outcome in ("website_leads", "website_purchases"):
                link_ctr = c_derived.get("ctr") or 0.0
                lpv_rate = c_derived.get("lpv_rate") or 0.0
                lp_to_lead_cvr = c_derived.get("landing_page_to_lead_conversion_rate") or 0.0
                
                # If CTR is healthy (e.g. >= 1%), LPV Rate is healthy (e.g. >= 70%), and LP -> Lead CVR is poor (e.g. < 5%)
                if link_ctr >= 0.01 and lpv_rate >= 70.0 and 0.0 < lp_to_lead_cvr < 5.0:
                    priority, confidence = cls.calculate_priority_and_confidence(
                        impact=0.80, urgency=0.70, spend=c_spend, num_conversions=c_conversions
                    )
                    diagnoses.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            campaign_id=camp.id,
                            recommendation_type="LANDING_PAGE_OPTIMIZATION",
                            title=f"Review Landing Page Funnel: {camp.name}",
                            description="CTR and LPV rates are healthy, but conversion rate from landing page to result is low.",
                            reason="Click-through parameters indicate strong creative interest, but landing page experience fails to convert traffic.",
                            objective=camp.objective,
                            problem="Landing page conversion bottleneck",
                            root_cause="User experience friction or message mismatch on landing page",
                            evidence=f"CTR: {link_ctr*100:.2f}%, LPV Rate: {lpv_rate:.2f}%, LP CVR: {lp_to_lead_cvr:.2f}%.",
                            expected_impact="Optimizing page speed, copy clarity, or CTA placement will boost conversion rates and lower CPL/CPA.",
                            confidence_score=confidence,
                            priority=priority,
                            supporting_metrics={"ctr": link_ctr, "lpv_rate": lpv_rate, "lp_cvr": lp_to_lead_cvr},
                            status="new"
                        )
                    )
        elif perf_goal == "calls":
            cpc_call_change = pct_change(c_derived.get("cost_per_call"), p_derived.get("cost_per_call"))
            if cpc_call_change > 0.15:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.85, urgency=0.75, spend=c_spend, num_conversions=curr["calls"]
                )
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="HIGH_CPL",
                        title=f"Cost per Call Surge: {camp.name}",
                        description=f"Cost per Call rose by {cpc_call_change*100:.1f}% on your Phone Calls campaign.",
                        reason="Phone optimization cost metrics exceeded previous historical baselines.",
                        objective=camp.objective,
                        problem="High Cost per Call cost",
                        root_cause="Ad relevance drop or call schedule friction",
                        evidence=f"Cost per call rose {cpc_call_change*100:.1f}% vs last week.",
                        expected_impact="Ensure call-to-action hooks match active business hours to prevent drop-off.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"cost_per_call_change": cpc_call_change},
                        status="new"
                    )
                )
        elif perf_goal in ("thruplay", "video_views"):
            cpt_change = pct_change(c_derived.get("cost_per_thruplay"), p_derived.get("cost_per_thruplay"))
            if cpt_change > 0.15:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.80, urgency=0.70, spend=c_spend, num_conversions=curr["thruplays"]
                )
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="HIGH_CPA",
                        title=f"Cost per ThruPlay Surge: {camp.name}",
                        description=f"Cost per ThruPlay rose by {cpt_change*100:.1f}% on your Video views campaign.",
                        reason="Video views optimization cost metrics exceeded previous historical baselines.",
                        objective=camp.objective,
                        problem="High Cost per ThruPlay",
                        root_cause="First 3-seconds hook fatigue causing viewers to skip early",
                        evidence=f"Cost per thruplay rose {cpt_change*100:.1f}% vs last week.",
                        expected_impact="Refresh the video hook (first 3 seconds) to improve retention rates.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"cost_per_thruplay_change": cpt_change},
                        status="new"
                    )
                )
        elif is_messaging_goal or perf_goal == "conversations":
            cpc_conv_change = pct_change(c_derived.get("cost_per_conversation"), p_derived.get("cost_per_conversation"))
            conv_change = pct_change(curr.get("conversations"), prev.get("conversations"))
            
            # Diagnostic Rule 5: Messaging Performance Drop (Conversations fell by >= 15% AND Cost per Conversation rose by >= 15% AND CTR fell by >= 10%)
            if conv_change <= -0.15 and cpc_conv_change >= 0.15 and ctr_change <= -0.10:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.90, urgency=0.85, spend=c_spend, num_conversions=curr.get("conversations", 0)
                )
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="MESSAGING_PERFORMANCE_DECLINE",
                        title=f"Messaging Performance Declining: {camp.name}",
                        description=f"Conversations fell by {abs(conv_change)*100:.1f}%, cost per conversation increased by {cpc_conv_change*100:.1f}%, and CTR decreased by {abs(ctr_change)*100:.1f}%.",
                        reason="Evidence: Conversations dropped, Cost/Conversation rose, and CTR decreased due to high creative/audience fatigue.",
                        objective=camp.objective,
                        problem="Messaging performance drop",
                        root_cause="Audience fatigue or sub-relevance click drop-offs",
                        evidence=f"Conversations: {prev.get('conversations')} → {curr.get('conversations')} ({conv_change*100:.1f}%), Cost/Conv: ₹{p_derived.get('cost_per_conversation') or 0.0:.2f} → ₹{c_derived.get('cost_per_conversation') or 0.0:.2f} (+{cpc_conv_change*100:.1f}%), CTR: {p_derived.get('ctr')*100:.2f}% → {c_derived.get('ctr')*100:.2f}% ({ctr_change*100:.1f}%)",
                        expected_impact="Refresh visual hooks or expand target demographics to capture fresh intent.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={
                            "conversations_change": conv_change,
                            "cost_per_conversation_change": cpc_conv_change,
                            "ctr_change": ctr_change
                        },
                        status="new"
                    )
                )
        elif perf_goal in ("purchases", "value", "conversions"):
            cpa_change = pct_change(c_derived.get("cpa"), p_derived.get("cpa"))
            if cpa_change > 0.15:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.85, urgency=0.75, spend=c_spend, num_conversions=curr["purchases"]
                )
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        campaign_id=camp.id,
                        recommendation_type="HIGH_CPA",
                        title=f"CPA Surge - Checkout Funnel Issue: {camp.name}",
                        description=f"Cost per Purchase rose by {cpa_change*100:.1f}% on your Sales/Conversions campaign.",
                        reason="Sales optimization cost metrics exceeded previous historical baselines.",
                        objective=camp.objective,
                        problem="Rising CPA",
                        root_cause="Checkout drop-off or pricing friction",
                        evidence=f"CPA rose {cpa_change*100:.1f}% vs last week.",
                        expected_impact="Audit landing page checkouts to recover basket values.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"cpa_change": cpa_change},
                        status="new"
                    )
                )

        # Fetch historical daily metrics for baseline computation
        stmt_all = (
            select(CampaignDailyMetrics)
            .where(CampaignDailyMetrics.campaign_id == camp.id)
            .order_by(CampaignDailyMetrics.date.desc())
        )
        res_all = await db.execute(stmt_all)
        all_rows = list(res_all.scalars().all())

        today_date = date.today()

        def calc_period_stats(metric_rows):
            if not metric_rows:
                return {"spend": 0.0, "conversions": 0, "ctr": 0.0, "cpc": 0.0, "cpa": 0.0, "cpl": 0.0, "purchases": 0, "leads": 0}
            total_spend = sum(float(r.spend or 0.0) for r in metric_rows)
            total_impr = sum(int(r.impressions or 0) for r in metric_rows)
            total_clicks = sum(int(r.clicks or 0) for r in metric_rows)
            total_leads = sum(int(r.leads or 0) for r in metric_rows)
            total_purchases = sum(int(r.purchases or 0) for r in metric_rows)
            
            ctr = total_clicks / total_impr if total_impr > 0 else 0.0
            cpc = total_spend / total_clicks if total_clicks > 0 else 0.0
            cpa = total_spend / total_purchases if total_purchases > 0 else 0.0
            cpl = total_spend / total_leads if total_leads > 0 else 0.0
            
            return {
                "spend": total_spend,
                "conversions": total_leads + total_purchases,
                "ctr": ctr,
                "cpc": cpc,
                "cpa": cpa,
                "cpl": cpl,
                "purchases": total_purchases,
                "leads": total_leads
            }

        # Calculate stats per period
        rows_7d = [r for r in all_rows if (today_date - r.date).days <= 7]
        rows_14d = [r for r in all_rows if (today_date - r.date).days <= 14]
        rows_30d = [r for r in all_rows if (today_date - r.date).days <= 30]
        rows_90d = [r for r in all_rows if (today_date - r.date).days <= 90]

        baseline_7d = calc_period_stats(rows_7d)
        baseline_14d = calc_period_stats(rows_14d)
        baseline_30d = calc_period_stats(rows_30d)
        baseline_90d = calc_period_stats(rows_90d)
        baseline_lifetime = calc_period_stats(all_rows)

        # Calculate anomalies relative to 30d baseline
        cpa_anomaly = (baseline_7d["cpa"] - baseline_30d["cpa"]) / baseline_30d["cpa"] > 0.40 if baseline_30d["cpa"] > 0 else False
        cpl_anomaly = (baseline_7d["cpl"] - baseline_30d["cpl"]) / baseline_30d["cpl"] > 0.40 if baseline_30d["cpl"] > 0 else False
        cpc_anomaly = (baseline_7d["cpc"] - baseline_30d["cpc"]) / baseline_30d["cpc"] > 0.40 if baseline_30d["cpc"] > 0 else False
        ctr_anomaly = (baseline_7d["ctr"] - baseline_30d["ctr"]) / baseline_30d["ctr"] < -0.30 if baseline_30d["ctr"] > 0 else False

        # Calculate trend persistence
        cpc_trend = "RISING" if baseline_7d["cpc"] > baseline_14d["cpc"] > baseline_30d["cpc"] else ("FALLING" if baseline_7d["cpc"] < baseline_14d["cpc"] < baseline_30d["cpc"] else "STABLE")
        ctr_trend = "DECLINING" if baseline_7d["ctr"] < baseline_14d["ctr"] < baseline_30d["ctr"] else ("IMPROVING" if baseline_7d["ctr"] > baseline_14d["ctr"] > baseline_30d["ctr"] else "STABLE")
        cpa_trend = "RISING" if baseline_7d["cpa"] > baseline_14d["cpa"] > baseline_30d["cpa"] else ("FALLING" if baseline_7d["cpa"] < baseline_14d["cpa"] < baseline_30d["cpa"] else "STABLE")

        # Post-process diagnoses list to enforce Phase 3/5 attributes
        for rec in diagnoses:
            if rec.supporting_metrics is None:
                rec.supporting_metrics = {}
            rec.supporting_metrics["goal"] = goal_val
            rec.supporting_metrics["outcome"] = outcome
            rec.supporting_metrics["data_period"] = "last_7_days"
            rec.supporting_metrics["comparison_period"] = "previous_7_days"
            
            # Phase 5 properties
            rec.supporting_metrics["baseline_7d"] = baseline_7d
            rec.supporting_metrics["baseline_14d"] = baseline_14d
            rec.supporting_metrics["baseline_30d"] = baseline_30d
            rec.supporting_metrics["baseline_90d"] = baseline_90d
            rec.supporting_metrics["baseline_lifetime"] = baseline_lifetime
            rec.supporting_metrics["anomalies"] = {
                "cpa_anomaly": cpa_anomaly,
                "cpl_anomaly": cpl_anomaly,
                "cpc_anomaly": cpc_anomaly,
                "ctr_anomaly": ctr_anomaly
            }
            rec.supporting_metrics["trends"] = {
                "cpc_trend": cpc_trend,
                "ctr_trend": ctr_trend,
                "cpa_trend": cpa_trend
            }
            
            # Map suggested action
            action = "MONITOR"
            r_type = rec.recommendation_type.upper()
            if "CREATIVE" in r_type or "FATIGUE" in r_type:
                action = "REVIEW_CREATIVE"
            elif "LANDING" in r_type:
                action = "REVIEW_LANDING_PAGE"
            elif "CPM" in r_type:
                action = "REVIEW_PLACEMENTS"
            elif "CPC" in r_type:
                action = "REVIEW_CPC"
            elif "DONT_CHANGE" in r_type:
                action = "KEEP_RUNNING"
            elif "DECLINE" in r_type:
                action = "REVIEW_CREATIVE"
            elif "CPA" in r_type or "CPL" in r_type:
                action = "REVIEW_FUNNEL"
                
            rec.supporting_metrics["suggested_action"] = action
            
            # Assign expected impact if not set or generic
            if not rec.expected_impact or rec.expected_impact == rec.description:
                if "CREATIVE" in r_type or "FATIGUE" in r_type:
                    rec.expected_impact = "Potential to restore CTR and lower CPL/CPA by rotating fresh visual variations."
                elif "LANDING" in r_type:
                    rec.expected_impact = "Expected to improve click-to-lead conversion rate and reduce lead acquisition cost."
                elif "BUDGET" in r_type or "SCALE" in r_type:
                    rec.expected_impact = "Potential to increase total conversion volume while maintaining efficiency margins."
                else:
                    rec.expected_impact = "Review and monitor parameters to stabilize performance margins."

        return diagnoses
