import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select

from app.config import settings
from app.db.session import async_session_factory
from app.models.enums import QuestFrequency, QuestStatus, QuestType
from app.models.quest import Quest
from app.models.quest_notification import QuestNotificationSent
from app.services.quest_reminders import KIND_ALARM

logger = logging.getLogger(__name__)

FREQUENCY_RESET_DAYS: dict[QuestFrequency, int] = {
    QuestFrequency.DAILY: 1,
    QuestFrequency.EVERY_OTHER_DAY: 2,
    QuestFrequency.THREE_DAYS: 3,
    QuestFrequency.WEEKLY: 7,
}


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


def _days_since(reference: datetime, tz: ZoneInfo) -> int:
    today = datetime.now(tz).date()
    reference_date = reference.astimezone(tz).date()
    return (today - reference_date).days


def _should_reset_daily_quest(quest: Quest, tz: ZoneInfo) -> bool:
    reference = quest.completed_at or quest.failed_at
    if reference is None:
        return True

    threshold = FREQUENCY_RESET_DAYS.get(quest.frequency, 1)
    return _days_since(reference, tz) >= threshold


async def _reset_daily_alarm_notifications(db, tz: ZoneInfo) -> int:
    """Сбрасывает флаги срабатывания будильников для всех ежедневных квестов."""
    stmt = select(Quest.id).where(Quest.quest_type == QuestType.DAILY)
    result = await db.execute(stmt)
    daily_ids = list(result.scalars().all())
    if not daily_ids:
        return 0

    delete_stmt = delete(QuestNotificationSent).where(
        QuestNotificationSent.quest_id.in_(daily_ids),
        QuestNotificationSent.notification_kind == KIND_ALARM,
    )
    delete_result = await db.execute(delete_stmt)
    return delete_result.rowcount or 0


async def reset_daily_quests() -> int:
    """
    Сбрасывает выполненные и проваленные ежедневные квесты в active,
    если с даты последнего завершения/провала прошло достаточно дней
    согласно frequency квеста.
    """
    tz = ZoneInfo(settings.daily_reset_timezone)

    async with async_session_factory() as db:
        stmt = (
            select(Quest)
            .where(Quest.quest_type == QuestType.DAILY)
            .where(Quest.status.in_([QuestStatus.COMPLETED, QuestStatus.FAILED]))
        )
        result = await db.execute(stmt)
        candidates = list(result.scalars().all())

        quests_to_reset = [
            quest for quest in candidates if _should_reset_daily_quest(quest, tz)
        ]

        for quest in quests_to_reset:
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

        alarms_cleared = await _reset_daily_alarm_notifications(db, tz)

        await db.commit()

        count = len(quests_to_reset)
        if count:
            logger.info(
                "Daily quest reset: %s quest(s) → active (checked %s)",
                count,
                len(candidates),
            )
        else:
            logger.info(
                "Daily quest reset: nothing to reset (checked %s)",
                len(candidates),
            )
        if alarms_cleared:
            logger.info(
                "Daily alarm dedup cleared for %s notification(s)",
                alarms_cleared,
            )
        return count
