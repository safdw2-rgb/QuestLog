from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import faction as faction_crud
from app.schemas.faction import FactionCreate, FactionRead, FactionUpdate

router = APIRouter(prefix="/factions", tags=["factions"])


@router.get("", response_model=list[FactionRead])
async def get_factions(
    db: AsyncSession = Depends(get_db),
) -> list[FactionRead]:
    return await faction_crud.list_factions(db)


@router.post("", response_model=FactionRead, status_code=status.HTTP_201_CREATED)
async def create_faction(
    data: FactionCreate,
    db: AsyncSession = Depends(get_db),
) -> FactionRead:
    try:
        return await faction_crud.create_faction(db, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.patch("/{faction_id}", response_model=FactionRead)
async def update_faction(
    faction_id: int,
    data: FactionUpdate,
    db: AsyncSession = Depends(get_db),
) -> FactionRead:
    faction = await faction_crud.get_faction(db, faction_id)
    if faction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faction not found",
        )

    try:
        return await faction_crud.update_faction(db, faction, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
