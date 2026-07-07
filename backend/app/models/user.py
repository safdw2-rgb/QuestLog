from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.active_effect import ActiveEffect
    from app.models.adventurer import Adventurer
    from app.models.mentor_student import MentorStudent


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    invite_code: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    password_reset_token_hash: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    password_reset_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    adventurer: Mapped["Adventurer | None"] = relationship(
        back_populates="user",
        uselist=False,
    )
    active_effects: Mapped[list["ActiveEffect"]] = relationship(
        back_populates="user",
    )
    mentored_students: Mapped[list["MentorStudent"]] = relationship(
        back_populates="mentor",
        foreign_keys="MentorStudent.mentor_user_id",
    )
    mentor_links: Mapped[list["MentorStudent"]] = relationship(
        back_populates="student",
        foreign_keys="MentorStudent.student_user_id",
    )
