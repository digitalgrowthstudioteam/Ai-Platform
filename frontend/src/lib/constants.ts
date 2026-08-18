/**
 * Digital Growth Studio — Application Constants
 */

export const APP_NAME = "Digital Growth Studio";
export const APP_TAGLINE = "AI Ads Optimizer";

// Plan Configuration (not hardcoded ₹99 — uses feature entitlements)
export const PLANS = {
  EARLY_ACCESS: {
    id: "early_access",
    name: "Early Access",
    price: 99,
    currency: "INR",
    interval: "month",
    features: {
      META_ACCOUNTS: 1,
      HISTORICAL_DAYS: 30,
      AI_RECOMMENDATIONS: true,
      CREATIVE_ANALYSIS: true,
      COPY_ANALYSIS: true,
      SYNC_FREQUENCY: "daily",
    },
  },
} as const;

// Recommendation Types
export const RECOMMENDATION_TYPES = {
  UNDERPERFORMING_AD: "UNDERPERFORMING_AD",
  WINNING_AD: "WINNING_AD",
  CREATIVE_WINNER: "CREATIVE_WINNER",
  CREATIVE_FATIGUE: "CREATIVE_FATIGUE",
  HIGH_CPL: "HIGH_CPL",
  LOW_CTR: "LOW_CTR",
  HIGH_CPC: "HIGH_CPC",
  HIGH_CPM: "HIGH_CPM",
  BUDGET_OPPORTUNITY: "BUDGET_OPPORTUNITY",
  AUDIENCE_OPPORTUNITY: "AUDIENCE_OPPORTUNITY",
  PLACEMENT_OPPORTUNITY: "PLACEMENT_OPPORTUNITY",
  COPY_OPPORTUNITY: "COPY_OPPORTUNITY",
  LEARNING_PHASE_WARNING: "LEARNING_PHASE_WARNING",
  PERFORMANCE_DROP: "PERFORMANCE_DROP",
} as const;

// Priority Levels
export const PRIORITIES = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

// Subscription Statuses
export const SUBSCRIPTION_STATUSES = {
  TRIAL: "trial",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

// Date Range Presets
export const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 14 days", value: "14d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Custom", value: "custom" },
] as const;
