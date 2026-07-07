import logging

from sqlalchemy import update

from app.db.session import async_session_factory
from app.models.adventurer_faction_reputation import AdventurerFactionReputation

logger = logging.getLogger(__name__)


async def reset_weekly_reputation() -> int:
    """Обнуляет репутацию всех героев у всех фракций (еженедельный сброс)."""
    async with async_session_factory() as db:
        stmt = (
            update(AdventurerFactionReputation)
            .where(AdventurerFactionReputation.reputation_points != 0)
            .values(reputation_points=0)
        )
        result = await db.execute(stmt)
        await db.commit()
        count = result.rowcount or 0
        logger.info("Weekly reputation reset: %s row(s) cleared", count)
        return count
