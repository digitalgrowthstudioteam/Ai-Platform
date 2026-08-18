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
        # RULE 3: Scale Opportunity (High ROAS Campaign)
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
                )
                .where(CampaignDailyMetrics.campaign_id == camp.id)
                .where(CampaignDailyMetrics.date >= start_date)
            )
            m_res = await db.execute(m_stmt)
            m_row = m_res.fetchone()
            if not m_row:
                continue

            spend = float(m_row.spend)
            revenue = float(m_row.revenue)
            purchases = int(m_row.purchases)
            roas = (revenue / spend) if spend > 0 else 0.0

            # Scale opportunity
            if spend >= 50.00 and roas >= 2.50:
                recommendations_to_add.append(
                    AIRecommendation(
                        user_id=user_uuid,
                        ad_account_id=ad_account_uuid,
                        entity_type="campaign",
                        entity_id=camp.id,
                        recommendation_type="SCALE_OPPORTUNITY",
                        title=f"Scale budget for top Campaign: {camp.name}",
                        description=(
                            f"This campaign is performing exceptionally well with a ROAS of {roas:.2f}x. "
                            f"We recommend increasing the daily budget by 15-20% to capture additional volume."
                        ),
                        reason="Campaign exhibits strong conversion efficiency and room to expand.",
                        confidence_score=0.9500,
                        priority="high",
                        supporting_metrics={"spend": spend, "roas": roas, "purchases": purchases},
                        status="new",
                    )
                )

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
