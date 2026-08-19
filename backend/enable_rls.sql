-- =============================================================================
-- Digital Growth Studio — Supabase Security Fix: Enable Row Level Security (RLS)
-- Resolves all RLS Disabled in Public Security Advisor warnings in Supabase.
-- =============================================================================

-- Enable Row Level Security (RLS) on all public tables (including singular/plural variants)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaign_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_set_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.adset_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_breakdown_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaign_metrics_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaign_metrics_aggregate ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_set_metrics_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.adset_metrics_aggregate ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_metrics_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_metrics_aggregate ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alembic_version ENABLE ROW LEVEL SECURITY;

-- Additional tables with RLS Disabled in Public Security Advisor warnings
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.account_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_daily_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_weekly_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ml_feature_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.optimization_actions ENABLE ROW LEVEL SECURITY;

