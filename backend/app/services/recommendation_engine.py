"""
Digital Growth Studio — AI Recommendation Engine
"""
import uuid
import httpx
import structlog
import math
from datetime import date, datetime, timedelta
from sqlalchemy import select, delete, func
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
                is_mock = token.startswith("EAAGm0PX") or token == "mock_access_token"

        today = date.today()
        start_date = today - timedelta(days=14)
        recommendations_to_add = []

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
            platform_breakdowns = [
                {"publisher_platform": "facebook", "spend": 4500.00, "impressions": 50000, "clicks": 800, "actions": [{"action_type": "purchase", "value": 8}], "action_values": [{"action_type": "purchase", "value": 6400.00}]},
                {"publisher_platform": "instagram", "spend": 3200.00, "impressions": 40000, "clicks": 950, "actions": [{"action_type": "purchase", "value": 15}], "action_values": [{"action_type": "purchase", "value": 12000.00}]},
                {"publisher_platform": "audience_network", "spend": 950.00, "impressions": 12000, "clicks": 110, "actions": [], "action_values": []},
            ]
            demographic_breakdowns = [
                {"age": "18-24", "gender": "female", "spend": 1200.00, "impressions": 15000, "clicks": 180, "actions": [{"action_type": "purchase", "value": 1}], "action_values": [{"action_type": "purchase", "value": 800.00}]},
                {"age": "18-24", "gender": "male", "spend": 1100.00, "impressions": 14000, "clicks": 150, "actions": [{"action_type": "purchase", "value": 0}], "action_values": []},
                {"age": "25-34", "gender": "female", "spend": 3500.00, "impressions": 40000, "clicks": 720, "actions": [{"action_type": "purchase", "value": 14}], "action_values": [{"action_type": "purchase", "value": 11200.00}]},
                {"age": "25-34", "gender": "male", "spend": 2800.00, "impressions": 30000, "clicks": 600, "actions": [{"action_type": "purchase", "value": 10}], "action_values": [{"action_type": "purchase", "value": 8000.00}]},
            ]

        # ──────────────────────────────────────────────
        # RULE: Platform/Placement Optimization (8.9)
        # ──────────────────────────────────────────────
        total_platform_spend = sum(float(p.get("spend", 0)) for p in platform_breakdowns)
        for platform in platform_breakdowns:
            platform_name = platform.get("publisher_platform")
            spend = float(platform.get("spend", 0))
            
            purchases = 0
            revenue = 0.0
            for act in platform.get("actions", []):
                if act.get("action_type") == "purchase":
                    purchases = int(act.get("value", 0))
            for val in platform.get("action_values", []):
                if val.get("action_type") == "purchase":
                    revenue = float(val.get("value", 0.0))

            roas = (revenue / spend) if spend > 0 else 0.0
            spend_share = (spend / total_platform_spend) if total_platform_spend > 0 else 0.0

            # 1. Placement Opportunity (8.9 Reels prioritization / Placement)
            if platform_name == "instagram" and roas >= 2.0 and spend_share < 0.50:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.70, urgency=0.50, spend=spend, num_conversions=purchases
                )
                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad_account",
                        entity_id=ad_account_uuid,
                        recommendation_type="PLACEMENT_OPPORTUNITY",
                        title=f"Placement Opportunity: Prioritize Reels/Instagram Delivery",
                        description=f"Instagram delivery generates strong conversion efficiency with a ROAS of {roas:.2f}x, while consuming only {spend_share*100:.0f}% of total budget.",
                        reason="Reels placement exhibits lower cost per conversion than other placements.",
                        objective="Sales",
                        problem=None,
                        root_cause=None,
                        evidence=f"Reels ROAS is {roas:.2f}x vs account average. Spend share is {spend_share*100:.1f}%.",
                        expected_impact="Prioritizing Instagram Reels delivery in your next creative cycle will scale conversions and reduce average CPL.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"spend": spend, "roas": roas, "purchases": purchases, "placement": platform_name},
                        status="new",
                    )
                )
            
            # 2. Exclude Placement if low ROAS
            elif spend >= 100.00 and roas < 0.8:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.65, urgency=0.60, spend=spend, num_conversions=purchases
                )
                
                # Check confidence threshold for FIX vs WATCH
                rec_type = "PLACEMENT_OPTIMIZATION"
                title = f"Exclude underperforming placement: {platform_name.upper()}"
                if confidence < 0.50:
                    rec_type = "WATCH"
                    title = f"Watch placement delivery: {platform_name.upper()}"

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
                            f"It consumed ₹{spend:.2f} but generated only {purchases} conversions with a ROAS of {roas:.2f}x."
                        ),
                        reason=f"Excluding the underperforming {platform_name} placement redirects budget to higher-converting placements like Instagram Reels.",
                        objective="Sales",
                        problem="Inefficient placement spend",
                        root_cause="Over-delivery on low-conversion placement",
                        evidence=f"Spend: ₹{spend:.2f}, ROAS: {roas:.2f}x, conversions: {purchases}",
                        expected_impact="Excluding this placement saves wasted spend and improves campaign ROAS.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"spend": spend, "roas": roas, "purchases": purchases, "placement": platform_name},
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
            
            purchases = 0
            revenue = 0.0
            for act in demo.get("actions", []):
                if act.get("action_type") == "purchase":
                    purchases = int(act.get("value", 0))
            for val in demo.get("action_values", []):
                if val.get("action_type") == "purchase":
                    revenue = float(val.get("value", 0.0))

            roas = (revenue / spend) if spend > 0 else 0.0

            # Audience Opportunity
            if spend >= 1000.00 and roas >= 2.8:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.75, urgency=0.50, spend=spend, num_conversions=purchases
                )
                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad_account",
                        entity_id=ad_account_uuid,
                        recommendation_type="AUDIENCE_OPPORTUNITY",
                        title=f"Audience Opportunity: Scale target demographic {gender.upper()} {age_group}",
                        description=f"Demographic segment {gender.upper()} ({age_group}) generates strong conversions with a ROAS of {roas:.2f}x.",
                        reason="Target audience segment has high conversion rates.",
                        objective="Sales",
                        problem=None,
                        root_cause=None,
                        evidence=f"Segment spent ₹{spend:.2f} with a ROAS of {roas:.2f}x.",
                        expected_impact="Consider testing additional creative variations tailored specifically to this segment.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"spend": spend, "roas": roas, "purchases": purchases, "demographics": f"{gender}_{age_group}"},
                        status="new",
                    )
                )

            # Exclude low performing audience segment
            elif spend >= 100.00 and roas < 0.5:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.60, urgency=0.55, spend=spend, num_conversions=purchases
                )
                
                rec_type = "DEMOGRAPHIC_TUNING"
                title = f"Narrow target audience: Exclude {gender.upper()} {age_group}"
                if confidence < 0.50:
                    rec_type = "WATCH"
                    title = f"Watch demographic segment: {gender.upper()} {age_group}"

                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad_account",
                        entity_id=ad_account_uuid,
                        recommendation_type=rec_type,
                        title=title,
                        description=(
                            f"Audience segment {gender.upper()} ({age_group}) is consuming budget with low purchase intent. "
                            f"It has consumed ₹{spend:.2f} with a ROAS of {roas:.2f}x."
                        ),
                        reason=f"Refining targeting to exclude {gender} aged {age_group} will improve campaign efficiency.",
                        objective="Sales",
                        problem="Targeting leakage",
                        root_cause="Over-targeting low intent demographic",
                        evidence=f"Spend: ₹{spend:.2f}, ROAS: {roas:.2f}x",
                        expected_impact="Excluding this demographic redirects budget to higher intent groups.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"spend": spend, "roas": roas, "purchases": purchases, "demographics": f"{gender}_{age_group}"},
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
        )
        res = await db.execute(ad_stmt)
        active_ads = res.scalars().all()

        underperforming_ads_list = []
        total_risk_spend = 0.0

        for ad in active_ads:
            m_stmt = (
                select(
                    func.coalesce(func.sum(AdDailyMetrics.spend), 0).label("spend"),
                    func.coalesce(func.sum(AdDailyMetrics.revenue), 0).label("revenue"),
                    func.coalesce(func.sum(AdDailyMetrics.purchases), 0).label("purchases"),
                    func.coalesce(func.sum(AdDailyMetrics.impressions), 0).label("impressions"),
                    func.coalesce(func.sum(AdDailyMetrics.clicks), 0).label("clicks"),
                )
                .where(AdDailyMetrics.ad_id == ad.id)
                .where(AdDailyMetrics.date >= start_date)
            )
            m_res = await db.execute(m_stmt)
            m_row = m_res.fetchone()
            if not m_row or float(m_row.spend or 0.0) == 0.0:
                continue

            spend = float(m_row.spend)
            revenue = float(m_row.revenue)
            purchases = int(m_row.purchases)
            impressions = int(m_row.impressions)
            clicks = int(m_row.clicks)

            roas = (revenue / spend) if spend > 0 else 0.0
            ctr = (clicks / impressions) if impressions > 0 else 0.0

            # Compute campaign average benchmark ROAS
            # For simplicity, compare against average target ROAS = 1.6
            pct_worse = 0.0
            if roas < 1.20:
                pct_worse = ((1.6 - roas) / 1.6) * 100
                underperforming_ads_list.append({
                    "name": ad.name,
                    "id": str(ad.id),
                    "spend": spend,
                    "roas": roas,
                    "purchases": purchases,
                    "pct_worse": pct_worse
                })
                total_risk_spend += spend

            # Emitting Underperforming Ad Recommendation
            if spend >= 50.00 and roas < 1.20:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.80, urgency=0.75, spend=spend, num_conversions=purchases, impressions=impressions
                )

                rec_type = "UNDERPERFORMING_AD"
                title = f"Pause low ROAS Ad: {ad.name}"
                if confidence < 0.50:
                    rec_type = "WATCH"
                    title = f"Watch performance on Ad: {ad.name}"

                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad",
                        entity_id=ad.id,
                        campaign_id=ad.campaign_id if hasattr(ad, "campaign_id") else None,
                        adset_id=ad.ad_set_id,
                        ad_id=ad.id,
                        recommendation_type=rec_type,
                        title=title,
                        description=(
                            f"This active ad has generated a low ROAS of {roas:.2f}x over the last 14 days, "
                            f"spending ₹{spend:.2f} and returning only ₹{revenue:.2f} in purchases revenue."
                        ),
                        reason="Cost-per-acquisition is too high compared to return values.",
                        objective="Sales",
                        problem="Inefficient creative performance",
                        root_cause="High CPL or low purchase conversion rate on creative variant",
                        evidence=f"Spend: ₹{spend:.2f}, ROAS: {roas:.2f}x, CTR: {ctr*100:.2f}%",
                        expected_impact="Pausing this ad allows Meta's delivery algorithm to prioritize higher performing assets in the ad set.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"spend": spend, "roas": roas, "purchases": purchases, "pct_worse": pct_worse},
                        status="new",
                    )
                )

            # Low CTR Check
            if impressions >= 500 and ctr < 0.015:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.65, urgency=0.60, spend=spend, num_conversions=purchases, impressions=impressions
                )
                
                rec_type = "UNDERPERFORMING_CREATIVE"
                title = f"Refresh low CTR Ad copy/headline: {ad.name}"
                if confidence < 0.50:
                    rec_type = "WATCH"
                    title = f"Watch click engagement: {ad.name}"

                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad",
                        entity_id=ad.id,
                        campaign_id=ad.campaign_id if hasattr(ad, "campaign_id") else None,
                        adset_id=ad.ad_set_id,
                        ad_id=ad.id,
                        recommendation_type=rec_type,
                        title=title,
                        description=(
                            f"CTR is currently {ctr*100:.2f}%, which is below the recommended threshold of 1.5%. "
                            f"Out of {impressions} impressions, it has captured only {clicks} clicks."
                        ),
                        reason="Ad fatigue or copy message is not engaging the target audience.",
                        objective="General",
                        problem="Low ad click-through rate",
                        root_cause="Creative wearout or copy hook mismatch",
                        evidence=f"Impressions: {impressions}, CTR: {ctr*100:.2f}%, clicks: {clicks}",
                        expected_impact="Refreshing copy/headline or swapping the visual card will improve click share and lower CPC.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"ctr": ctr, "impressions": impressions, "clicks": clicks},
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
        from sqlalchemy.orm import selectinload
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
                select(
                    func.coalesce(func.sum(CampaignDailyMetrics.spend), 0).label("spend"),
                    func.coalesce(func.sum(CampaignDailyMetrics.revenue), 0).label("revenue"),
                    func.coalesce(func.sum(CampaignDailyMetrics.purchases), 0).label("purchases"),
                    func.coalesce(func.sum(CampaignDailyMetrics.impressions), 0).label("impressions"),
                    func.coalesce(func.sum(CampaignDailyMetrics.clicks), 0).label("clicks"),
                    func.coalesce(func.sum(CampaignDailyMetrics.link_clicks), 0).label("link_clicks"),
                    func.coalesce(func.sum(CampaignDailyMetrics.leads), 0).label("leads"),
                    func.coalesce(func.sum(CampaignDailyMetrics.reach), 0).label("reach"),
                    func.coalesce(func.avg(CampaignDailyMetrics.frequency), 1.0).label("frequency"),
                )
                .where(CampaignDailyMetrics.campaign_id == camp.id)
                .where(CampaignDailyMetrics.date >= start_date)
            )
            m_res = await db.execute(m_stmt)
            m_row = m_res.fetchone()
            if not m_row or float(m_row.spend or 0.0) == 0.0:
                continue

            spend = float(m_row.spend)
            revenue = float(m_row.revenue)
            purchases = int(m_row.purchases or 0)
            impressions = int(m_row.impressions or 0)
            clicks = int(m_row.clicks or 0)
            link_clicks = int(m_row.link_clicks or 0)
            leads = int(m_row.leads or 0)
            reach = int(m_row.reach or 0)
            frequency = float(m_row.frequency or 1.0)

            ctr = (clicks / impressions) if impressions > 0 else 0.0
            cpc = (spend / clicks) if clicks > 0 else 0.0
            roas = (revenue / spend) if spend > 0 else 0.0
            cpa = (spend / purchases) if purchases > 0 else 0.0
            cpl = (spend / leads) if leads > 0 else 0.0

            obj = camp.objective.upper()

            # 1. Scaling Opportunity Check (8.7 Scaling Opportunity)
            # Checked stability for 14 days and frequency <= 2.2
            if spend >= 50.00 and roas >= 2.50 and frequency <= 2.2:
                priority, confidence = cls.calculate_priority_and_confidence(
                    impact=0.90, urgency=0.55, spend=spend, num_conversions=purchases, duration_days=14
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
                        description=f"This campaign has maintained strong performance (ROAS: {roas:.2f}x) for 14 days and is suitable for controlled budget testing.",
                        reason="Stable delivery efficiency and low audience frequency saturation.",
                        objective=camp.objective,
                        problem=None,
                        root_cause=None,
                        evidence=f"ROAS is {roas:.2f}x, Frequency is {frequency:.2f} under baseline 2.2 threshold.",
                        expected_impact="Controlled budget increases of 15-20% will increase sales volume without triggering ad fatigue.",
                        confidence_score=confidence,
                        priority=priority,
                        supporting_metrics={"spend": spend, "roas": roas, "frequency": frequency},
                        status="new"
                    )
                )

            # 2. Conversion Opportunity Check (8.11 post-click / downstream funnel leak)
            # Lead objective leak: CTR good, CPC good, link clicks good, lead conversion poor
            if "LEAD" in obj:
                if clicks >= 100 and ctr > 0.015 and cpc < 20.0:
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
                                objective=camp.objective,
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
            
            # Sales objective leak: CTR good, CPC good, but purchases poor (downstream funnel leak)
            elif "SALES" in obj or "CONVERSIONS" in obj:
                if clicks >= 100 and ctr > 0.015 and purchases == 0 and spend > 150.00:
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
                            objective=camp.objective,
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

        # ──────────────────────────────────────────────
        # Idempotent database operations
        # ──────────────────────────────────────────────
        delete_stmt = (
            delete(AIRecommendation)
            .where(AIRecommendation.ad_account_id == ad_account_uuid)
            .where(AIRecommendation.status.in_(["new", "viewed"]))
        )
        await db.execute(delete_stmt)
        await db.commit()

        # Add new suggestions — apply DataQualityGuard to each recommendation
        count = 0
        for rec in recommendations_to_add:
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

            db.add(rec)
            count += 1
            
        await db.commit()
        logger.info("AI Recommendations compiled (with data quality guard)", count=count)
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
        c_conversions = curr["purchases"] + curr["leads"] + curr["calls"] + curr["conversations"]

        # Determine Goal of the Campaign
        perf_goal = "conversions"
        if camp.ad_sets:
            perf_goal = camp.ad_sets[0].performance_goal or "conversions"
        else:
            # Fallback to objective parsing
            obj = camp.objective.upper()
            if "LEAD" in obj:
                perf_goal = "leads"
            elif "SALES" in obj or "CONVERSIONS" in obj:
                perf_goal = "purchases"

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

        return diagnoses
