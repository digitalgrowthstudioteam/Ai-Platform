"""
Digital Growth Studio — ML Feature Extractor Service (Phase 10)

Extracts and persists ML-ready features from synced creative,
audience, and performance data into the MLFeatureStore table.

V1: Simple rule-based feature extraction (text analysis, type detection).
Future: NLP-based hook classification, image/video analysis.
"""
import re
import uuid
import structlog
from datetime import date, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from app.models.campaign import Campaign, AdSet, Ad
from app.models.creative import Creative
from app.models.metrics import AdDailyMetrics, CampaignDailyMetrics
from app.models.ml_features import MLFeatureRecord

logger = structlog.get_logger()

# Patterns for hook type classification
HOOK_PATTERNS = {
    "problem": [r"struggling", r"tired of", r"frustrated", r"problem", r"pain", r"sick of", r"stop wasting"],
    "benefit": [r"get more", r"increase", r"boost", r"improve", r"unlock", r"achieve", r"grow"],
    "question": [r"^(are you|do you|have you|what if|why|how|did you)", r"\?"],
    "statistic": [r"\d+%", r"\d+x", r"\d+ out of", r"studies show"],
    "story": [r"i was", r"we were", r"our journey", r"i remember", r"when i"],
    "urgency": [r"limited", r"last chance", r"ends today", r"hurry", r"only \d+", r"don't miss"],
}

# Patterns for offer/price/social proof detection
OFFER_PATTERNS = [r"off", r"discount", r"sale", r"deal", r"offer", r"free", r"bonus", r"save"]
PRICE_PATTERNS = [r"₹\d+", r"\$\d+", r"rs\.?\s?\d+", r"price", r"cost", r"starting at"]
SOCIAL_PROOF_PATTERNS = [r"\d+ (customers|users|people|businesses)", r"trusted by", r"rated", r"reviews", r"testimonial", r"★"]


class MLFeatureExtractor:
    """
    Extracts features from ad creative metadata and daily performance
    and persists them for future ML training pipelines.
    """

    @classmethod
    def classify_hook_type(cls, text: str) -> str:
        """Classify the opening hook type of a text."""
        if not text:
            return "unknown"
        text_lower = text.lower().strip()

        for hook_type, patterns in HOOK_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    return hook_type
        return "direct"

    @classmethod
    def detect_text_feature(cls, text: str, patterns: List[str]) -> bool:
        """Check if text matches any of the given patterns."""
        if not text:
            return False
        text_lower = text.lower()
        for pattern in patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        return False

    @classmethod
    async def extract_features_for_account(
        cls,
        db: AsyncSession,
        ad_account_uuid: uuid.UUID,
        feature_date: date,
    ) -> int:
        """
        Extracts ML features for all ads in the account for a given date.
        Returns the number of feature records created/updated.
        """
        logger.info("Extracting ML features", ad_account_id=ad_account_uuid, date=feature_date)

        # Fetch all ads with their creatives and metrics
        stmt = (
            select(Ad, Creative, AdDailyMetrics)
            .outerjoin(Creative, Creative.ad_id == Ad.id)
            .outerjoin(
                AdDailyMetrics,
                (AdDailyMetrics.ad_id == Ad.id) & (AdDailyMetrics.date == feature_date)
            )
            .join(AdSet, Ad.ad_set_id == AdSet.id)
            .join(Campaign, AdSet.campaign_id == Campaign.id)
            .where(Campaign.ad_account_id == ad_account_uuid)
        )
        result = await db.execute(stmt)
        rows = result.all()

        count = 0
        for ad, creative, metrics in rows:
            # Skip if no metrics for this date
            if not metrics:
                continue

            # Extract creative features
            headline = creative.headline if creative else None
            primary_text = creative.primary_text if creative else None
            creative_type = creative.creative_type if creative else "unknown"
            cta = creative.call_to_action if creative else None

            # Classify hook type from primary text
            hook_type = cls.classify_hook_type(primary_text)

            # Detect offer/price/social proof
            combined_text = f"{headline or ''} {primary_text or ''}"
            has_offer = cls.detect_text_feature(combined_text, OFFER_PATTERNS)
            has_price = cls.detect_text_feature(combined_text, PRICE_PATTERNS)
            has_social_proof = cls.detect_text_feature(combined_text, SOCIAL_PROOF_PATTERNS)

            # Calculate performance features
            spend = float(metrics.spend or 0)
            impressions = int(metrics.impressions or 0)
            clicks = int(metrics.clicks or 0)
            leads = int(metrics.leads or 0)
            purchases = int(metrics.purchases or 0)
            conversions = leads + purchases
            revenue = float(metrics.revenue or 0)

            ctr = float(metrics.ctr or 0) if metrics.ctr else (clicks / impressions if impressions > 0 else 0)
            cpc = float(metrics.cpc or 0) if metrics.cpc else (spend / clicks if clicks > 0 else 0)
            cpm = float(metrics.cpm or 0) if metrics.cpm else (spend / impressions * 1000 if impressions > 0 else 0)
            conversion_rate = (conversions / clicks) if clicks > 0 else 0
            cpl = (spend / conversions) if conversions > 0 else 0
            roas = (revenue / spend) if spend > 0 else 0
            freq = float(metrics.frequency or 0) if metrics.frequency else 0

            # Determine outcome label based on performance
            outcome_label = "average"
            if conversions > 0 and cpl > 0:
                # Will be refined with account-level benchmarks in future
                if cpl < 100:  # Below 100 INR is generally good
                    outcome_label = "winner"
                elif cpl > 300:
                    outcome_label = "loser"
                if freq > 3.5:
                    outcome_label = "fatigue"

            # Upsert feature record
            existing_stmt = (
                select(MLFeatureRecord)
                .where(MLFeatureRecord.ad_id == ad.id)
                .where(MLFeatureRecord.feature_date == feature_date)
            )
            existing_result = await db.execute(existing_stmt)
            existing = existing_result.scalar_one_or_none()

            if existing:
                # Update
                existing.creative_type = creative_type
                existing.headline_length = len(headline) if headline else 0
                existing.primary_text_length = len(primary_text) if primary_text else 0
                existing.hook_type = hook_type
                existing.has_offer = has_offer
                existing.has_price = has_price
                existing.has_social_proof = has_social_proof
                existing.cta_type = cta
                existing.spend = spend
                existing.impressions = impressions
                existing.ctr = ctr
                existing.cpc = cpc
                existing.cpm = cpm
                existing.conversion_rate = conversion_rate
                existing.cpl = cpl
                existing.roas = roas
                existing.frequency = freq
                existing.outcome_label = outcome_label
            else:
                feature = MLFeatureRecord(
                    ad_account_id=ad_account_uuid,
                    ad_id=ad.id,
                    campaign_id=None,
                    feature_date=feature_date,
                    creative_type=creative_type,
                    creative_length=0,
                    headline_length=len(headline) if headline else 0,
                    primary_text_length=len(primary_text) if primary_text else 0,
                    hook_type=hook_type,
                    has_offer=has_offer,
                    has_price=has_price,
                    has_social_proof=has_social_proof,
                    cta_type=cta,
                    placement=None,  # Populated from breakdown data in future
                    audience_type=None,
                    age_group=None,
                    gender=None,
                    spend=spend,
                    impressions=impressions,
                    ctr=ctr,
                    cpc=cpc,
                    cpm=cpm,
                    conversion_rate=conversion_rate,
                    cpl=cpl,
                    roas=roas,
                    frequency=freq,
                    outcome_label=outcome_label,
                    extra_features={
                        "clicks": clicks,
                        "conversions": conversions,
                        "leads": leads,
                        "purchases": purchases,
                        "revenue": revenue,
                    },
                )
                db.add(feature)

            count += 1

        await db.commit()
        logger.info("ML features extracted", count=count, date=feature_date)
        return count
