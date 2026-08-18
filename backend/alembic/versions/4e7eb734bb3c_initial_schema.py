"""initial_schema

Revision ID: 4e7eb734bb3c
Revises: 
Create Date: 2026-08-17 21:15:28.432439
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e7eb734bb3c'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create Users ──
    op.create_table('users',
        sa.Column('firebase_uid', sa.String(length=128), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('plan_id', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_firebase_uid'), 'users', ['firebase_uid'], unique=True)

    # ── 2. Create Subscriptions ──
    op.create_table('subscriptions',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('plan', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('razorpay_customer_id', sa.String(length=100), nullable=True),
        sa.Column('razorpay_subscription_id', sa.String(length=100), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # ── 3. Create Meta Connections ──
    op.create_table('meta_connections',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('meta_user_id', sa.String(length=128), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('access_token_encrypted', sa.Text(), nullable=False),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sync_status', sa.String(length=50), nullable=True),
        sa.Column('last_sync_error', sa.Text(), nullable=True),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('meta_user_id')
    )

    # ── 4. Create Meta Ad Accounts ──
    op.create_table('meta_ad_accounts',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('meta_connection_id', sa.Uuid(), nullable=False),
        sa.Column('meta_account_id', sa.String(length=128), nullable=False),
        sa.Column('account_name', sa.String(length=255), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False),
        sa.Column('timezone', sa.String(length=100), nullable=False),
        sa.Column('account_status', sa.Integer(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['meta_connection_id'], ['meta_connections.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_meta_ad_accounts_meta_account_id'), 'meta_ad_accounts', ['meta_account_id'], unique=True)

    # ── 5. Create Campaigns ──
    op.create_table('campaigns',
        sa.Column('ad_account_id', sa.Uuid(), nullable=False),
        sa.Column('meta_campaign_id', sa.String(length=128), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('objective', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('buying_type', sa.String(length=50), nullable=False),
        sa.Column('daily_budget', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('lifetime_budget', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['ad_account_id'], ['meta_ad_accounts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_campaigns_meta_campaign_id'), 'campaigns', ['meta_campaign_id'], unique=True)

    # ── 6. Create Ad Sets ──
    op.create_table('ad_sets',
        sa.Column('campaign_id', sa.Uuid(), nullable=False),
        sa.Column('meta_adset_id', sa.String(length=128), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('optimization_goal', sa.String(length=100), nullable=False),
        sa.Column('billing_event', sa.String(length=100), nullable=False),
        sa.Column('daily_budget', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('lifetime_budget', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ad_sets_meta_adset_id'), 'ad_sets', ['meta_adset_id'], unique=True)

    # ── 7. Create Ads (Without Creative FK to avoid circular locking) ──
    op.create_table('ads',
        sa.Column('ad_set_id', sa.Uuid(), nullable=False),
        sa.Column('meta_ad_id', sa.String(length=128), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('creative_id', sa.Uuid(), nullable=True),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['ad_set_id'], ['ad_sets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ads_meta_ad_id'), 'ads', ['meta_ad_id'], unique=True)

    # ── 8. Create Creatives (With Ad FK) ──
    op.create_table('creatives',
        sa.Column('meta_creative_id', sa.String(length=128), nullable=False),
        sa.Column('ad_id', sa.Uuid(), nullable=True),
        sa.Column('headline', sa.Text(), nullable=True),
        sa.Column('primary_text', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('call_to_action', sa.String(length=100), nullable=True),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('video_id', sa.String(length=100), nullable=True),
        sa.Column('creative_type', sa.String(length=50), nullable=True),
        sa.Column('landing_page_url', sa.Text(), nullable=True),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['ad_id'], ['ads.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_creatives_meta_creative_id'), 'creatives', ['meta_creative_id'], unique=True)

    # ── 9. Add Circular FK from Ads back to Creatives ──
    op.create_foreign_key(
        'fk_ads_creative_id',
        'ads',
        'creatives',
        ['creative_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # ── 10. Create Metrics & Recommendations ──
    op.create_table('ad_breakdown_daily_metrics',
        sa.Column('ad_id', sa.Uuid(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('breakdown_type', sa.String(length=50), nullable=False),
        sa.Column('breakdown_value', sa.String(length=100), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('reach', sa.Integer(), nullable=True),
        sa.Column('frequency', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('spend', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('clicks', sa.Integer(), nullable=True),
        sa.Column('link_clicks', sa.Integer(), nullable=True),
        sa.Column('ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('link_ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('link_cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpm', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('actions', sa.JSON(), nullable=True),
        sa.Column('leads', sa.Integer(), nullable=True),
        sa.Column('purchases', sa.Integer(), nullable=True),
        sa.Column('revenue', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpl', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpp', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('roas', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.ForeignKeyConstraint(['ad_id'], ['ads.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ad_id', 'date', 'breakdown_type', 'breakdown_value', name='uq_ad_breakdown_daily_metrics_key')
    )

    op.create_table('ad_daily_metrics',
        sa.Column('ad_id', sa.Uuid(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('reach', sa.Integer(), nullable=True),
        sa.Column('frequency', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('spend', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('clicks', sa.Integer(), nullable=True),
        sa.Column('link_clicks', sa.Integer(), nullable=True),
        sa.Column('ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('link_ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('link_cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpm', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('actions', sa.JSON(), nullable=True),
        sa.Column('leads', sa.Integer(), nullable=True),
        sa.Column('purchases', sa.Integer(), nullable=True),
        sa.Column('revenue', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpl', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpp', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('roas', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.ForeignKeyConstraint(['ad_id'], ['ads.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ad_id', 'date', name='uq_ad_daily_metrics_date')
    )

    op.create_table('ad_metrics_aggregate',
        sa.Column('ad_id', sa.Uuid(), nullable=False),
        sa.Column('window', sa.String(length=10), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('reach', sa.Integer(), nullable=True),
        sa.Column('frequency', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('spend', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('clicks', sa.Integer(), nullable=True),
        sa.Column('link_clicks', sa.Integer(), nullable=True),
        sa.Column('ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('link_ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('link_cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpm', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('actions', sa.JSON(), nullable=True),
        sa.Column('leads', sa.Integer(), nullable=True),
        sa.Column('purchases', sa.Integer(), nullable=True),
        sa.Column('revenue', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpl', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpp', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('roas', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.ForeignKeyConstraint(['ad_id'], ['ads.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ad_id', 'window', name='uq_ad_metrics_aggregate_window')
    )

    op.create_table('ai_recommendations',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('ad_account_id', sa.Uuid(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.Uuid(), nullable=False),
        sa.Column('recommendation_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('confidence_score', sa.Numeric(precision=5, scale=4), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('supporting_metrics', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['ad_account_id'], ['meta_ad_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('campaign_daily_metrics',
        sa.Column('campaign_id', sa.Uuid(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('reach', sa.Integer(), nullable=True),
        sa.Column('frequency', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('spend', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('clicks', sa.Integer(), nullable=True),
        sa.Column('link_clicks', sa.Integer(), nullable=True),
        sa.Column('ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('link_ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('link_cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpm', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('actions', sa.JSON(), nullable=True),
        sa.Column('leads', sa.Integer(), nullable=True),
        sa.Column('purchases', sa.Integer(), nullable=True),
        sa.Column('revenue', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpl', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpp', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('roas', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('campaign_id', 'date', name='uq_campaign_daily_metrics_date')
    )

    op.create_table('campaign_metrics_aggregate',
        sa.Column('campaign_id', sa.Uuid(), nullable=False),
        sa.Column('window', sa.String(length=10), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('reach', sa.Integer(), nullable=True),
        sa.Column('frequency', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('spend', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('clicks', sa.Integer(), nullable=True),
        sa.Column('link_clicks', sa.Integer(), nullable=True),
        sa.Column('ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('link_ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('link_cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpm', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('actions', sa.JSON(), nullable=True),
        sa.Column('leads', sa.Integer(), nullable=True),
        sa.Column('purchases', sa.Integer(), nullable=True),
        sa.Column('revenue', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpl', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpp', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('roas', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('campaign_id', 'window', name='uq_campaign_metrics_aggregate_window')
    )

    op.create_table('adset_daily_metrics',
        sa.Column('ad_set_id', sa.Uuid(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('reach', sa.Integer(), nullable=True),
        sa.Column('frequency', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('spend', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('clicks', sa.Integer(), nullable=True),
        sa.Column('link_clicks', sa.Integer(), nullable=True),
        sa.Column('ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('link_ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('link_cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpm', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('actions', sa.JSON(), nullable=True),
        sa.Column('leads', sa.Integer(), nullable=True),
        sa.Column('purchases', sa.Integer(), nullable=True),
        sa.Column('revenue', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpl', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpp', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('roas', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.ForeignKeyConstraint(['ad_set_id'], ['ad_sets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ad_set_id', 'date', name='uq_adset_daily_metrics_date')
    )

    op.create_table('adset_metrics_aggregate',
        sa.Column('ad_set_id', sa.Uuid(), nullable=False),
        sa.Column('window', sa.String(length=10), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('impressions', sa.Integer(), nullable=True),
        sa.Column('reach', sa.Integer(), nullable=True),
        sa.Column('frequency', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('spend', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('clicks', sa.Integer(), nullable=True),
        sa.Column('link_clicks', sa.Integer(), nullable=True),
        sa.Column('ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('link_ctr', sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column('cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('link_cpc', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpm', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('actions', sa.JSON(), nullable=True),
        sa.Column('leads', sa.Integer(), nullable=True),
        sa.Column('purchases', sa.Integer(), nullable=True),
        sa.Column('revenue', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpl', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('cpp', sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column('roas', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.ForeignKeyConstraint(['ad_set_id'], ['ad_sets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('ad_set_id', 'window', name='uq_adset_metrics_aggregate_window')
    )


def downgrade() -> None:
    # ── 1. Drop Circular FK from Ads ──
    op.drop_constraint('fk_ads_creative_id', 'ads', type_='foreignkey')

    # ── 2. Drop all tables in sequence ──
    op.drop_table('adset_metrics_aggregate')
    op.drop_table('adset_daily_metrics')
    op.drop_table('campaign_metrics_aggregate')
    op.drop_table('campaign_daily_metrics')
    op.drop_table('ai_recommendations')
    op.drop_table('ad_breakdown_daily_metrics')
    op.drop_table('ad_daily_metrics')
    op.drop_table('ad_metrics_aggregate')
    
    op.drop_index(op.f('ix_creatives_meta_creative_id'), table_name='creatives')
    op.drop_table('creatives')
    
    op.drop_index(op.f('ix_ads_meta_ad_id'), table_name='ads')
    op.drop_table('ads')
    
    op.drop_index(op.f('ix_ad_sets_meta_adset_id'), table_name='ad_sets')
    op.drop_table('ad_sets')
    
    op.drop_index(op.f('ix_campaigns_meta_campaign_id'), table_name='campaigns')
    op.drop_table('campaigns')
    
    op.drop_index(op.f('ix_meta_ad_accounts_meta_account_id'), table_name='meta_ad_accounts')
    op.drop_table('meta_ad_accounts')
    
    op.drop_table('subscriptions')
    op.drop_table('meta_connections')
    
    op.drop_index(op.f('ix_users_firebase_uid'), table_name='users')
    op.drop_table('users')
