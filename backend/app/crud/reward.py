from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.adventurer import get_adventurer, to_adventurer_read
from app.models.reward import Reward
from app.schemas.reward import RewardPurchaseResponse, RewardRead


async def list_rewards(db: AsyncSession) -> list[Reward]:
    stmt = select(Reward).order_by(Reward.cost, Reward.id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_reward(db: AsyncSession, reward_id: int) -> Reward | None:
    return await db.get(Reward, reward_id)


async def purchase_reward(
    db: AsyncSession,
    *,
    reward_id: int,
    adventurer_id: int,
) -> RewardPurchaseResponse:
    reward = await get_reward(db, reward_id)
    if reward is None:
        raise ValueError("Reward not found")

    adventurer = await get_adventurer(db, adventurer_id)
    if adventurer is None:
        raise ValueError("Adventurer not found")

    if adventurer.gold < reward.cost:
        raise ValueError(
            f"Not enough gold: need {reward.cost}, have {adventurer.gold}",
        )

    adventurer.gold -= reward.cost
    await db.commit()
    await db.refresh(adventurer)
    await db.refresh(reward)

    return RewardPurchaseResponse(
        reward=RewardRead.model_validate(reward),
        adventurer=to_adventurer_read(adventurer),
        message=f"Награда «{reward.title}» куплена за {reward.cost} золота!",
    )
