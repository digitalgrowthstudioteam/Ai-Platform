"""
Digital Growth Studio — Data Quality Guard Service (Phase 10)

Before every recommendation, this guard verifies that the entity
has sufficient data to justify actionable advice.

Thresholds:
- Minimum impressions
- Minimum spend
- Minimum conversions
- Minimum time period (days)
- Statistical confidence proxy

If insufficient data → returns NOT_ENOUGH_DATA verdict
with a human-readable reason explaining why no aggressive
recommendation should be generated.
"""
import structlog
from dataclasses import dataclass
from typing import Optional, Tuple

logger = structlog.get_logger()


@dataclass
class DataQualityVerdict:
    """Result of a data quality check."""
    is_sufficient: bool
    verdict: str  # "SUFFICIENT", "NOT_ENOUGH_DATA", "LEARNING_PERIOD", "LOW_VOLUME"
    reason: str
    confidence_modifier: float  # 0.0 to 1.0, multiplied into confidence score


# Configurable thresholds
MIN_IMPRESSIONS = 1000
MIN_SPEND = 300.0  # INR
MIN_CONVERSIONS = 3
MIN_DAYS_ACTIVE = 3
MIN_CLICKS = 10


class DataQualityGuard:
    """
    Gatekeeper that checks whether an entity has enough data
    to justify an actionable recommendation.
    """

    @classmethod
    def check_entity(
        cls,
        impressions: int = 0,
        spend: float = 0.0,
        conversions: int = 0,
        clicks: int = 0,
        days_active: int = 0,
        entity_name: str = "Entity",
        entity_type: str = "campaign",
    ) -> DataQualityVerdict:
        """
        Runs all data quality checks and returns a verdict.
        If any threshold is not met, returns NOT_ENOUGH_DATA.
        """
        failures = []

        # 1. Impressions check
        if impressions < MIN_IMPRESSIONS:
            failures.append(
                f"Only {impressions:,} impressions (minimum {MIN_IMPRESSIONS:,} required)"
            )

        # 2. Spend check
        if spend < MIN_SPEND:
            failures.append(
                f"Only ₹{spend:,.0f} spent (minimum ₹{MIN_SPEND:,.0f} required)"
            )

        # 3. Conversions check
        if conversions < MIN_CONVERSIONS:
            failures.append(
                f"Only {conversions} conversion(s) (minimum {MIN_CONVERSIONS} required)"
            )

        # 4. Clicks check
        if clicks < MIN_CLICKS:
            failures.append(
                f"Only {clicks} clicks (minimum {MIN_CLICKS} required)"
            )

        # 5. Duration check
        if days_active < MIN_DAYS_ACTIVE:
            failures.append(
                f"Only {days_active} day(s) of data (minimum {MIN_DAYS_ACTIVE} required)"
            )

        if failures:
            # Determine specific verdict type
            if days_active < MIN_DAYS_ACTIVE:
                verdict_type = "LEARNING_PERIOD"
                reason = (
                    f"{entity_name} ({entity_type}) is in its learning period. "
                    f"Insufficient data to generate a reliable recommendation. "
                    + "; ".join(failures) + "."
                )
            elif spend < MIN_SPEND and impressions < MIN_IMPRESSIONS:
                verdict_type = "NOT_ENOUGH_DATA"
                reason = (
                    f"{entity_name} ({entity_type}) has insufficient data volume. "
                    + "; ".join(failures) + "."
                )
            else:
                verdict_type = "LOW_VOLUME"
                reason = (
                    f"{entity_name} ({entity_type}) has limited statistical significance. "
                    + "; ".join(failures) + "."
                )

            # Calculate confidence modifier based on how many thresholds failed
            confidence_modifier = max(0.1, 1.0 - (len(failures) * 0.2))

            logger.debug(
                "Data quality check FAILED",
                entity=entity_name,
                verdict=verdict_type,
                failures=failures,
            )

            return DataQualityVerdict(
                is_sufficient=False,
                verdict=verdict_type,
                reason=reason,
                confidence_modifier=confidence_modifier,
            )

        # All checks passed
        # Calculate confidence modifier based on data richness
        confidence_modifier = 1.0
        if impressions > 50000 and spend > 5000 and conversions > 20:
            confidence_modifier = 1.0
        elif impressions > 10000 and spend > 1000 and conversions > 10:
            confidence_modifier = 0.9
        elif impressions > 5000 and spend > 500 and conversions > 5:
            confidence_modifier = 0.8
        else:
            confidence_modifier = 0.7

        return DataQualityVerdict(
            is_sufficient=True,
            verdict="SUFFICIENT",
            reason=f"{entity_name} has adequate data for reliable analysis.",
            confidence_modifier=confidence_modifier,
        )

    @classmethod
    def should_downgrade_recommendation(
        cls,
        verdict: DataQualityVerdict,
        original_priority: str,
    ) -> Tuple[str, str]:
        """
        Given a data quality verdict and the original recommendation priority,
        returns the adjusted priority and recommendation_type.

        Low-data entities should not receive aggressive FIX recommendations.
        They should be downgraded to WATCH or DONT_CHANGE.
        """
        if verdict.is_sufficient:
            return original_priority, "KEEP"

        # Downgrade logic based on verdict type
        if verdict.verdict == "NOT_ENOUGH_DATA":
            return "low", "DONT_CHANGE"
        elif verdict.verdict == "LEARNING_PERIOD":
            return "low", "DONT_CHANGE"
        elif verdict.verdict == "LOW_VOLUME":
            # Low volume but some data — downgrade to watch
            if original_priority in ("critical", "high"):
                return "medium", "WATCH"
            return "low", "WATCH"

        return original_priority, "KEEP"
