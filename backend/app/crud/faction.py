import hashlib
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.faction import Faction
from app.schemas.faction import FactionCreate, FactionUpdate
from app.services.faction_reputation_alerts import maybe_send_imbalance_warning
from app.utils.emoji import resolve_faction_icon

REPUTATION_GAIN_ON_COMPLETE = 10
REPUTATION_LOSS_ON_FAIL = 5


async def list_factions(db: AsyncSession) -> list[Faction]:
    stmt = select(Faction).order_by(Faction.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_faction(db: AsyncSession, faction_id: int) -> Faction | None:
    return await db.get(Faction, faction_id)


async def adjust_faction_reputation(
    db: AsyncSession,
    faction_id: int,
    delta: int,
) -> Faction | None:
    faction = await get_faction(db, faction_id)
    if faction is None:
        return None
    previous_points = faction.reputation_points
    faction.reputation_points += delta
    await maybe_send_imbalance_warning(
        faction,
        previous_points=previous_points,
        new_points=faction.reputation_points,
    )
    return faction


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


async def create_faction(db: AsyncSession, data: FactionCreate) -> Faction:
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
    await db.commit()
    await db.refresh(faction)
    return faction


async def update_faction(
    db: AsyncSession,
    faction: Faction,
    data: FactionUpdate,
) -> Faction:
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
    return faction
