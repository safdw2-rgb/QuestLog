"""Nightly hero lore refresh for all adventurers."""

import logging

from sqlalchemy import select

from app.crud.hero_lore import refresh_adventurer_lore
from app.db.session import async_session_factory
from app.models.adventurer import Adventurer

logger = logging.getLogger(__name__)


async def refresh_all_adventurers_lore() -> int:
    """Перегенерировать лор всех героев (запуск в 03:00)."""
    updated = 0

    async with async_session_factory() as db:
        result = await db.execute(select(Adventurer).order_by(Adventurer.id))
        adventurers = list(result.scalars().all())

        for adventurer in adventurers:
            try:
                await refresh_adventurer_lore(
                    db,
                    adventurer,
                    use_all_completed=True,
                )
                updated += 1
                logger.info(
                    "Nightly lore refreshed for adventurer id=%s name=%r",
                    adventurer.id,
                    adventurer.display_name,
                )
            except Exception as exc:
                logger.error(
                    "Nightly lore failed for adventurer id=%s: %s",
                    adventurer.id,
                    exc,
                    exc_info=True,
                )

    logger.info("Nightly lore job finished: %s adventurer(s) updated", updated)
    return updated
