import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.config import settings
from app.db.session import async_session_factory
from app.models.enums import QuestStatus, QuestType
from app.models.quest import Quest

logger = logging.getLogger(__name__)


def _shift_reminder_to_today(reminder_time: datetime, tz: ZoneInfo) -> datetime:
    """Сохраняет время оповещения, переносит дату на текущий день (после полуночи)."""
    local = reminder_time.astimezone(tz)
    today = datetime.now(tz).date()
    return datetime(
        today.year,
        today.month,
        today.day,
        local.hour,
        local.minute,
        local.second,
        tzinfo=tz,
    )


async def reset_daily_quests() -> int:
    """
    Сбрасывает выполненные и проваленные ежедневные квесты в active.
    Время оповещения (reminder_time) сохраняется, дата сдвигается на новый день.
    """
    tz = ZoneInfo(settings.daily_reset_timezone)

    async with async_session_factory() as db:
        stmt = (
            select(Quest)
            .where(Quest.quest_type == QuestType.DAILY)
            .where(Quest.status.in_([QuestStatus.COMPLETED, QuestStatus.FAILED]))
        )
        result = await db.execute(stmt)
        quests = list(result.scalars().all())

        for quest in quests:
            # Проваленные дейлики сбрасываются так же чисто, как выполненные.
            quest.status = QuestStatus.ACTIVE
            quest.completed_at = None
            quest.failed_at = None
            quest.fail_reason = None
            quest.xp_earned = 0
            quest.gold_earned = 0
            if quest.reminder_time is not None:
                quest.reminder_time = _shift_reminder_to_today(
                    quest.reminder_time, tz
                )

        await db.commit()

        count = len(quests)
        if count:
            logger.info("Daily quest reset: %s quest(s) → active", count)
        else:
            logger.info("Daily quest reset: nothing to reset")
        return count
