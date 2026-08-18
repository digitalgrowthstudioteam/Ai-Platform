/**
 * Digital Growth Studio — TypeScript Types
 * Shared types used across the frontend application.
 */

// ── User ─────────────────────────────────────
export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  name: string;
  plan_id: string | null;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
}

// ── Meta Connection ──────────────────────────
export interface MetaConnection {
  id: string;
  meta_user_id: string;
  status: "connected" | "expired" | "error" | "disconnected";
  last_sync_at: string | null;
  last_sync_status: "success" | "failed" | "in_progress" | null;
  last_sync_error: string | null;
  created_at: string;
}

export interface MetaAdAccount {
  id: string;
  meta_account_id: string;
  account_name: string;
  currency: string;
  timezone: string;
  account_status: number;
}

// ── Campaign Hierarchy ───────────────────────
export interface Campaign {
  id: string;
  meta_campaign_id: string;
  name: string;
  objective: string;
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
  buying_type: string;
  daily_budget: number | null;
  lifetime_budget: number | null;
}

export interface AdSet {
  id: string;
  campaign_id: string;
  meta_adset_id: string;
  name: string;
  status: string;
  optimization_goal: string;
  billing_event: string;
  daily_budget: number | null;
  lifetime_budget: number | null;
}

export interface Ad {
  id: string;
  ad_set_id: string;
  meta_ad_id: string;
  name: string;
  status: string;
  creative_id: string | null;
}

export interface Creative {
  id: string;
  meta_creative_id: string;
  ad_id: string;
  headline: string | null;
  primary_text: string | null;
  description: string | null;
  call_to_action: string | null;
  image_url: string | null;
  video_id: string | null;
  creative_type: "image" | "video" | "carousel" | "collection" | "other";
  landing_page_url: string | null;
}

// ── Metrics ──────────────────────────────────
export interface DailyMetrics {
  date: string;
  impressions: number | null;
  reach: number | null;
  frequency: number | null;
  spend: number | null;
  clicks: number | null;
  link_clicks: number | null;
  ctr: number | null;
  link_ctr: number | null;
  cpc: number | null;
  link_cpc: number | null;
  cpm: number | null;
  actions: number | null;
  leads: number | null;
  purchases: number | null;
  revenue: number | null;
  cpl: number | null;
  cpp: number | null;
  roas: number | null;
}

// ── AI Recommendations ───────────────────────
export type RecommendationType =
  | "UNDERPERFORMING_AD"
  | "WINNING_AD"
  | "CREATIVE_WINNER"
  | "CREATIVE_FATIGUE"
  | "HIGH_CPL"
  | "LOW_CTR"
  | "HIGH_CPC"
  | "HIGH_CPM"
  | "BUDGET_OPPORTUNITY"
  | "AUDIENCE_OPPORTUNITY"
  | "PLACEMENT_OPPORTUNITY"
  | "COPY_OPPORTUNITY"
  | "LEARNING_PHASE_WARNING"
  | "PERFORMANCE_DROP";

export type RecommendationPriority = "high" | "medium" | "low";

export type RecommendationStatus = "new" | "viewed" | "accepted" | "dismissed" | "expired";

export interface AIRecommendation {
  id: string;
  entity_type: "campaign" | "ad_set" | "ad" | "creative";
  entity_id: string;
  recommendation_type: RecommendationType;
  title: string;
  description: string;
  reason: string;
  confidence_score: number;
  priority: RecommendationPriority;
  supporting_metrics: Record<string, unknown>;
  status: RecommendationStatus;
  created_at: string;
  expires_at: string | null;
}

// ── Account Health ───────────────────────────
export interface HealthScoreItem {
  category: string;
  score: number;
  status: "good" | "attention" | "poor";
  description: string;
}

export interface AccountHealthScore {
  overall_score: number;
  overall_status: "good" | "attention" | "poor";
  items: HealthScoreItem[];
}

// ── Subscription ─────────────────────────────
export interface Subscription {
  id: string;
  plan: string;
  status: "trial" | "active" | "past_due" | "cancelled" | "expired";
  started_at: string;
  expires_at: string;
}

// ── Date Range ───────────────────────────────
export interface DateRange {
  start: string;
  end: string;
  preset?: string;
  comparison?: "previous_period" | "previous_year" | "none";
}

// ── API Response ─────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}
