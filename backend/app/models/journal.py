from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import JournalEntryType, pg_enum

if TYPE_CHECKING:
    from app.models.adventurer import Adventurer
    from app.models.quest import Quest


class JournalEntry(Base):
    """Запись в квестовом дневнике — прогресс, итог, провал, лор от игрока."""

    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    adventurer_id: Mapped[int] = mapped_column(ForeignKey("adventurers.id"), index=True)
    quest_id: Mapped[int | None] = mapped_column(
        ForeignKey("quests.id"), nullable=True, index=True
    )

    entry_type: Mapped[JournalEntryType] = mapped_column(pg_enum(JournalEntryType))
    content: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    adventurer: Mapped["Adventurer"] = relationship(back_populates="journal_entries")
    quest: Mapped["Quest | None"] = relationship(back_populates="journal_entries")
