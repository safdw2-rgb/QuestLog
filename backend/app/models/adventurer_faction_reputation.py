from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.adventurer import Adventurer
    from app.models.faction import Faction


class AdventurerFactionReputation(Base):
    """Репутация конкретного героя в конкретной фракции."""

    __tablename__ = "adventurer_faction_reputation"
    __table_args__ = (
        UniqueConstraint("adventurer_id", "faction_id", name="uq_adv_faction_rep"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    adventurer_id: Mapped[int] = mapped_column(
        ForeignKey("adventurers.id", ondelete="CASCADE"),
        index=True,
    )
    faction_id: Mapped[int] = mapped_column(
        ForeignKey("factions.id", ondelete="CASCADE"),
        index=True,
    )
    reputation_points: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
    )

    adventurer: Mapped["Adventurer"] = relationship(
        back_populates="faction_reputations",
    )
    faction: Mapped["Faction"] = relationship(
        back_populates="adventurer_reputations",
    )
