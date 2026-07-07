"""users and adventurer auth link

Revision ID: 20250614_0008
Revises: 20250613_0007
Create Date: 2025-06-14

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from passlib.context import CryptContext

revision: str = "20250614_0008"
down_revision: Union[str, None] = "20250613_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
LEGACY_DEV_PASSWORD = "questlog-dev"


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.add_column("adventurers", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_index("ix_adventurers_user_id", "adventurers", ["user_id"], unique=True)

    connection = op.get_bind()
    legacy_hash = pwd_context.hash(LEGACY_DEV_PASSWORD)
    connection.execute(
        sa.text(
            """
            INSERT INTO users (email, hashed_password, is_active)
            VALUES ('hero@questlog.local', :hashed_password, true)
            """
        ),
        {"hashed_password": legacy_hash},
    )
    connection.execute(
        sa.text("UPDATE adventurers SET user_id = 1 WHERE id = 1"),
    )

    op.create_foreign_key(
        "fk_adventurers_user_id",
        "adventurers",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.alter_column("adventurers", "user_id", nullable=False)


def downgrade() -> None:
    op.drop_constraint("fk_adventurers_user_id", "adventurers", type_="foreignkey")
    op.drop_index("ix_adventurers_user_id", table_name="adventurers")
    op.drop_column("adventurers", "user_id")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
