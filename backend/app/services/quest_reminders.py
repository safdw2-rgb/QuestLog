import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import async_session_factory
from app.models.enums import QuestStatus, QuestType
from app.models.quest import Quest
from app.models.quest_notification import QuestNotificationSent
from app.services.telegram_notifier import format_quest_alert, send_telegram_message

logger = logging.getLogger(__name__)

REGULAR_LEAD_MINUTES = 15


def _is_same_minute(a: datetime, b: datetime) -> bool:
    return (
        a.year == b.year
        and a.month == b.month
        and a.day == b.day
        and a.hour == b.hour
        and a.minute == b.minute
    )


async def _already_sent(
    db: AsyncSession,
    quest_id: int,
    kind: str,
    slot_key: str,
) -> bool:
    stmt = select(QuestNotificationSent.id).where(
        QuestNotificationSent.quest_id == quest_id,
        QuestNotificationSent.notification_kind == kind,
        QuestNotificationSent.slot_key == slot_key,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def _mark_sent(
    db: AsyncSession,
    quest_id: int,
    kind: str,
    slot_key: str,
) -> None:
    db.add(
        QuestNotificationSent(
            quest_id=quest_id,
            notification_kind=kind,
            slot_key=slot_key,
        )
    )


async def _notify_quest(
    db: AsyncSession,
    quest: Quest,
    kind: str,
    slot_key: str,
) -> None:
    if await _already_sent(db, quest.id, kind, slot_key):
        return

    sent = await send_telegram_message(format_quest_alert(quest.title))
    if not sent:
        return

    await _mark_sent(db, quest.id, kind, slot_key)
    logger.info("Telegram alert sent for quest %s (%s)", quest.id, kind)


async def check_quest_reminders() -> None:
    tz = ZoneInfo(settings.daily_reset_timezone)
    now = datetime.now(tz)

    async with async_session_factory() as db:
        stmt = (
            select(Quest)
            .where(Quest.status == QuestStatus.ACTIVE)
            .where(Quest.deadline.is_not(None))
        )
        result = await db.execute(stmt)
        quests = list(result.scalars().all())

        for quest in quests:
            if quest.deadline is None:
                continue

            local_deadline = quest.deadline.astimezone(tz)

            if quest.quest_type == QuestType.DAILY:
                reminder_today = datetime(
                    now.year,
                    now.month,
                    now.day,
                    local_deadline.hour,
                    local_deadline.minute,
                    tzinfo=tz,
                )
                if not _is_same_minute(now, reminder_today):
                    continue
                slot_key = reminder_today.strftime("%Y-%m-%d-%H:%M")
                await _notify_quest(db, quest, "daily", slot_key)
            else:
                lead_at = local_deadline - timedelta(minutes=REGULAR_LEAD_MINUTES)
                if not _is_same_minute(now, lead_at):
                    continue
                slot_key = lead_at.strftime("%Y-%m-%d-%H:%M")
                await _notify_quest(db, quest, "deadline_15m", slot_key)

        await db.commit()
