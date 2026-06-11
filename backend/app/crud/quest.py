from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.adventurer import get_adventurer, to_adventurer_read
from app.models.enums import QuestStatus, QuestType
from app.models.quest import Quest
from app.schemas.quest import QuestDeadlineUpdateResponse, QuestRead
from app.crud.obsidian import sync_quest_to_obsidian
from app.schemas.quest import QuestCreate, QuestStatusUpdate
from app.services.quest_completion import (
    AdventurerNotFoundError,
    quest_completion_service,
)


async def create_quest(db: AsyncSession, data: QuestCreate) -> Quest:
    quest = Quest(**data.model_dump(exclude_none=True))
    db.add(quest)
    await db.commit()
    await db.refresh(quest)
    await sync_quest_to_obsidian(db, quest, force=True)
    return quest


async def list_quests(
    db: AsyncSession,
    *,
    adventurer_id: int | None = None,
    status: QuestStatus | None = None,
) -> list[Quest]:
    stmt = select(Quest).order_by(Quest.sort_order, Quest.created_at.desc())

    if adventurer_id is not None:
        stmt = stmt.where(Quest.adventurer_id == adventurer_id)
    if status is not None:
        stmt = stmt.where(Quest.status == status)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_quest(db: AsyncSession, quest_id: int) -> Quest | None:
    return await db.get(Quest, quest_id)


DEADLINE_RESCHEDULE_COST = 20


def _deadlines_equal(
    current: datetime | None,
    new: datetime | None,
) -> bool:
    if current is None and new is None:
        return True
    if current is None or new is None:
        return False
    return int(current.timestamp()) == int(new.timestamp())


async def update_quest_deadline(
    db: AsyncSession,
    quest: Quest,
    deadline: datetime | None,
) -> QuestDeadlineUpdateResponse:
    adventurer = await get_adventurer(db, quest.adventurer_id)
    if adventurer is None:
        raise ValueError(f"Adventurer {quest.adventurer_id} not found")

    gold_spent = 0
    deadline_changed = not _deadlines_equal(quest.deadline, deadline)

    if (
        deadline_changed
        and quest.quest_type in (QuestType.MAIN, QuestType.SIDE)
    ):
        if adventurer.gold < DEADLINE_RESCHEDULE_COST:
            raise ValueError(
                f"Not enough gold: need {DEADLINE_RESCHEDULE_COST}, "
                f"have {adventurer.gold}",
            )
        adventurer.gold -= DEADLINE_RESCHEDULE_COST
        gold_spent = DEADLINE_RESCHEDULE_COST

    quest.deadline = deadline
    await db.commit()
    await db.refresh(quest)
    await db.refresh(adventurer)
    await sync_quest_to_obsidian(db, quest, force=True)

    return QuestDeadlineUpdateResponse(
        quest=QuestRead.model_validate(quest),
        adventurer=to_adventurer_read(adventurer),
        gold_spent=gold_spent,
    )


async def update_quest_status(
    db: AsyncSession,
    quest: Quest,
    data: QuestStatusUpdate,
) -> Quest:
    now = datetime.now(UTC)

    if data.status == QuestStatus.COMPLETED:
        if quest.status != QuestStatus.COMPLETED:
            try:
                await quest_completion_service.complete_quest(db, quest)
            except AdventurerNotFoundError as exc:
                raise ValueError(f"Adventurer {exc.args[0]} not found") from exc
        await db.commit()
        await db.refresh(quest)
        await sync_quest_to_obsidian(db, quest, force=True)
        return quest

    quest.status = data.status

    if data.status == QuestStatus.FAILED:
        quest.failed_at = now
        quest.completed_at = None
        quest.fail_reason = data.fail_reason
        quest.xp_earned = 0
        quest.gold_earned = 0
    elif data.status == QuestStatus.ACTIVE:
        quest.completed_at = None
        quest.failed_at = None
        quest.fail_reason = None
        quest.xp_earned = 0
        quest.gold_earned = 0

    await db.commit()
    await db.refresh(quest)

    if data.status == QuestStatus.FAILED:
        await sync_quest_to_obsidian(db, quest, force=True)

    return quest
