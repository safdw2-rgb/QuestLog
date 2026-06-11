from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.crud import reward as reward_crud
from app.schemas.reward import RewardPurchaseResponse, RewardRead

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("", response_model=list[RewardRead])
async def list_rewards(db: AsyncSession = Depends(get_db)) -> list[RewardRead]:
    rewards = await reward_crud.list_rewards(db)
    return [RewardRead.model_validate(item) for item in rewards]


@router.post("/{reward_id}/purchase", response_model=RewardPurchaseResponse)
async def purchase_reward(
    reward_id: int,
    adventurer_id: int = Query(default=1, ge=1),
    db: AsyncSession = Depends(get_db),
) -> RewardPurchaseResponse:
    try:
        return await reward_crud.purchase_reward(
            db,
            reward_id=reward_id,
            adventurer_id=adventurer_id,
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
