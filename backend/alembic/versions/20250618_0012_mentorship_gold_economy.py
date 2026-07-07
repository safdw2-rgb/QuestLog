"""mentorship, quest creators, gold economy reward prices

Revision ID: 20250618_0012
Revises: 20250617_0011
Create Date: 2025-06-18

"""

import secrets
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20250618_0012"
down_revision: Union[str, None] = "20250617_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _generate_invite_code() -> str:
    return secrets.token_urlsafe(6).upper().replace("-", "X")[:10]


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("invite_code", sa.String(length=12), nullable=True),
    )
    op.create_index(op.f("ix_users_invite_code"), "users", ["invite_code"], unique=True)

    connection = op.get_bind()
    users = connection.execute(sa.text("SELECT id FROM users")).fetchall()
    for (user_id,) in users:
        code = _generate_invite_code()
        while connection.execute(
            sa.text("SELECT 1 FROM users WHERE invite_code = :code"),
            {"code": code},
        ).fetchone():
            code = _generate_invite_code()
        connection.execute(
            sa.text("UPDATE users SET invite_code = :code WHERE id = :id"),
            {"code": code, "id": user_id},
        )

    op.alter_column("users", "invite_code", nullable=False)

    op.create_table(
        "mentor_students",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("mentor_user_id", sa.Integer(), nullable=False),
        sa.Column("student_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["mentor_user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["student_user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "mentor_user_id",
            "student_user_id",
            name="uq_mentor_student",
        ),
    )
    op.create_index(
        op.f("ix_mentor_students_mentor_user_id"),
        "mentor_students",
        ["mentor_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_mentor_students_student_user_id"),
        "mentor_students",
        ["student_user_id"],
        unique=False,
    )

    op.add_column(
        "quests",
        sa.Column("creator_user_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_quests_creator_user_id_users",
        "quests",
        "users",
        ["creator_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_quests_creator_user_id"),
        "quests",
        ["creator_user_id"],
        unique=False,
    )

    connection.execute(
        sa.text(
            """
            UPDATE quests q
            SET creator_user_id = a.user_id
            FROM adventurers a
            WHERE q.adventurer_id = a.id AND q.creator_user_id IS NULL
            """
        )
    )

    connection.execute(
        sa.text(
            """
            UPDATE rewards SET cost = 40
            WHERE title LIKE '%2 часа видеоигр%'
            """
        )
    )
    connection.execute(
        sa.text(
            """
            UPDATE rewards SET cost = 40
            WHERE title LIKE '%Сэмпл-пак%'
            """
        )
    )
    connection.execute(
        sa.text(
            """
            UPDATE rewards SET cost = 10
            WHERE title LIKE '%читмил%'
            """
        )
    )
    connection.execute(
        sa.text(
            """
            UPDATE rewards SET cost = 15
            WHERE title LIKE '%Корелл%'
            """
        )
    )
    connection.execute(
        sa.text(
            """
            UPDATE rewards SET cost = 40
            WHERE title LIKE '%вечер чилла%'
            """
        )
    )

    existing_one_hour = connection.execute(
        sa.text("SELECT id FROM rewards WHERE title LIKE '%1 час видеоигр%' LIMIT 1")
    ).fetchone()
    if existing_one_hour is None:
        connection.execute(
            sa.text(
                """
                INSERT INTO rewards (title, cost, description, icon)
                VALUES (
                    '1 час видеоигр / отдыха',
                    20,
                    'Заслуженный час без обязанностей — игры, сериал или просто чилл.',
                    '🎮'
                )
                """
            )
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_quests_creator_user_id"), table_name="quests")
    op.drop_constraint("fk_quests_creator_user_id_users", "quests", type_="foreignkey")
    op.drop_column("quests", "creator_user_id")

    op.drop_index(op.f("ix_mentor_students_student_user_id"), table_name="mentor_students")
    op.drop_index(op.f("ix_mentor_students_mentor_user_id"), table_name="mentor_students")
    op.drop_table("mentor_students")

    op.drop_index(op.f("ix_users_invite_code"), table_name="users")
    op.drop_column("users", "invite_code")
