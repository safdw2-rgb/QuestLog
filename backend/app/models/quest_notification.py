from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class QuestNotificationSent(Base):
    """Дедупликация Telegram-оповещений по квестам."""

    __tablename__ = "quest_notification_sent"
    __table_args__ = (
        UniqueConstraint(
            "quest_id",
            "notification_kind",
            "slot_key",
            name="uq_quest_notification_slot",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    quest_id: Mapped[int] = mapped_column(ForeignKey("quests.id"), index=True)
    notification_kind: Mapped[str] = mapped_column(String(32))
    slot_key: Mapped[str] = mapped_column(String(64))
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
