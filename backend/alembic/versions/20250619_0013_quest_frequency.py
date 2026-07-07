"""quest frequency for daily quests

Revision ID: 20250619_0013
Revises: 20250618_0012
Create Date: 2025-06-19

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20250619_0013"
down_revision: Union[str, None] = "20250618_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

quest_frequency_enum = sa.Enum(
    "daily",
    "every_other_day",
    "three_days",
    "weekly",
    name="questfrequency",
)


def upgrade() -> None:
    quest_frequency_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "quests",
        sa.Column(
            "frequency",
            quest_frequency_enum,
            nullable=False,
            server_default="daily",
        ),
    )


def downgrade() -> None:
    op.drop_column("quests", "frequency")
    quest_frequency_enum.drop(op.get_bind(), checkfirst=True)
