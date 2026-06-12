from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import adventurer as adventurer_crud
from app.crud import hero_lore as hero_lore_crud
from app.schemas.adventurer import AdventurerRead, AdventurerUpdate
from app.services.hero_lore_generator import GeminiGenerationError

router = APIRouter(prefix="/adventurers", tags=["adventurers"])


@router.get("/{adventurer_id}", response_model=AdventurerRead)
async def get_adventurer(
    adventurer_id: int,
    db: AsyncSession = Depends(get_db),
) -> AdventurerRead:
    adventurer = await adventurer_crud.get_adventurer(db, adventurer_id)
    if adventurer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Adventurer not found",
        )
    return adventurer_crud.to_adventurer_read(adventurer)


@router.patch("/{adventurer_id}", response_model=AdventurerRead)
async def update_adventurer(
    adventurer_id: int,
    data: AdventurerUpdate,
    db: AsyncSession = Depends(get_db),
) -> AdventurerRead:
    adventurer = await adventurer_crud.get_adventurer(db, adventurer_id)
    if adventurer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Adventurer not found",
        )

    try:
        updated = await adventurer_crud.update_adventurer(db, adventurer, data)
    except ValueError as exc:
        message = str(exc)
        status_code = (
            status.HTTP_409_CONFLICT
            if "already taken" in message.lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=status_code, detail=message) from exc

    return adventurer_crud.to_adventurer_read(updated)


@router.post("/{adventurer_id}/generate-lore", response_model=AdventurerRead)
async def generate_adventurer_lore(
    adventurer_id: int,
    db: AsyncSession = Depends(get_db),
) -> AdventurerRead:
    adventurer = await adventurer_crud.get_adventurer(db, adventurer_id)
    if adventurer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Adventurer not found",
        )

    try:
        updated = await hero_lore_crud.refresh_adventurer_lore(db, adventurer)
    except GeminiGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini error: {exc}",
        ) from exc

    return adventurer_crud.to_adventurer_read(updated)
