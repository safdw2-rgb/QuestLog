"""rewards and quest notification log

Revision ID: 20250611_0002
Revises: 20250610_0001
Create Date: 2025-06-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20250611_0002"
down_revision: Union[str, Sequence[str], None] = "20250610_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_REWARDS = [
    {
        "title": "2 часа видеоигр (Baldur's Gate 3 / Forza)",
        "cost": 50,
        "description": "Заслуженный отдых за монитором — RPG или гонки на выбор.",
        "icon": "🎮",
    },
    {
        "title": "Сэмпл-пак или пресет для Serum",
        "cost": 150,
        "description": "Новые звуки для творчества — сэмплы или пресет в подарок себе.",
        "icon": "🎹",
    },
    {
        "title": "Вкусный читмил (Пицца / Бургер)",
        "cost": 100,
        "description": "Пицца или бургер без угрызений совести.",
        "icon": "🍕",
    },
    {
        "title": "Подарок для Кореллы (игрушка/лакомство)",
        "cost": 75,
        "description": "Милый сюрприз для пернатого компаньона.",
        "icon": "🦜",
    },
    {
        "title": "Законный вечер чилла (без кодинга)",
        "cost": 200,
        "description": "Вечер без кода — сериал, музыка или просто отдых.",
        "icon": "🛌",
    },
]


def upgrade() -> None:
    op.create_table(
        "rewards",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("cost", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(length=16), nullable=False, server_default="🎁"),
        sa.PrimaryKeyConstraint("id"),
    )

    rewards_table = sa.table(
        "rewards",
        sa.column("title", sa.String),
        sa.column("cost", sa.Integer),
        sa.column("description", sa.Text),
        sa.column("icon", sa.String),
    )
    op.bulk_insert(rewards_table, DEFAULT_REWARDS)

    op.create_table(
        "quest_notification_sent",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quest_id", sa.Integer(), nullable=False),
        sa.Column("notification_kind", sa.String(length=32), nullable=False),
        sa.Column("slot_key", sa.String(length=64), nullable=False),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["quest_id"], ["quests.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "quest_id",
            "notification_kind",
            "slot_key",
            name="uq_quest_notification_slot",
        ),
    )
    op.create_index(
        "ix_quest_notification_sent_quest_id",
        "quest_notification_sent",
        ["quest_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_quest_notification_sent_quest_id", table_name="quest_notification_sent")
    op.drop_table("quest_notification_sent")
    op.drop_table("rewards")
