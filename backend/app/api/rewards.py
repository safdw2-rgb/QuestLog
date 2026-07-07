from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_adventurer, get_current_user, get_db
from app.crud import faction as faction_crud
from app.crud import reward as reward_crud
from app.models.adventurer import Adventurer
from app.models.user import User
from app.schemas.reward import (
    RewardAiGenerateRequest,
    RewardAiGenerateResponse,
    RewardCreate,
    RewardPurchaseResponse,
    RewardRead,
    RewardUpdate,
)
from app.services.ai_generator import GeminiGenerationError
from app.services.reward_description_generator import reward_description_generator

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("", response_model=list[RewardRead])
async def list_rewards(
    adventurer: Adventurer = Depends(get_current_adventurer),
    db: AsyncSession = Depends(get_db),
) -> list[RewardRead]:
    rewards = await reward_crud.list_rewards(db)
    return [
        await reward_crud.to_reward_read(db, item, adventurer_id=adventurer.id)
        for item in rewards
    ]


@router.post("/generate-description", response_model=RewardAiGenerateResponse)
async def generate_reward_description(
    data: RewardAiGenerateRequest,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RewardAiGenerateResponse:
    faction_name: str | None = None
    if data.faction_id is not None:
        faction = await faction_crud.get_faction(db, data.faction_id)
        if faction is not None:
            faction_name = faction.name

    try:
        result = await reward_description_generator.generate(
            data.title,
            faction_name=faction_name,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except GeminiGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini error: {exc}",
        ) from exc

    return RewardAiGenerateResponse(
        description=result.description,
        source=result.source,
    )


@router.post("", response_model=RewardRead, status_code=status.HTTP_201_CREATED)
async def create_reward(
    data: RewardCreate,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RewardRead:
    reward = await reward_crud.create_reward(db, data)
    return await reward_crud.to_reward_read(db, reward)


@router.patch("/{reward_id}", response_model=RewardRead)
async def update_reward(
    reward_id: int,
    data: RewardUpdate,
    adventurer: Adventurer = Depends(get_current_adventurer),
    db: AsyncSession = Depends(get_db),
) -> RewardRead:
    try:
        reward = await reward_crud.update_reward(db, reward_id, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    return await reward_crud.to_reward_read(
        db,
        reward,
        adventurer_id=adventurer.id,
    )


@router.delete("/{reward_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reward(
    reward_id: int,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await reward_crud.delete_reward(db, reward_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post("/{reward_id}/purchase", response_model=RewardPurchaseResponse)
async def purchase_reward(
    reward_id: int,
    adventurer: Adventurer = Depends(get_current_adventurer),
    db: AsyncSession = Depends(get_db),
) -> RewardPurchaseResponse:
    try:
        return await reward_crud.purchase_reward(
            db,
            reward_id=reward_id,
            adventurer_id=adventurer.id,
        )
    except ValueError as exc:
        message = str(exc)
        if "not found" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        ) from exc
