import logging
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.crud.faction import REPUTATION_LOSS_ON_FAIL, adjust_faction_reputation
from app.db.session import async_session_factory
from app.models.enums import QuestStatus, QuestType
from app.models.quest import Quest
from app.models.quest_notification import QuestNotificationSent
from app.services.telegram_notifier import (
    format_deadline_warning,
    format_quest_alarm,
    format_quest_failed,
    send_telegram_message,
)

logger = logging.getLogger(__name__)

KIND_ALARM = "alarm"
KIND_DEADLINE_WARNING = "deadline_warning"
KIND_DEADLINE_FAILED = "deadline_failed"

DEADLINE_WARNING_LEAD_MINUTES = 15
AUTO_FAIL_REASON = "Дедлайн истёк — контракт провален автоматически."


def _is_same_minute(a: datetime, b: datetime) -> bool:
    return (
        a.year == b.year
        and a.month == b.month
        and a.day == b.day
        and a.hour == b.hour
        and a.minute == b.minute
    )


def _slot_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d-%H:%M")


def _alarm_instant(quest: Quest, now: datetime, tz: ZoneInfo) -> datetime | None:
    if quest.reminder_time is None:
        return None

    local_reminder = quest.reminder_time.astimezone(tz)

    if quest.quest_type == QuestType.DAILY:
        return datetime(
            now.year,
            now.month,
            now.day,
            local_reminder.hour,
            local_reminder.minute,
            tzinfo=tz,
        )

    return local_reminder


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


async def _send_notification(
    db: AsyncSession,
    quest: Quest,
    kind: str,
    slot_key: str,
    text: str,
) -> bool:
    if await _already_sent(db, quest.id, kind, slot_key):
        return False

    sent = await send_telegram_message(text)
    if not sent:
        return False

    await _mark_sent(db, quest.id, kind, slot_key)
    logger.info("Telegram %s sent for quest %s", kind, quest.id)
    return True


async def _fail_quest_at_deadline(db: AsyncSession, quest: Quest) -> None:
    if quest.status != QuestStatus.ACTIVE:
        return

    now = datetime.now(UTC)
    quest.status = QuestStatus.FAILED
    quest.failed_at = now
    quest.completed_at = None
    quest.fail_reason = AUTO_FAIL_REASON
    quest.xp_earned = 0
    quest.gold_earned = 0
    if quest.faction_id is not None and quest.quest_type != QuestType.DAILY:
        await adjust_faction_reputation(
            db,
            quest.faction_id,
            -REPUTATION_LOSS_ON_FAIL,
        )
    logger.info("Quest %s auto-failed at deadline", quest.id)


async def check_quest_reminders() -> None:
    tz = ZoneInfo(settings.daily_reset_timezone)
    now = datetime.now(tz)

    async with async_session_factory() as db:
        stmt = (
            select(Quest)
            .where(Quest.status == QuestStatus.ACTIVE)
            .where(
                or_(
                    Quest.deadline.is_not(None),
                    Quest.reminder_time.is_not(None),
                )
            )
        )
        result = await db.execute(stmt)
        quests = list(result.scalars().all())

        for quest in quests:
            alarm_at = _alarm_instant(quest, now, tz)
            if alarm_at is not None and _is_same_minute(now, alarm_at):
                await _send_notification(
                    db,
                    quest,
                    KIND_ALARM,
                    _slot_key(alarm_at),
                    format_quest_alarm(quest.title),
                )

            if (
                quest.quest_type in (QuestType.MAIN, QuestType.SIDE)
                and quest.deadline is not None
            ):
                local_deadline = quest.deadline.astimezone(tz)
                warning_at = local_deadline - timedelta(
                    minutes=DEADLINE_WARNING_LEAD_MINUTES
                )

                if _is_same_minute(now, warning_at):
                    await _send_notification(
                        db,
                        quest,
                        KIND_DEADLINE_WARNING,
                        _slot_key(warning_at),
                        format_deadline_warning(quest.title),
                    )

                if _is_same_minute(now, local_deadline):
                    slot_key = _slot_key(local_deadline)
                    if not await _already_sent(
                        db, quest.id, KIND_DEADLINE_FAILED, slot_key
                    ):
                        await send_telegram_message(
                            format_quest_failed(quest.title),
                        )
                        await _fail_quest_at_deadline(db, quest)
                        await _mark_sent(
                            db,
                            quest.id,
                            KIND_DEADLINE_FAILED,
                            slot_key,
                        )

        await db.commit()
