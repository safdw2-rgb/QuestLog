from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class MentorStudent(Base):
    """Связь наставник → ученик (один ментор, несколько учеников)."""

    __tablename__ = "mentor_students"
    __table_args__ = (
        UniqueConstraint(
            "mentor_user_id",
            "student_user_id",
            name="uq_mentor_student",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    mentor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    student_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    mentor: Mapped["User"] = relationship(
        foreign_keys=[mentor_user_id],
        back_populates="mentored_students",
    )
    student: Mapped["User"] = relationship(
        foreign_keys=[student_user_id],
        back_populates="mentor_links",
    )
