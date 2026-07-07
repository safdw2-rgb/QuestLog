"""per-adventurer faction reputation

Revision ID: 20250615_0009
Revises: 20250614_0008
Create Date: 2025-06-15

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20250615_0009"
down_revision: Union[str, None] = "20250614_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "adventurer_faction_reputation",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("adventurer_id", sa.Integer(), nullable=False),
        sa.Column("faction_id", sa.Integer(), nullable=False),
        sa.Column(
            "reputation_points",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.ForeignKeyConstraint(
            ["adventurer_id"],
            ["adventurers.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["faction_id"],
            ["factions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "adventurer_id",
            "faction_id",
            name="uq_adv_faction_rep",
        ),
    )
    op.create_index(
        "ix_adventurer_faction_reputation_adventurer_id",
        "adventurer_faction_reputation",
        ["adventurer_id"],
    )
    op.create_index(
        "ix_adventurer_faction_reputation_faction_id",
        "adventurer_faction_reputation",
        ["faction_id"],
    )

    connection = op.get_bind()

    connection.execute(
        sa.text(
            """
            INSERT INTO adventurer_faction_reputation
                (adventurer_id, faction_id, reputation_points)
            SELECT 1, id, reputation_points
            FROM factions
            WHERE EXISTS (SELECT 1 FROM adventurers WHERE id = 1)
            """
        ),
    )

    connection.execute(
        sa.text(
            """
            INSERT INTO adventurer_faction_reputation
                (adventurer_id, faction_id, reputation_points)
            SELECT a.id, f.id, 0
            FROM adventurers a
            CROSS JOIN factions f
            WHERE NOT EXISTS (
                SELECT 1
                FROM adventurer_faction_reputation r
                WHERE r.adventurer_id = a.id
                  AND r.faction_id = f.id
            )
            """
        ),
    )

    op.drop_column("factions", "reputation_points")


def downgrade() -> None:
    op.add_column(
        "factions",
        sa.Column(
            "reputation_points",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE factions AS f
            SET reputation_points = COALESCE(legacy.reputation_points, 0)
            FROM (
                SELECT faction_id, MAX(reputation_points) AS reputation_points
                FROM adventurer_faction_reputation
                GROUP BY faction_id
            ) AS legacy
            WHERE f.id = legacy.faction_id
            """
        ),
    )

    op.drop_index(
        "ix_adventurer_faction_reputation_faction_id",
        table_name="adventurer_faction_reputation",
    )
    op.drop_index(
        "ix_adventurer_faction_reputation_adventurer_id",
        table_name="adventurer_faction_reputation",
    )
    op.drop_table("adventurer_faction_reputation")
