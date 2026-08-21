"""add_ai_assistant_feature

Revision ID: fe02658535a0
Revises: ffde86fa1798
Create Date: 2026-08-21 08:40:19.717349
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fe02658535a0'
down_revision: Union[str, None] = 'ffde86fa1798'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create ai_chat_conversations (depends only on users and meta_ad_accounts)
    op.create_table('ai_chat_conversations',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('ad_account_id', sa.Uuid(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['ad_account_id'], ['meta_ad_accounts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    # 2. Create ai_chat_messages (omit foreign key to ai_credit_transactions to break cycle)
    op.create_table('ai_chat_messages',
    sa.Column('conversation_id', sa.Uuid(), nullable=False),
    sa.Column('role', sa.String(length=50), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('gemini_status', sa.String(length=50), nullable=True),
    sa.Column('credit_transaction_id', sa.Uuid(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['conversation_id'], ['ai_chat_conversations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    # 3. Create ai_credit_transactions (references both tables safely now)
    op.create_table('ai_credit_transactions',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('ad_account_id', sa.Uuid(), nullable=False),
    sa.Column('conversation_id', sa.Uuid(), nullable=True),
    sa.Column('message_id', sa.Uuid(), nullable=True),
    sa.Column('credit_amount', sa.Integer(), nullable=False),
    sa.Column('reason', sa.String(length=255), nullable=False),
    sa.Column('gemini_model', sa.String(length=100), nullable=False),
    sa.Column('request_reference_id', sa.String(length=100), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['ad_account_id'], ['meta_ad_accounts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['conversation_id'], ['ai_chat_conversations.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['message_id'], ['ai_chat_messages.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    # 4. Add the deferred foreign key to ai_chat_messages
    op.create_foreign_key(
        'fk_chat_messages_credit_txn',
        'ai_chat_messages',
        'ai_credit_transactions',
        ['credit_transaction_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Enable Row Level Security (RLS)
    op.execute("ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;")


def downgrade() -> None:
    # Disable Row Level Security (RLS)
    op.execute("ALTER TABLE public.ai_chat_conversations DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.ai_chat_messages DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE public.ai_credit_transactions DISABLE ROW LEVEL SECURITY;")

    # Drop deferred foreign key constraint
    op.drop_constraint('fk_chat_messages_credit_txn', 'ai_chat_messages', type_='foreignkey')

    op.drop_table('ai_credit_transactions')
    op.drop_table('ai_chat_messages')
    op.drop_table('ai_chat_conversations')
