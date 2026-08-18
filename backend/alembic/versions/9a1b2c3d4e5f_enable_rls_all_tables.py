"""enable_rls_all_tables

Revision ID: 9a1b2c3d4e5f
Revises: 8d0f4c870a14
Create Date: 2026-08-18 08:55:00.000000
"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '9a1b2c3d4e5f'
down_revision: Union[str, None] = '8d0f4c870a14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = [
    "users",
    "subscriptions",
    "subscription_addons",
    "meta_connections",
    "meta_ad_accounts",
    "campaigns",
    "ad_sets",
    "ads",
    "creatives",
    "ai_recommendations",
    "campaign_daily_metrics",
    "ad_set_daily_metrics",
    "adset_daily_metrics",
    "ad_daily_metrics",
    "ad_breakdown_daily_metrics",
    "campaign_metrics_aggregates",
    "campaign_metrics_aggregate",
    "ad_set_metrics_aggregates",
    "adset_metrics_aggregate",
    "ad_metrics_aggregates",
    "ad_metrics_aggregate",
    "alembic_version",
]


def upgrade() -> None:
    """Enable Row Level Security (RLS) on all public schema tables in PostgreSQL."""
    for table in TABLES:
        op.execute(f"ALTER TABLE IF EXISTS public.{table} ENABLE ROW LEVEL SECURITY;")


def downgrade() -> None:
    """Disable Row Level Security (RLS) on all public schema tables in PostgreSQL."""
    for table in TABLES:
        op.execute(f"ALTER TABLE IF EXISTS public.{table} DISABLE ROW LEVEL SECURITY;")
