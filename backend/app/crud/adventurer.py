from sqlalchemy.ext.asyncio import AsyncSession

from app.models.adventurer import Adventurer
from app.schemas.adventurer import AdventurerRead
from app.services.leveling import total_xp_for_level


async def get_adventurer(db: AsyncSession, adventurer_id: int) -> Adventurer | None:
    return await db.get(Adventurer, adventurer_id)


def to_adventurer_read(adventurer: Adventurer) -> AdventurerRead:
    next_level_threshold = total_xp_for_level(adventurer.level + 1)
    xp_to_next_level = max(0, next_level_threshold - adventurer.experience_points)

    return AdventurerRead(
        id=adventurer.id,
        username=adventurer.username,
        display_name=adventurer.display_name,
        experience_points=adventurer.experience_points,
        gold=adventurer.gold,
        level=adventurer.level,
        xp_to_next_level=xp_to_next_level,
        created_at=adventurer.created_at,
        updated_at=adventurer.updated_at,
    )
