from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PlaceType

if TYPE_CHECKING:
    from app.models.quest import Quest


class Location(Base):
    """Точка на карте — привязка квеста к реальному или абстрактному месту."""

    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    place_type: Mapped[PlaceType] = mapped_column(
        default=PlaceType.UNKNOWN, server_default=PlaceType.UNKNOWN.value
    )

    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    address: Mapped[str | None] = mapped_column(String(256), nullable=True)

    quests: Mapped[list["Quest"]] = relationship(back_populates="location")
