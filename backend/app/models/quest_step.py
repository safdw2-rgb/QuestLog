from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import StepStatus

if TYPE_CHECKING:
    from app.models.quest import Quest


class QuestStep(Base):
    """Этап квеста — подзадача внутри одного задания."""

    __tablename__ = "quest_steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    quest_id: Mapped[int] = mapped_column(ForeignKey("quests.id"), index=True)

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    status: Mapped[StepStatus] = mapped_column(
        default=StepStatus.PENDING, server_default=StepStatus.PENDING.value
    )
    is_optional: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    xp_reward: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    quest: Mapped["Quest"] = relationship(back_populates="steps")
