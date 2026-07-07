from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_adventurer, get_db
from app.crud import adventurer as adventurer_crud
from app.crud import hero_lore as hero_lore_crud
from app.models.adventurer import Adventurer
from app.schemas.adventurer import AdventurerRead, AdventurerUpdate
from app.services.hero_lore_generator import GeminiGenerationError

router = APIRouter(prefix="/adventurers", tags=["adventurers"])


@router.get("/me", response_model=AdventurerRead)
async def get_my_adventurer(
    adventurer: Adventurer = Depends(get_current_adventurer),
) -> AdventurerRead:
    return adventurer_crud.to_adventurer_read(adventurer)


@router.patch("/me", response_model=AdventurerRead)
async def update_my_adventurer(
    data: AdventurerUpdate,
    adventurer: Adventurer = Depends(get_current_adventurer),
    db: AsyncSession = Depends(get_db),
) -> AdventurerRead:
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


@router.post("/me/generate-lore", response_model=AdventurerRead)
async def generate_my_adventurer_lore(
    adventurer: Adventurer = Depends(get_current_adventurer),
    db: AsyncSession = Depends(get_db),
) -> AdventurerRead:
    try:
        updated = await hero_lore_crud.refresh_adventurer_lore(
            db,
            adventurer,
            use_all_completed=True,
        )
    except GeminiGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini error: {exc}",
        ) from exc

    return adventurer_crud.to_adventurer_read(updated)
