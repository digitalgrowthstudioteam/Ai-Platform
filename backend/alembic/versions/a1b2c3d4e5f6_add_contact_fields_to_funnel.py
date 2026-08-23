"""add contact fields to funnel recommendations

Revision ID: a1b2c3d4e5f6
Revises: 00f6154aad58
Create Date: 2026-08-23 20:48:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '00f6154aad58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('funnel_recommendations', sa.Column('contact_name', sa.String(255), nullable=True))
    op.add_column('funnel_recommendations', sa.Column('contact_phone', sa.String(30), nullable=True))


def downgrade() -> None:
    op.drop_column('funnel_recommendations', 'contact_phone')
    op.drop_column('funnel_recommendations', 'contact_name')
