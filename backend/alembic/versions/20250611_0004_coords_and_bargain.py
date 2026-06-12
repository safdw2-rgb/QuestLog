"""quest coordinates and bargain flag

Revision ID: 20250611_0004
Revises: 20250611_0003
Create Date: 2025-06-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20250611_0004"
down_revision: Union[str, Sequence[str], None] = "20250611_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("quests", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("quests", sa.Column("longitude", sa.Float(), nullable=True))
    op.add_column(
        "quests",
        sa.Column("bargained", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("quests", "bargained")
    op.drop_column("quests", "longitude")
    op.drop_column("quests", "latitude")
