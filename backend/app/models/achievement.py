from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AchievementConditionType, AchievementRarity

if TYPE_CHECKING:
    from app.models.adventurer import Adventurer


class Achievement(Base):
    """
    Определение достижения.

    condition_payload — параметры условия, например:
      {"count": 10} для QUESTS_COMPLETED
      {"faction_slug": "health", "count": 5} для FACTION_QUESTS
    """

    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    title: Mapped[str] = mapped_column(String(128))
    description: Mapped[str] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(32), nullable=True)

    rarity: Mapped[AchievementRarity] = mapped_column(
        default=AchievementRarity.COMMON, server_default=AchievementRarity.COMMON.value
    )
    condition_type: Mapped[AchievementConditionType] = mapped_column()
    condition_payload: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}")

    xp_reward: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    gold_reward: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_secret: Mapped[bool] = mapped_column(default=False, server_default="false")

    unlocks: Mapped[list["AdventurerAchievement"]] = relationship(back_populates="achievement")


class AdventurerAchievement(Base):
    """Факт разблокировки достижения конкретным игроком."""

    __tablename__ = "adventurer_achievements"
    __table_args__ = (UniqueConstraint("adventurer_id", "achievement_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    adventurer_id: Mapped[int] = mapped_column(ForeignKey("adventurers.id"), index=True)
    achievement_id: Mapped[int] = mapped_column(ForeignKey("achievements.id"), index=True)

    unlocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    adventurer: Mapped["Adventurer"] = relationship(back_populates="achievements")
    achievement: Mapped["Achievement"] = relationship(back_populates="unlocks")
