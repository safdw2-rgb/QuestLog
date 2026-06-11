from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import QuestStatus
from app.models.quest import Quest
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
    return quest
