"""
Digital Growth Studio — AI Recommendation Engine
"""
import uuid
import structlog
from datetime import date, datetime, timedelta
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign, AdSet, Ad
from app.models.metrics import CampaignDailyMetrics, AdDailyMetrics
from app.models.recommendation import AIRecommendation

logger = structlog.get_logger()


class RecommendationEngine:
    """
    Analyzes Meta performance logs and compiles actionable rule-based optimization alerts.
    """

    @classmethod
    async def compile_recommendations(
        cls, db: AsyncSession, ad_account_uuid: uuid.UUID, user_uuid: uuid.UUID
    ) -> int:
        """
        Runs performance checks against historical metrics and upserts recommendations.
        """
        logger.info("Running AI Recommendations compilation", ad_account_id=ad_account_uuid)
        
        # Date range for analysis (last 14 days)
        today = date.today()
        start_date = today - timedelta(days=14)

        recommendations_to_add = []

        # ──────────────────────────────────────────────
        # RULE 1: Underperforming Ad (Low ROAS / High CPA)
        # ──────────────────────────────────────────────
        # For simplicity, we query daily metrics grouped by ad_id manually inside code to bypass nested aggregate limits
        ad_stmt = (
            select(
                Ad,
                Campaign.name.label("campaign_name"),
            )
            .join(AdSet, Ad.ad_set_id == AdSet.id)
            .join(Campaign, AdSet.campaign_id == Campaign.id)
            .where(Campaign.ad_account_id == ad_account_uuid)
            .where(Ad.status == "ACTIVE")
        )
        res = await db.execute(ad_stmt)
        active_ads = res.all()

        from sqlalchemy import func
        for row in active_ads:
            ad = row.Ad
            # Query metrics sum
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

            # Rule: Low ROAS (Spend > 50 and ROAS < 1.2)
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

            # RULE 2: Underperforming Creative (Low CTR < 1.5%)
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

            # Rule: High ROAS (Spend > 50 and ROAS > 2.5)
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
        # To make recommendations completely idempotent, we delete non-applied recommendations for the ad account,
        # and then write the newly calculated ones.
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
