"""initial schema

Revision ID: 20250610_0001
Revises:
Create Date: 2025-06-10

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20250610_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

quest_type_enum = postgresql.ENUM(
    "main", "side", "daily", "bounty", "exploration", "boss",
    name="questtype",
    create_type=False,
)
quest_status_enum = postgresql.ENUM(
    "active", "completed", "failed", "deferred", "abandoned",
    name="queststatus",
    create_type=False,
)
quest_difficulty_enum = postgresql.ENUM(
    "trivial", "easy", "normal", "hard", "legendary",
    name="questdifficulty",
    create_type=False,
)
step_status_enum = postgresql.ENUM(
    "pending", "completed", "skipped",
    name="stepstatus",
    create_type=False,
)
place_type_enum = postgresql.ENUM(
    "settlement", "tavern", "wilderness", "dungeon",
    "stronghold", "shrine", "market", "unknown",
    name="placetype",
    create_type=False,
)
achievement_rarity_enum = postgresql.ENUM(
    "common", "uncommon", "rare", "epic", "legendary",
    name="achievementrarity",
    create_type=False,
)
achievement_condition_type_enum = postgresql.ENUM(
    "quests_completed", "quests_failed", "streak_days", "boss_defeated",
    "gold_earned", "xp_earned", "faction_quests", "deadline_hero",
    name="achievementconditiontype",
    create_type=False,
)
journal_entry_type_enum = postgresql.ENUM(
    "progress", "completion", "failure", "lore",
    name="journalentrytype",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()

    quest_type_enum.create(bind, checkfirst=True)
    quest_status_enum.create(bind, checkfirst=True)
    quest_difficulty_enum.create(bind, checkfirst=True)
    step_status_enum.create(bind, checkfirst=True)
    place_type_enum.create(bind, checkfirst=True)
    achievement_rarity_enum.create(bind, checkfirst=True)
    achievement_condition_type_enum.create(bind, checkfirst=True)
    journal_entry_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "adventurers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=128), nullable=False),
        sa.Column("experience_points", sa.Integer(), server_default="0", nullable=False),
        sa.Column("gold", sa.Integer(), server_default="0", nullable=False),
        sa.Column("level", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_adventurers_username", "adventurers", ["username"])

    op.create_table(
        "factions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("icon", sa.String(length=32), nullable=True),
        sa.Column("color", sa.String(length=7), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_factions_slug", "factions", ["slug"])

    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("place_type", place_type_enum, server_default="unknown", nullable=False),
        sa.Column("latitude", sa.Numeric(9, 6), nullable=True),
        sa.Column("longitude", sa.Numeric(9, 6), nullable=True),
        sa.Column("address", sa.String(length=256), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "achievements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("icon", sa.String(length=32), nullable=True),
        sa.Column("rarity", achievement_rarity_enum, server_default="common", nullable=False),
        sa.Column("condition_type", achievement_condition_type_enum, nullable=False),
        sa.Column("condition_payload", postgresql.JSONB(astext_type=sa.Text()), server_default="{}", nullable=False),
        sa.Column("xp_reward", sa.Integer(), server_default="0", nullable=False),
        sa.Column("gold_reward", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_secret", sa.Boolean(), server_default="false", nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_achievements_code", "achievements", ["code"])

    op.create_table(
        "quests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("adventurer_id", sa.Integer(), nullable=False),
        sa.Column("faction_id", sa.Integer(), nullable=True),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column("parent_quest_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("quest_type", quest_type_enum, server_default="side", nullable=False),
        sa.Column("status", quest_status_enum, server_default="active", nullable=False),
        sa.Column("difficulty", quest_difficulty_enum, server_default="normal", nullable=False),
        sa.Column("xp_reward", sa.Integer(), server_default="0", nullable=False),
        sa.Column("gold_reward", sa.Integer(), server_default="0", nullable=False),
        sa.Column("xp_earned", sa.Integer(), server_default="0", nullable=False),
        sa.Column("gold_earned", sa.Integer(), server_default="0", nullable=False),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fail_reason", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["adventurer_id"], ["adventurers.id"]),
        sa.ForeignKeyConstraint(["faction_id"], ["factions.id"]),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["parent_quest_id"], ["quests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_quests_adventurer_id", "quests", ["adventurer_id"])
    op.create_index("ix_quests_faction_id", "quests", ["faction_id"])
    op.create_index("ix_quests_location_id", "quests", ["location_id"])
    op.create_index("ix_quests_parent_quest_id", "quests", ["parent_quest_id"])
    op.create_index("ix_quests_quest_type", "quests", ["quest_type"])
    op.create_index("ix_quests_status", "quests", ["status"])

    op.create_table(
        "adventurer_achievements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("adventurer_id", sa.Integer(), nullable=False),
        sa.Column("achievement_id", sa.Integer(), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["achievement_id"], ["achievements.id"]),
        sa.ForeignKeyConstraint(["adventurer_id"], ["adventurers.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("adventurer_id", "achievement_id"),
    )
    op.create_index("ix_adventurer_achievements_adventurer_id", "adventurer_achievements", ["adventurer_id"])
    op.create_index("ix_adventurer_achievements_achievement_id", "adventurer_achievements", ["achievement_id"])

    op.create_table(
        "journal_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("adventurer_id", sa.Integer(), nullable=False),
        sa.Column("quest_id", sa.Integer(), nullable=True),
        sa.Column("entry_type", journal_entry_type_enum, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["adventurer_id"], ["adventurers.id"]),
        sa.ForeignKeyConstraint(["quest_id"], ["quests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_journal_entries_adventurer_id", "journal_entries", ["adventurer_id"])
    op.create_index("ix_journal_entries_quest_id", "journal_entries", ["quest_id"])

    op.create_table(
        "quest_steps",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quest_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", step_status_enum, server_default="pending", nullable=False),
        sa.Column("is_optional", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("xp_reward", sa.Integer(), server_default="0", nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["quest_id"], ["quests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_quest_steps_quest_id", "quest_steps", ["quest_id"])

    # Тестовый искатель для разработки API
    op.execute(
        sa.text(
            "INSERT INTO adventurers (username, display_name) VALUES ('hero', 'Герой')"
        )
    )


def downgrade() -> None:
    op.drop_index("ix_quest_steps_quest_id", table_name="quest_steps")
    op.drop_table("quest_steps")

    op.drop_index("ix_journal_entries_quest_id", table_name="journal_entries")
    op.drop_index("ix_journal_entries_adventurer_id", table_name="journal_entries")
    op.drop_table("journal_entries")

    op.drop_index("ix_adventurer_achievements_achievement_id", table_name="adventurer_achievements")
    op.drop_index("ix_adventurer_achievements_adventurer_id", table_name="adventurer_achievements")
    op.drop_table("adventurer_achievements")

    op.drop_index("ix_quests_status", table_name="quests")
    op.drop_index("ix_quests_quest_type", table_name="quests")
    op.drop_index("ix_quests_parent_quest_id", table_name="quests")
    op.drop_index("ix_quests_location_id", table_name="quests")
    op.drop_index("ix_quests_faction_id", table_name="quests")
    op.drop_index("ix_quests_adventurer_id", table_name="quests")
    op.drop_table("quests")

    op.drop_index("ix_achievements_code", table_name="achievements")
    op.drop_table("achievements")

    op.drop_table("locations")

    op.drop_index("ix_factions_slug", table_name="factions")
    op.drop_table("factions")

    op.drop_index("ix_adventurers_username", table_name="adventurers")
    op.drop_table("adventurers")

    bind = op.get_bind()
    journal_entry_type_enum.drop(bind, checkfirst=True)
    achievement_condition_type_enum.drop(bind, checkfirst=True)
    achievement_rarity_enum.drop(bind, checkfirst=True)
    place_type_enum.drop(bind, checkfirst=True)
    step_status_enum.drop(bind, checkfirst=True)
    quest_difficulty_enum.drop(bind, checkfirst=True)
    quest_status_enum.drop(bind, checkfirst=True)
    quest_type_enum.drop(bind, checkfirst=True)
