import logging

from app.models.quest import Quest
from app.services.hero_lore import hero_lore_service

logger = logging.getLogger(__name__)


class ObsidianSyncService:
    """
    Летопись героя: больше не создаём отдельные quest-*.md файлы.
    При завершении квеста дополняем глобальные записи в Hero_Lore/.
    """

    def record_quest_completion(
        self,
        quest: Quest,
        *,
        faction_name: str | None = None,
        faction_slug: str | None = None,
    ) -> None:
        try:
            hero_lore_service.record_quest_completion(
                quest,
                faction_name=faction_name,
                faction_slug=faction_slug,
            )
        except OSError:
            logger.exception("Failed to append hero lore for quest %s", quest.id)


obsidian_sync_service = ObsidianSyncService()
