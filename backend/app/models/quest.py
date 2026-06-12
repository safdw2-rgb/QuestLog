from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import QuestDifficulty, QuestStatus, QuestType, pg_enum

if TYPE_CHECKING:
    from app.models.adventurer import Adventurer
    from app.models.faction import Faction
    from app.models.journal import JournalEntry
    from app.models.location import Location
    from app.models.quest_step import QuestStep


class Quest(Base):
    """
    Квест — центральная сущность дневника.

    Награды (xp_reward, gold_reward) задаются при создании.
    Фактически начисленные значения фиксируются в xp_earned / gold_earned
    при переходе в completed или failed (при провале — частичная или нулевая награда).
    """

    __tablename__ = "quests"

    id: Mapped[int] = mapped_column(primary_key=True)

    adventurer_id: Mapped[int] = mapped_column(ForeignKey("adventurers.id"), index=True)
    faction_id: Mapped[int | None] = mapped_column(
        ForeignKey("factions.id"), nullable=True, index=True
    )
    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id"), nullable=True, index=True
    )
    parent_quest_id: Mapped[int | None] = mapped_column(
        ForeignKey("quests.id"), nullable=True, index=True
    )

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    quest_type: Mapped[QuestType] = mapped_column(
        pg_enum(QuestType),
        default=QuestType.SIDE,
        server_default=QuestType.SIDE.value,
        index=True,
    )
    status: Mapped[QuestStatus] = mapped_column(
        pg_enum(QuestStatus),
        default=QuestStatus.ACTIVE,
        server_default=QuestStatus.ACTIVE.value,
        index=True,
    )
    difficulty: Mapped[QuestDifficulty] = mapped_column(
        pg_enum(QuestDifficulty),
        default=QuestDifficulty.NORMAL,
        server_default=QuestDifficulty.NORMAL.value,
    )

    xp_reward: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    gold_reward: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    xp_earned: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    gold_earned: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reminder_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    bargained: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    fail_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    adventurer: Mapped["Adventurer"] = relationship(back_populates="quests")
    faction: Mapped["Faction | None"] = relationship(back_populates="quests")
    location: Mapped["Location | None"] = relationship(back_populates="quests")

    parent_quest: Mapped["Quest | None"] = relationship(
        remote_side="Quest.id",
        back_populates="child_quests",
    )
    child_quests: Mapped[list["Quest"]] = relationship(back_populates="parent_quest")

    steps: Mapped[list["QuestStep"]] = relationship(
        back_populates="quest",
        order_by="QuestStep.sort_order",
        cascade="all, delete-orphan",
    )
    journal_entries: Mapped[list["JournalEntry"]] = relationship(
        back_populates="quest",
        cascade="all, delete-orphan",
    )
