import hashlib
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.adventurer import Adventurer
from app.models.adventurer_faction_reputation import AdventurerFactionReputation
from app.models.faction import Faction
from app.schemas.faction import FactionCreate, FactionRead, FactionUpdate
from app.services.faction_reputation_alerts import maybe_send_imbalance_warning
from app.utils.emoji import resolve_faction_icon

REPUTATION_GAIN_ON_COMPLETE = 10
REPUTATION_LOSS_ON_FAIL = 5


def to_faction_read(faction: Faction, *, reputation_points: int = 0) -> FactionRead:
    return FactionRead(
        id=faction.id,
        name=faction.name,
        slug=faction.slug,
        icon=faction.icon,
        color=faction.color,
        description=faction.description,
        reputation_points=reputation_points,
    )


async def _reputation_map_for_adventurer(
    db: AsyncSession,
    adventurer_id: int,
) -> dict[int, int]:
    stmt = select(AdventurerFactionReputation).where(
        AdventurerFactionReputation.adventurer_id == adventurer_id,
    )
    result = await db.execute(stmt)
    return {
        row.faction_id: row.reputation_points
        for row in result.scalars().all()
    }


async def list_factions(
    db: AsyncSession,
    *,
    adventurer_id: int,
) -> list[FactionRead]:
    stmt = select(Faction).order_by(Faction.name)
    result = await db.execute(stmt)
    factions = list(result.scalars().all())
    reputation_by_faction = await _reputation_map_for_adventurer(db, adventurer_id)

    return [
        to_faction_read(
            faction,
            reputation_points=reputation_by_faction.get(faction.id, 0),
        )
        for faction in factions
    ]


async def get_faction(db: AsyncSession, faction_id: int) -> Faction | None:
    return await db.get(Faction, faction_id)


async def get_faction_reputation_points(
    db: AsyncSession,
    *,
    adventurer_id: int,
    faction_id: int,
) -> int:
    stmt = select(AdventurerFactionReputation).where(
        AdventurerFactionReputation.adventurer_id == adventurer_id,
        AdventurerFactionReputation.faction_id == faction_id,
    )
    result = await db.execute(stmt)
    reputation = result.scalar_one_or_none()
    return reputation.reputation_points if reputation is not None else 0


async def get_or_create_faction_reputation(
    db: AsyncSession,
    *,
    adventurer_id: int,
    faction_id: int,
) -> AdventurerFactionReputation:
    stmt = select(AdventurerFactionReputation).where(
        AdventurerFactionReputation.adventurer_id == adventurer_id,
        AdventurerFactionReputation.faction_id == faction_id,
    )
    result = await db.execute(stmt)
    reputation = result.scalar_one_or_none()
    if reputation is not None:
        return reputation

    reputation = AdventurerFactionReputation(
        adventurer_id=adventurer_id,
        faction_id=faction_id,
        reputation_points=0,
    )
    db.add(reputation)
    await db.flush()
    return reputation


async def initialize_faction_reputation_for_adventurer(
    db: AsyncSession,
    adventurer_id: int,
) -> None:
    faction_ids = list((await db.execute(select(Faction.id))).scalars().all())
    if not faction_ids:
        return

    existing_stmt = select(AdventurerFactionReputation.faction_id).where(
        AdventurerFactionReputation.adventurer_id == adventurer_id,
    )
    existing_ids = set((await db.execute(existing_stmt)).scalars().all())

    for faction_id in faction_ids:
        if faction_id in existing_ids:
            continue
        db.add(
            AdventurerFactionReputation(
                adventurer_id=adventurer_id,
                faction_id=faction_id,
                reputation_points=0,
            ),
        )

    await db.flush()


async def initialize_faction_reputation_for_all_adventurers(
    db: AsyncSession,
    faction_id: int,
) -> None:
    adventurer_ids = list((await db.execute(select(Adventurer.id))).scalars().all())
    if not adventurer_ids:
        return

    existing_stmt = select(AdventurerFactionReputation.adventurer_id).where(
        AdventurerFactionReputation.faction_id == faction_id,
    )
    existing_ids = set((await db.execute(existing_stmt)).scalars().all())

    for adventurer_id in adventurer_ids:
        if adventurer_id in existing_ids:
            continue
        db.add(
            AdventurerFactionReputation(
                adventurer_id=adventurer_id,
                faction_id=faction_id,
                reputation_points=0,
            ),
        )

    await db.flush()


async def adjust_faction_reputation(
    db: AsyncSession,
    faction_id: int,
    adventurer_id: int,
    delta: int,
) -> AdventurerFactionReputation | None:
    faction = await get_faction(db, faction_id)
    if faction is None:
        return None

    reputation = await get_or_create_faction_reputation(
        db,
        adventurer_id=adventurer_id,
        faction_id=faction_id,
    )
    previous_points = reputation.reputation_points
    reputation.reputation_points += delta
    await maybe_send_imbalance_warning(
        faction,
        previous_points=previous_points,
        new_points=reputation.reputation_points,
    )
    return reputation


def _slug_from_name(name: str) -> str:
    ascii_slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")
    if ascii_slug:
        return ascii_slug[:64]
    digest = hashlib.sha256(name.encode()).hexdigest()[:10]
    return f"faction-{digest}"


async def _ensure_unique_slug(db: AsyncSession, base_slug: str) -> str:
    slug = base_slug
    suffix = 1
    while True:
        existing = await db.execute(select(Faction).where(Faction.slug == slug))
        if existing.scalar_one_or_none() is None:
            return slug
        slug = f"{base_slug[:58]}-{suffix}"
        suffix += 1


async def create_faction(
    db: AsyncSession,
    data: FactionCreate,
    *,
    adventurer_id: int,
) -> FactionRead:
    name = data.name.strip()
    if not name:
        raise ValueError("Faction name is required")

    existing = await db.execute(select(Faction).where(Faction.name == name))
    if existing.scalar_one_or_none() is not None:
        raise ValueError("Faction with this name already exists")

    slug = await _ensure_unique_slug(db, _slug_from_name(name))
    icon = resolve_faction_icon(name, data.icon)
    faction = Faction(
        name=name,
        slug=slug,
        icon=icon,
        color=data.color,
        description=data.description,
    )
    db.add(faction)
    await db.flush()
    await initialize_faction_reputation_for_all_adventurers(db, faction.id)
    await db.commit()
    await db.refresh(faction)
    return to_faction_read(faction, reputation_points=0)


async def update_faction(
    db: AsyncSession,
    faction: Faction,
    data: FactionUpdate,
    *,
    adventurer_id: int,
) -> FactionRead:
    fields_set = data.model_fields_set

    if "name" in fields_set and data.name is not None:
        name = data.name.strip()
        if not name:
            raise ValueError("Faction name cannot be empty")
        existing = await db.execute(
            select(Faction).where(Faction.name == name, Faction.id != faction.id),
        )
        if existing.scalar_one_or_none() is not None:
            raise ValueError("Faction with this name already exists")
        faction.name = name

    if "icon" in fields_set:
        faction.icon = resolve_faction_icon(faction.name, data.icon)
    elif "name" in fields_set:
        faction.icon = resolve_faction_icon(faction.name, faction.icon)
    if "color" in fields_set:
        faction.color = data.color
    if "description" in fields_set:
        faction.description = data.description

    await db.commit()
    await db.refresh(faction)
    reputation_points = await get_faction_reputation_points(
        db,
        adventurer_id=adventurer_id,
        faction_id=faction.id,
    )
    return to_faction_read(faction, reputation_points=reputation_points)
