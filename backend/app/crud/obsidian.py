from sqlalchemy.ext.asyncio import AsyncSession

from app.models.adventurer import Adventurer
from app.models.enums import QuestStatus
from app.models.quest import Quest
from app.services.obsidian_sync import obsidian_sync_service


async def sync_quest_to_obsidian(
    db: AsyncSession,
    quest: Quest,
    *,
    force: bool = False,
) -> None:
    """Синхронизирует квест в Obsidian при создании и смене статуса completed/failed."""
    if not force and quest.status not in {
        QuestStatus.ACTIVE,
        QuestStatus.COMPLETED,
        QuestStatus.FAILED,
    }:
        return

    adventurer = await db.get(Adventurer, quest.adventurer_id)
    adventurer_level = adventurer.level if adventurer else None

    try:
        obsidian_sync_service.sync_quest(quest, adventurer_level=adventurer_level)
    except OSError:
        # Не блокируем API, если vault недоступен
        import logging

        logging.getLogger(__name__).exception(
            "Failed to sync quest %s to Obsidian", quest.id
        )
