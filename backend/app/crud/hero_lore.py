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


async def refresh_adventurer_lore(
    db: AsyncSession,
    adventurer: Adventurer,
) -> Adventurer:
    recent_quests = await get_recent_completed_quests(db, adventurer.id)
    await hero_lore_generator.generate_and_save(db, adventurer, recent_quests)
    return adventurer
