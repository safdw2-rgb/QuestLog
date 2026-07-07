from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.adventurer import Adventurer
from app.models.enums import QuestStatus
from app.models.quest import Quest
from app.services.hero_lore_generator import hero_lore_generator


async def get_recent_completed_quests(
    db: AsyncSession,
    adventurer_id: int,
    *,
    limit: int = 8,
) -> list[Quest]:
    stmt = (
        select(Quest)
        .where(
            Quest.adventurer_id == adventurer_id,
            Quest.status == QuestStatus.COMPLETED,
            Quest.parent_quest_id.is_(None),
        )
        .order_by(Quest.completed_at.desc().nullslast(), Quest.updated_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_completed_quests_last_day(
    db: AsyncSession,
    adventurer_id: int,
    *,
    limit: int = 25,
) -> list[Quest]:
    since = datetime.now(UTC) - timedelta(hours=24)
    stmt = (
        select(Quest)
        .where(
            Quest.adventurer_id == adventurer_id,
            Quest.status == QuestStatus.COMPLETED,
            Quest.parent_quest_id.is_(None),
            Quest.completed_at.is_not(None),
            Quest.completed_at >= since,
        )
        .order_by(Quest.completed_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_all_completed_quests(
    db: AsyncSession,
    adventurer_id: int,
    *,
    limit: int = 30,
) -> list[Quest]:
    stmt = (
        select(Quest)
        .where(
            Quest.adventurer_id == adventurer_id,
            Quest.status == QuestStatus.COMPLETED,
            Quest.parent_quest_id.is_(None),
        )
        .order_by(Quest.completed_at.desc().nullslast(), Quest.updated_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_lore_source_quests(
    db: AsyncSession,
    adventurer_id: int,
) -> list[Quest]:
    recent = await get_completed_quests_last_day(db, adventurer_id)
    if recent:
        return recent
    return await get_all_completed_quests(db, adventurer_id)


async def refresh_adventurer_lore(
    db: AsyncSession,
    adventurer: Adventurer,
    *,
    use_all_completed: bool = False,
) -> Adventurer:
    if use_all_completed:
        source_quests = await get_all_completed_quests(db, adventurer.id)
    else:
        source_quests = await get_lore_source_quests(db, adventurer.id)

    await hero_lore_generator.generate_and_save(db, adventurer, source_quests)
    return adventurer
