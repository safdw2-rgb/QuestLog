from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.achievement import AdventurerAchievement
    from app.models.adventurer_faction_reputation import AdventurerFactionReputation
    from app.models.journal import JournalEntry
    from app.models.quest import Quest
    from app.models.user import User


class Adventurer(Base):
    """
    Профиль игрока — накопленный опыт, золото и уровень.
    Один пользователь = один искатель приключений.
    """

    __tablename__ = "adventurers"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        index=True,
    )
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(128))

    experience_points: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    gold: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    level: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    lore: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="adventurer")
    quests: Mapped[list["Quest"]] = relationship(back_populates="adventurer")
    achievements: Mapped[list["AdventurerAchievement"]] = relationship(
        back_populates="adventurer"
    )
    journal_entries: Mapped[list["JournalEntry"]] = relationship(
        back_populates="adventurer"
    )
    faction_reputations: Mapped[list["AdventurerFactionReputation"]] = relationship(
        back_populates="adventurer",
    )
