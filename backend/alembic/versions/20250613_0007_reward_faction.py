"""reward faction_id

Revision ID: 20250613_0007
Revises: 20250612_0006
Create Date: 2025-06-13

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20250613_0007"
down_revision: Union[str, None] = "20250612_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "rewards",
        sa.Column("faction_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_rewards_faction_id",
        "rewards",
        "factions",
        ["faction_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_rewards_faction_id", "rewards", type_="foreignkey")
    op.drop_column("rewards", "faction_id")
