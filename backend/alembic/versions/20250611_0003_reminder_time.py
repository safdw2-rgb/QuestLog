"""add reminder_time to quests

Revision ID: 20250611_0003
Revises: 20250611_0002
Create Date: 2025-06-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20250611_0003"
down_revision: Union[str, Sequence[str], None] = "20250611_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "quests",
        sa.Column("reminder_time", sa.DateTime(timezone=True), nullable=True),
    )

    # Ежедневные квесты: «время оповещения» переносим из deadline в reminder_time
    op.execute(
        """
        UPDATE quests
        SET reminder_time = deadline
        WHERE quest_type = 'daily' AND deadline IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE quests
        SET deadline = NULL
        WHERE quest_type = 'daily'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE quests
        SET deadline = reminder_time
        WHERE quest_type = 'daily' AND reminder_time IS NOT NULL
        """
    )
    op.drop_column("quests", "reminder_time")
