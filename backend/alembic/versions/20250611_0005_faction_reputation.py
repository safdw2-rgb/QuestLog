"""faction reputation and default factions

Revision ID: 20250611_0005
Revises: 20250611_0004
Create Date: 2025-06-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20250611_0005"
down_revision: Union[str, Sequence[str], None] = "20250611_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_FACTIONS = [
    {
        "name": "Ldvir.ua",
        "slug": "ldvir-ua",
        "icon": "🌐",
        "color": "#2563eb",
        "description": "Проекты и задачи Ldvir.ua",
    },
    {
        "name": "Семья",
        "slug": "family",
        "icon": "🏠",
        "color": "#b8860b",
        "description": "Дом, близкие и забота о семье",
    },
    {
        "name": "Музыка",
        "slug": "music",
        "icon": "🎵",
        "color": "#7c3aed",
        "description": "Творчество, инструменты и звук",
    },
    {
        "name": "Саморазвитие",
        "slug": "self-growth",
        "icon": "📚",
        "color": "#059669",
        "description": "Обучение, привычки и рост",
    },
]


def upgrade() -> None:
    op.add_column(
        "factions",
        sa.Column("reputation_points", sa.Integer(), nullable=False, server_default="0"),
    )

    for faction in DEFAULT_FACTIONS:
        op.execute(
            sa.text(
                """
                INSERT INTO factions (name, slug, icon, color, description, reputation_points)
                SELECT :name, :slug, :icon, :color, :description, 0
                WHERE NOT EXISTS (
                    SELECT 1 FROM factions WHERE slug = :slug
                )
                """
            ).bindparams(**faction),
        )


def downgrade() -> None:
    op.drop_column("factions", "reputation_points")
