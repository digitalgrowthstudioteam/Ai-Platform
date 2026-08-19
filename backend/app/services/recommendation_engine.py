"""
Digital Growth Studio — AI Recommendation Engine
"""
import uuid
import httpx
import structlog
from datetime import date, datetime, timedelta
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.campaign import Campaign, AdSet, Ad
from app.models.meta import MetaAdAccount, MetaConnection
from app.models.metrics import CampaignDailyMetrics, AdDailyMetrics
from app.models.recommendation import AIRecommendation

logger = structlog.get_logger()
settings = get_settings()


class RecommendationEngine:
    """
    Analyzes Meta performance logs and compiles actionable rule-based optimization alerts,
    including advanced platform/placement and age/gender demographic breakdowns.
    """

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
        # ANALYSIS RULE: Platform/Placement Optimization
        # ──────────────────────────────────────────────
        for platform in platform_breakdowns:
            platform_name = platform.get("publisher_platform")
            spend = float(platform.get("spend", 0))
            
            # Parse purchase count and conversion revenue
            purchases = 0
            revenue = 0.0
            for act in platform.get("actions", []):
                if act.get("action_type") == "purchase":
                    purchases = int(act.get("value", 0))
            for val in platform.get("action_values", []):
                if val.get("action_type") == "purchase":
                    revenue = float(val.get("value", 0.0))

            roas = (revenue / spend) if spend > 0 else 0.0

            # Underperforming placement rule
            if spend >= 100.00 and roas < 0.8:
                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad_account",
                        entity_id=ad_account_uuid,
                        recommendation_type="PLACEMENT_OPTIMIZATION",
                        title=f"Exclude underperforming placement: {platform_name.upper()}",
                        description=(
                            f"Our analysis indicates that the {platform_name.upper()} delivery placement is highly inefficient. "
                            f"It spent {spend:.2f} but generated only {purchases} conversions with a low ROAS of {roas:.2f}x."
                        ),
                        reason=f"Excluding the underperforming {platform_name} placement redirects budget to higher-converting placements like Instagram.",
                        confidence_score=0.9400,
                        priority="high",
                        supporting_metrics={"spend": spend, "roas": roas, "purchases": purchases, "placement": platform_name},
                        status="new",
                    )
                )

        # ──────────────────────────────────────────────
        # ANALYSIS RULE: Age & Gender Target Tuning
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

            # Low performing audience rule (spend > 100 and ROAS < 0.5)
            if spend >= 100.00 and roas < 0.5:
                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad_account",
                        entity_id=ad_account_uuid,
                        recommendation_type="DEMOGRAPHIC_TUNING",
                        title=f"Narrow target audience: Exclude {gender.upper()} {age_group}",
                        description=(
                            f"Audience segment {gender.upper()} ({age_group}) represents a high cost-sink. "
                            f"It has consumed {spend:.2f} in ad spend with almost zero conversions (ROAS: {roas:.2f}x)."
                        ),
                        reason=f"Refining targeting settings to omit {gender} aged {age_group} will improve campaign efficiency.",
                        confidence_score=0.9100,
                        priority="medium",
                        supporting_metrics={"spend": spend, "roas": roas, "purchases": purchases, "demographics": f"{gender}_{age_group}"},
                        status="new",
                    )
                )

        # ──────────────────────────────────────────────
        # RULE 1: Underperforming Ad (Low ROAS / High CPA)
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
            if not m_row:
                continue

            spend = float(m_row.spend)
            revenue = float(m_row.revenue)
            purchases = int(m_row.purchases)
            impressions = int(m_row.impressions)
            clicks = int(m_row.clicks)

            roas = (revenue / spend) if spend > 0 else 0.0
            ctr = (clicks / impressions) if impressions > 0 else 0.0

            # Low ROAS
            if spend >= 50.00 and roas < 1.20:
                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad",
                        entity_id=ad.id,
                        recommendation_type="UNDERPERFORMING_AD",
                        title=f"Pause low ROAS Ad: {ad.name}",
                        description=(
                            f"This active ad has generated a low ROAS of {roas:.2f}x over the last 14 days, "
                            f"spending {spend:.2f} and returning only {revenue:.2f} in purchases revenue."
                        ),
                        reason="Cost-per-acquisition is too high compared to return values.",
                        confidence_score=0.9200,
                        priority="high",
                        supporting_metrics={"spend": spend, "roas": roas, "purchases": purchases},
                        status="new",
                    )
                )

            # Low CTR
            if impressions >= 500 and ctr < 0.015:
                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="ad",
                        entity_id=ad.id,
                        recommendation_type="UNDERPERFORMING_CREATIVE",
                        title=f"Refresh low CTR Ad copy/headline: {ad.name}",
                        description=(
                            f"CTR is currently {ctr*100:.2f}%, which is below the recommended threshold of 1.5%. "
                            f"Out of {impressions} impressions, it has captured only {clicks} clicks."
                        ),
                        reason="Ad fatigue or copy message is not engaging the target audience.",
                        confidence_score=0.8700,
                        priority="medium",
                        supporting_metrics={"ctr": ctr, "impressions": impressions, "clicks": clicks},
                        status="new",
                    )
                )

        # ──────────────────────────────────────────────
        # RULE 3: Objective-Aware Campaign Diagnosis Engine
        # ──────────────────────────────────────────────
        camp_stmt = select(Campaign).where(Campaign.ad_account_id == ad_account_uuid).where(Campaign.status == "ACTIVE")
        camp_res = await db.execute(camp_stmt)
        active_camps = camp_res.scalars().all()

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
            if not m_row:
                continue

            # Core Metrics (Handling missing values gracefully)
            spend = float(m_row.spend or 0.0)
            revenue = float(m_row.revenue or 0.0)
            purchases = int(m_row.purchases or 0)
            impressions = int(m_row.impressions or 0)
            clicks = int(m_row.clicks or 0)
            link_clicks = int(m_row.link_clicks or 0)
            leads = int(m_row.leads or 0)
            reach = int(m_row.reach or 0)
            frequency = float(m_row.frequency or 1.0)

            # Calculated helper metrics
            ctr = (clicks / impressions) if impressions > 0 else 0.0
            cpc = (spend / clicks) if clicks > 0 else 0.0
            cpm = (spend / impressions * 1000) if impressions > 0 else 0.0
            roas = (revenue / spend) if spend > 0 else 0.0
            cpa = (spend / purchases) if purchases > 0 else 0.0
            cpl = (spend / leads) if leads > 0 else 0.0

            obj = camp.objective.upper()

            # ──────────────────────────────────────────
            # A. Sales Objective (Purchases / CPA / ROAS focus)
            # ──────────────────────────────────────────
            if "SALES" in obj or "CONVERSIONS" in obj:
                if spend >= 50.00:
                    if roas < 1.20:
                        recommendations_to_add.append(
                            AIRecommendation(
                                user_id=user_uuid,
                                ad_account_id=ad_account_uuid,
                                entity_type="campaign",
                                entity_id=camp.id,
                                recommendation_type="LOW_ROAS",
                                title=f"Low ROAS Conversion Leak: {camp.name}",
                                description=f"ROAS is currently {roas:.2f}x. The campaign spent {spend:.2f} but generated only {revenue:.2f} in revenue.",
                                reason="Low purchase intent or checkout drop-off. Audit add-to-cart and initiate checkout steps.",
                                confidence_score=0.93,
                                priority="high",
                                supporting_metrics={"spend": spend, "roas": roas, "purchases": purchases},
                                status="new"
                            )
                        )
                    if cpa > 25.0 or (purchases == 0 and spend > 150.00):
                        recommendations_to_add.append(
                            AIRecommendation(
                                user_id=user_uuid,
                                ad_account_id=ad_account_uuid,
                                entity_type="campaign",
                                entity_id=camp.id,
                                recommendation_type="HIGH_CPA",
                                title=f"Elevated CPA Warning: {camp.name}",
                                description=f"CPA is currently at {f'₹{cpa:.2f}' if purchases > 0 else 'N/A'}. Budget spent: {spend:.2f}.",
                                reason="Cost per conversion is high due to lower conversion rate or higher CPM bidding thresholds.",
                                confidence_score=0.91,
                                priority="high",
                                supporting_metrics={"spend": spend, "cpa": cpa, "purchases": purchases},
                                status="new"
                            )
                        )
                if frequency > 3.5 and spend >= 50.00:
                    recommendations_to_add.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            recommendation_type="CREATIVE_FATIGUE",
                            title=f"Creative Fatigue: {camp.name}",
                            description=f"Frequency is at {frequency:.2f}. Audience is seeing the same creative multiple times, degrading CTR.",
                            reason="Rotate creative visual assets to refresh audience interest.",
                            confidence_score=0.88,
                            priority="medium",
                            supporting_metrics={"frequency": frequency, "ctr": ctr},
                            status="new"
                        )
                    )

            # ──────────────────────────────────────────
            # B. Leads Objective (Leads / CPL focus)
            # ──────────────────────────────────────────
            elif "LEAD" in obj:
                if spend >= 50.00:
                    if cpl > 15.0 or (leads == 0 and spend > 100.00):
                        recommendations_to_add.append(
                            AIRecommendation(
                                user_id=user_uuid,
                                ad_account_id=ad_account_uuid,
                                entity_type="campaign",
                                entity_id=camp.id,
                                recommendation_type="HIGH_CPL",
                                title=f"High Cost Per Lead (CPL): {camp.name}",
                                description=f"CPL is currently at {f'₹{cpl:.2f}' if leads > 0 else 'N/A'}. Spent {spend:.2f} for {leads} leads.",
                                reason="CPL has exceeded optimal threshold limits. Audit target form components or audience match criteria.",
                                confidence_score=0.92,
                                priority="high",
                                supporting_metrics={"spend": spend, "cpl": cpl, "leads": leads},
                                status="new"
                            )
                        )
                    if clicks >= 100 and leads > 0 and (leads / clicks) < 0.02:
                        recommendations_to_add.append(
                            AIRecommendation(
                                user_id=user_uuid,
                                ad_account_id=ad_account_uuid,
                                entity_type="campaign",
                                entity_id=camp.id,
                                recommendation_type="LOW_LEAD_CONVERSION",
                                title=f"Low Lead Conversion Rate: {camp.name}",
                                description=f"Click-to-lead conversion is currently {((leads/clicks)*100):.2f}% (leads: {leads}, clicks: {clicks}).",
                                reason="Forms may have too many fields or landing pages lack trust/clarity.",
                                confidence_score=0.89,
                                priority="medium",
                                supporting_metrics={"leads": leads, "clicks": clicks, "conversion_rate": leads/clicks},
                                status="new"
                            )
                        )

            # ──────────────────────────────────────────
            # C. Traffic Objective (CTR / CPC / link click drop focus)
            # ──────────────────────────────────────────
            elif "TRAFFIC" in obj or "LINK_CLICKS" in obj:
                if impressions >= 500:
                    if ctr < 0.012:
                        recommendations_to_add.append(
                            AIRecommendation(
                                user_id=user_uuid,
                                ad_account_id=ad_account_uuid,
                                entity_type="campaign",
                                entity_id=camp.id,
                                recommendation_type="LOW_CTR",
                                title=f"Low Click-Through Rate: {camp.name}",
                                description=f"CTR is {ctr*100:.2f}%. Out of {impressions} impressions, got only {clicks} clicks.",
                                reason="The creative image or primary message is failing to capture attention in the feed.",
                                confidence_score=0.90,
                                priority="medium",
                                supporting_metrics={"ctr": ctr, "impressions": impressions},
                                status="new"
                            )
                        )
                if clicks > 0 and cpc > 3.0:
                    recommendations_to_add.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            recommendation_type="HIGH_CPC",
                            title=f"High CPC Cost Warning: {camp.name}",
                            description=f"Cost per Click is currently at ₹{cpc:.2f}.",
                            reason="High bid competition or poor relevance score. Exclude low-converting placements.",
                            confidence_score=0.87,
                            priority="medium",
                            supporting_metrics={"cpc": cpc, "spend": spend},
                            status="new"
                        )
                    )
                if link_clicks > 0 and clicks > 0 and (link_clicks / clicks) < 0.60:
                    recommendations_to_add.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            recommendation_type="CLICK_TO_LPV_DROP",
                            title=f"Click to Landing Page Dropoff: {camp.name}",
                            description=f"Only {((link_clicks/clicks)*100):.1f}% of clicks converted to Link Clicks.",
                            reason="High page load latency or accidental exit clicks. Check website loading speeds.",
                            confidence_score=0.92,
                            priority="medium",
                            supporting_metrics={"clicks": clicks, "link_clicks": link_clicks},
                            status="new"
                        )
                    )

            # ──────────────────────────────────────────
            # D. Engagement Objective (CTR / Shares / CPC focus)
            # ──────────────────────────────────────────
            elif "ENGAGEMENT" in obj:
                if impressions >= 1000:
                    if ctr < 0.008:
                        recommendations_to_add.append(
                            AIRecommendation(
                                user_id=user_uuid,
                                ad_account_id=ad_account_uuid,
                                entity_type="campaign",
                                entity_id=camp.id,
                                recommendation_type="LOW_ENGAGEMENT",
                                title=f"Low Engagement Alert: {camp.name}",
                                description=f"CTR is currently {ctr*100:.2f}% which is below standard engagement baseline filters.",
                                reason="Creative elements do not invoke conversational hooks or shares.",
                                confidence_score=0.86,
                                priority="medium",
                                supporting_metrics={"ctr": ctr, "impressions": impressions},
                                status="new"
                            )
                        )
                if clicks > 50 and purchases == 0 and leads == 0:
                    recommendations_to_add.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            recommendation_type="LOW_CLICK_QUALITY",
                            title=f"Low Click Quality: {camp.name}",
                            description=f"Ad has generated {clicks} clicks but zero conversions.",
                            reason="Audience target settings are too broad. Add demographic or placement restrictions.",
                            confidence_score=0.88,
                            priority="medium",
                            supporting_metrics={"clicks": clicks},
                            status="new"
                        )
                    )

            # ──────────────────────────────────────────
            # E. Awareness Objective (Impressions / CPM / Saturation focus)
            # ──────────────────────────────────────────
            elif "AWARENESS" in obj or "REACH" in obj:
                if frequency > 3.0 and spend >= 50.00:
                    recommendations_to_add.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            recommendation_type="CREATIVE_FATIGUE",
                            title=f"Awareness Fatigue: {camp.name}",
                            description=f"Frequency has reached {frequency:.2f}. Audience saturation reduces reach efficiency.",
                            reason="Ad frequency is elevated. Swap creatives or target lookalikes to expand reach.",
                            confidence_score=0.89,
                            priority="medium",
                            supporting_metrics={"frequency": frequency},
                            status="new"
                        )
                    )
                if impressions > 5000 and reach > 0 and (impressions / reach) > 4.0:
                    recommendations_to_add.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            recommendation_type="AUDIENCE_SATURATION",
                            title=f"Audience Saturation: {camp.name}",
                            description=f"High impressions-to-reach ratio ({ (impressions/reach):.2f}x).",
                            reason="The budget is saturating a small audience pool. Expand demographic targeting parameters.",
                            confidence_score=0.91,
                            priority="medium",
                            supporting_metrics={"impressions": impressions, "reach": reach},
                            status="new"
                        )
                    )
                if impressions >= 1000 and cpm > 15.0:
                    recommendations_to_add.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            recommendation_type="HIGH_CPM",
                            title=f"High CPM Warning: {camp.name}",
                            description=f"CPM is currently ₹{cpm:.2f}.",
                            reason="Auction bids are expensive. Check relevance scores or expand placement targeting.",
                            confidence_score=0.85,
                            priority="low",
                            supporting_metrics={"cpm": cpm},
                            status="new"
                        )
                    )

            # ──────────────────────────────────────────
            # F. Scale budget checks for top Campaign
            # ──────────────────────────────────────────
            if spend >= 50.00 and roas >= 2.50:
                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        recommendation_type="SCALE_OPPORTUNITY",
                        title=f"Scale budget for top Campaign: {camp.name}",
                        description=f"This campaign is performing exceptionally well with a ROAS of {roas:.2f}x. We recommend increasing the daily budget by 15-20% to capture additional volume.",
                        reason="Campaign exhibits strong conversion efficiency and room to expand.",
                        confidence_score=0.9500,
                        priority="high",
                        supporting_metrics={"spend": spend, "roas": roas, "purchases": purchases},
                        status="new",
                    )
                )

            # ──────────────────────────────────────────
            # G. Root-Cause Diagnosis Evaluation
            # ──────────────────────────────────────────
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

        # Add new suggestions
        count = 0
        for rec in recommendations_to_add:
            db.add(rec)
            count += 1
            
        await db.commit()
        logger.info("AI Recommendations compiled", count=count)
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

        # 1. Fetch Current Period Metrics (last 7 days)
        stmt_curr = (
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
            .where(CampaignDailyMetrics.date >= current_start)
        )
        res_curr = await db.execute(stmt_curr)
        row_curr = res_curr.fetchone()

        # 2. Fetch Previous Period Metrics (days 8-14)
        stmt_prev = (
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
            .where(CampaignDailyMetrics.date >= prev_start)
            .where(CampaignDailyMetrics.date < current_start)
        )
        res_prev = await db.execute(stmt_prev)
        row_prev = res_prev.fetchone()

        if not row_curr or not row_prev:
            return diagnoses

        # Current values
        c_spend = float(row_curr.spend or 0.0)
        c_impressions = int(row_curr.impressions or 0)
        c_clicks = int(row_curr.clicks or 0)
        c_link_clicks = int(row_curr.link_clicks or 0)
        c_purchases = int(row_curr.purchases or 0)
        c_leads = int(row_curr.leads or 0)
        c_reach = int(row_curr.reach or 0)
        c_frequency = float(row_curr.frequency or 1.0)
        c_revenue = float(row_curr.revenue or 0.0)

        # Previous values
        p_spend = float(row_prev.spend or 0.0)
        p_impressions = int(row_prev.impressions or 0)
        p_clicks = int(row_prev.clicks or 0)
        p_link_clicks = int(row_prev.link_clicks or 0)
        p_purchases = int(row_prev.purchases or 0)
        p_leads = int(row_prev.leads or 0)
        p_reach = int(row_prev.reach or 0)
        p_frequency = float(row_prev.frequency or 1.0)
        p_revenue = float(row_prev.revenue or 0.0)

        # ──────────────────────────────────────────
        # Safeguard: Insufficient Data check
        # ──────────────────────────────────────────
        if c_spend < 500.00 or (c_purchases + c_leads) < 3:
            diagnoses.append(
                AIRecommendation(
                    user_id=user_uuid,
                    ad_account_id=ad_account_uuid,
                    entity_type="campaign",
                    entity_id=camp.id,
                    recommendation_type="INSUFFICIENT_DATA",
                    title="Learning Pacing: Insufficient Data",
                    description=f"This campaign has spent only ₹{c_spend:.2f} and generated {c_purchases + c_leads} conversions in the last 7 days.",
                    reason="Insufficient data volume to yield stable statistical diagnosis. Continue collecting delivery logs.",
                    confidence_score=1.0000,
                    priority="low",
                    supporting_metrics={"spend": c_spend, "conversions": c_purchases + c_leads},
                    status="new"
                )
            )
            return diagnoses

        # Calculate current rates
        c_ctr = (c_clicks / c_impressions) if c_impressions > 0 else 0.0
        c_cpc = (c_spend / c_clicks) if c_clicks > 0 else 0.0
        c_cpm = (c_spend / c_impressions * 1000) if c_impressions > 0 else 0.0
        c_roas = (c_revenue / c_spend) if c_spend > 0 else 0.0
        c_cpl = (c_spend / c_leads) if c_leads > 0 else 0.0
        c_cpa = (c_spend / c_purchases) if c_purchases > 0 else 0.0
        c_cvr = (c_purchases / c_clicks) if c_clicks > 0 else 0.0

        # Calculate previous rates
        p_ctr = (p_clicks / p_impressions) if p_impressions > 0 else 0.0
        p_cpc = (p_spend / p_clicks) if p_clicks > 0 else 0.0
        p_cpm = (p_spend / p_impressions * 1000) if p_impressions > 0 else 0.0
        p_roas = (p_revenue / p_spend) if p_spend > 0 else 0.0
        p_cpl = (p_spend / p_leads) if p_leads > 0 else 0.0
        p_cpa = (p_spend / p_purchases) if p_purchases > 0 else 0.0
        p_cvr = (p_purchases / p_clicks) if p_clicks > 0 else 0.0

        # Rate change ratios
        cpm_change = ((c_cpm - p_cpm) / p_cpm) if p_cpm > 0 else 0.0
        ctr_change = ((c_ctr - p_ctr) / p_ctr) if p_ctr > 0 else 0.0
        cpc_change = ((c_cpc - p_cpc) / p_cpc) if p_cpc > 0 else 0.0
        cpl_change = ((c_cpl - p_cpl) / p_cpl) if p_cpl > 0 else 0.0
        cpa_change = ((c_cpa - p_cpa) / p_cpa) if p_cpa > 0 else 0.0
        roas_change = ((c_roas - p_roas) / p_roas) if p_roas > 0 else 0.0
        freq_change = ((c_frequency - p_frequency) / p_frequency) if p_frequency > 0 else 0.0

        # ──────────────────────────────────────────
        # 1. CPM Diagnosis (Auction Pressure vs Saturation Fatigue)
        # ──────────────────────────────────────────
        if cpm_change > 0.15:
            if freq_change > 0.15 and ctr_change < -0.10:
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        recommendation_type="CREATIVE_FATIGUE",
                        title=f"CPM Surge - Audience Saturation: {camp.name}",
                        description=f"CPM increased by {cpm_change*100:.1f}% over the last 7 days. This is caused by audience saturation and creative fatigue, as frequency has increased and click engagement (CTR) has declined.",
                        reason="Evidence: Frequency increased, CTR decreased, CPM increased across placements.",
                        confidence_score=0.89,
                        priority="high",
                        supporting_metrics={"cpm_change": cpm_change, "freq_change": freq_change, "ctr_change": ctr_change},
                        status="new"
                    )
                )
            elif ctr_change >= -0.05 and cpc_change > 0.10:
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        recommendation_type="HIGH_CPM",
                        title=f"CPM Surge - Auction Pressure: {camp.name}",
                        description=f"CPM increased by {cpm_change*100:.1f}% over the last 7 days. However, CTR remains stable, indicating that auction competition has increased.",
                        reason="Evidence: Frequency stable, CTR stable, CPM increased across placements. Bidding pressure is systemic.",
                        confidence_score=0.84,
                        priority="medium",
                        supporting_metrics={"cpm_change": cpm_change, "ctr_change": ctr_change},
                        status="new"
                    )
                )

        # ──────────────────────────────────────────
        # 2. CTR Diagnosis (Creative Fatigue vs Message Mismatch)
        # ──────────────────────────────────────────
        if ctr_change < -0.15:
            if c_frequency > 3.0 and cpc_change > 0.10:
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        recommendation_type="CREATIVE_FATIGUE",
                        title=f"CTR Drop - Creative Fatigue: {camp.name}",
                        description=f"CTR decreased by {abs(ctr_change)*100:.1f}%. Frequency has risen to {c_frequency:.2f} while CPM remains stable, confirming fatigue.",
                        reason=f"Evidence: Frequency increased {p_frequency:.1f} -> {c_frequency:.1f}, CTR decreased, CPM stable, CPC increased {cpc_change*100:.1f}%.",
                        confidence_score=0.89,
                        priority="high",
                        supporting_metrics={"ctr_change": ctr_change, "frequency": c_frequency, "cpc_change": cpc_change},
                        status="new"
                    )
                )

        # ──────────────────────────────────────────
        # 3. CPC Diagnosis (Creative Lag vs Bidding Spikes)
        # ──────────────────────────────────────────
        if cpc_change > 0.15:
            if ctr_change < -0.10 and abs(cpm_change) < 0.10:
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        recommendation_type="HIGH_CPC",
                        title=f"CPC Surge - Creative Lag: {camp.name}",
                        description=f"CPC increased by {cpc_change*100:.1f}% primarily because click engagement (CTR) fell by {abs(ctr_change)*100:.1f}% while auction cost remained stable.",
                        reason="Evidence: CPC increased, CTR decreased, CPM stable.",
                        confidence_score=0.88,
                        priority="medium",
                        supporting_metrics={"cpc_change": cpc_change, "ctr_change": ctr_change, "cpm_change": cpm_change},
                        status="new"
                    )
                )
            elif ctr_change >= -0.05 and cpm_change > 0.10:
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        recommendation_type="HIGH_CPC",
                        title=f"CPC Surge - Auction Pressure: {camp.name}",
                        description=f"CPC increased by {cpc_change*100:.1f}% because CPM rose by {cpm_change*100:.1f}% despite stable CTR.",
                        reason="Evidence: CPC increased, CTR stable, CPM increased.",
                        confidence_score=0.85,
                        priority="medium",
                        supporting_metrics={"cpc_change": cpc_change, "cpm_change": cpm_change, "ctr_change": ctr_change},
                        status="new"
                    )
                )

        # ──────────────────────────────────────────
        # 4. CPL Diagnosis (Leads Campaigns)
        # ──────────────────────────────────────────
        if "LEAD" in camp.objective.upper() and cpl_change > 0.15:
            if cpc_change > 0.10:
                if ctr_change < -0.10:
                    diagnoses.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            recommendation_type="HIGH_CPL",
                            title=f"CPL Surge - Creative Issue: {camp.name}",
                            description=f"CPL increased by {cpl_change*100:.1f}% primarily driven by CPC rising {cpc_change*100:.1f}% as a result of a {abs(ctr_change)*100:.1f}% drop in CTR.",
                            reason="Evidence: CPL increased, CPC increased, CTR decreased, CPM stable.",
                            confidence_score=0.91,
                            priority="high",
                            supporting_metrics={"cpl_change": cpl_change, "cpc_change": cpc_change, "ctr_change": ctr_change},
                            status="new"
                        )
                    )
                elif ctr_change >= -0.05 and cpm_change > 0.10:
                    diagnoses.append(
                        AIRecommendation(
                            user_id=user_uuid,
                            ad_account_id=ad_account_uuid,
                            entity_type="campaign",
                            entity_id=camp.id,
                            recommendation_type="HIGH_CPL",
                            title=f"CPL Surge - Auction Cost: {camp.name}",
                            description=f"CPL increased by {cpl_change*100:.1f}% due to rising auction costs (CPM rose {cpm_change*100:.1f}%).",
                            reason="Evidence: CPL increased, CPC increased, CTR stable, CPM increased.",
                            confidence_score=0.88,
                            priority="medium",
                            supporting_metrics={"cpl_change": cpl_change, "cpm_change": cpm_change},
                            status="new"
                        )
                    )
            elif abs(cpc_change) <= 0.05 and abs(ctr_change) <= 0.05:
                # Post-click conversion issue
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        recommendation_type="LANDING_PAGE_TO_LEAD_DROP",
                        title=f"CPL Surge - Post-Click Lead Drop: {camp.name}",
                        description=f"CPL increased by {cpl_change*100:.1f}% despite stable CPC and CTR, because the lead conversion rate dropped.",
                        reason="Evidence: CTR stable, CPC stable, Lead conversion rate decreased.",
                        confidence_score=0.92,
                        priority="high",
                        supporting_metrics={"cpl_change": cpl_change, "cpc_change": cpc_change},
                        status="new"
                    )
                )

        # ──────────────────────────────────────────
        # 5. CPA & ROAS Diagnosis (Sales Campaigns)
        # ──────────────────────────────────────────
        if ("SALES" in camp.objective.upper() or "CONVERSIONS" in camp.objective.upper()) and cpa_change > 0.15:
            if ctr_change < -0.10:
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        recommendation_type="HIGH_CPA",
                        title=f"CPA Surge - Creative Issue: {camp.name}",
                        description=f"CPA increased by {cpa_change*100:.1f}% because click-through CTR decreased by {abs(ctr_change)*100:.1f}%, indicating creative lag.",
                        reason="Evidence: CPA increased, CTR decreased, CPC increased.",
                        confidence_score=0.90,
                        priority="high",
                        supporting_metrics={"cpa_change": cpa_change, "ctr_change": ctr_change},
                        status="new"
                    )
                )
            elif cpc_change > 0.15:
                diagnoses.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        recommendation_type="HIGH_CPA",
                        title=f"CPA Surge - Click Cost Inflation: {camp.name}",
                        description=f"CPA increased by {cpa_change*100:.1f}% driven primarily by CPC rising {cpc_change*100:.1f}%.",
                        reason="Evidence: CPA increased, CPC increased, CTR stable.",
                        confidence_score=0.88,
                        priority="medium",
                        supporting_metrics={"cpa_change": cpa_change, "cpc_change": cpc_change},
                        status="new"
                    )
                )

        return diagnoses
