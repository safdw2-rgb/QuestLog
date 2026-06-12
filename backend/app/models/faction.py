from typing import TYPE_CHECKING

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.quest import Quest


class Faction(Base):
    """
    Фракция / категория квестов: «Работа», «Здоровье», «Дом» и т.д.
    Влияет на фильтры дневника и достижения по фракциям.
    """

    __tablename__ = "factions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    icon: Mapped[str | None] = mapped_column(String(32), nullable=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)  # #RRGGBB
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    reputation_points: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )

    quests: Mapped[list["Quest"]] = relationship(back_populates="faction")
