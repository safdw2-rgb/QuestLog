from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.faction import get_faction
from app.models.quest import Quest
from app.services.obsidian_sync import obsidian_sync_service


async def record_quest_completion_lore(db: AsyncSession, quest: Quest) -> None:
    """Дополняет Hero_Lore при успешном завершении квеста."""
    faction_name: str | None = None
    faction_slug: str | None = None

    if quest.faction_id is not None:
        faction = await get_faction(db, quest.faction_id)
        if faction is not None:
            faction_name = faction.name
            faction_slug = faction.slug

    try:
        obsidian_sync_service.record_quest_completion(
            quest,
            faction_name=faction_name,
            faction_slug=faction_slug,
        )
    except OSError:
        import logging

        logging.getLogger(__name__).exception(
            "Failed to record hero lore for quest %s", quest.id
        )
