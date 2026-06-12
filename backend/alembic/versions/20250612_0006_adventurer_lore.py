"""adventurer lore column

Revision ID: 20250612_0006
Revises: 20250611_0005
Create Date: 2025-06-12

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20250612_0006"
down_revision: Union[str, None] = "20250611_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "adventurers",
        sa.Column("lore", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("adventurers", "lore")
