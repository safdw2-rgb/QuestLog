from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import adventurer as adventurer_crud
from app.schemas.adventurer import AdventurerRead

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
