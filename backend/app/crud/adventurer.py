from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.adventurer import Adventurer
from app.schemas.adventurer import AdventurerRead, AdventurerUpdate
from app.services.leveling import total_xp_for_level


async def get_adventurer(db: AsyncSession, adventurer_id: int) -> Adventurer | None:
    return await db.get(Adventurer, adventurer_id)


async def get_adventurer_by_user_id(
    db: AsyncSession,
    user_id: int,
) -> Adventurer | None:
    result = await db.execute(
        select(Adventurer)
        .options(selectinload(Adventurer.user))
        .where(Adventurer.user_id == user_id),
    )
    return result.scalar_one_or_none()


def to_adventurer_read(adventurer: Adventurer) -> AdventurerRead:
    next_level_threshold = total_xp_for_level(adventurer.level + 1)
    xp_to_next_level = max(0, next_level_threshold - adventurer.experience_points)

    return AdventurerRead(
        id=adventurer.id,
        user_id=adventurer.user_id,
        invite_code=adventurer.user.invite_code if adventurer.user else "",
        username=adventurer.username,
        display_name=adventurer.display_name,
        experience_points=adventurer.experience_points,
        gold=adventurer.gold,
        level=adventurer.level,
        lore=adventurer.lore,
        xp_to_next_level=xp_to_next_level,
        created_at=adventurer.created_at,
        updated_at=adventurer.updated_at,
    )


async def update_adventurer(
    db: AsyncSession,
    adventurer: Adventurer,
    data: AdventurerUpdate,
) -> Adventurer:
    fields_set = data.model_fields_set

    if "username" in fields_set and data.username is not None:
        username = data.username.strip()
        if not username:
            raise ValueError("username cannot be empty")
        existing = await db.execute(
            select(Adventurer).where(
                Adventurer.username == username,
                Adventurer.id != adventurer.id,
            ),
        )
        if existing.scalar_one_or_none() is not None:
            raise ValueError("username already taken")
        adventurer.username = username

    if "display_name" in fields_set and data.display_name is not None:
        display_name = data.display_name.strip()
        if not display_name:
            raise ValueError("display_name cannot be empty")
        adventurer.display_name = display_name

    if "lore" in fields_set:
        adventurer.lore = data.lore

    await db.commit()
    await db.refresh(adventurer)
    return adventurer
