from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.adventurer import get_adventurer, to_adventurer_read
from app.crud.active_effect import create_effect_from_reward
from app.crud.faction import get_faction_reputation_points
from app.models.reward import Reward
from app.schemas.active_effect import ActiveEffectRead
from app.schemas.reward import RewardCreate, RewardPurchaseResponse, RewardRead, RewardUpdate
from app.services.reward_pricing import calculate_faction_price


async def list_rewards(db: AsyncSession) -> list[Reward]:
    stmt = select(Reward).order_by(Reward.cost, Reward.id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_reward(db: AsyncSession, reward_id: int) -> Reward | None:
    return await db.get(Reward, reward_id)


def _effective_cost_for_reward(
    reward: Reward,
    *,
    reputation_points: int | None,
) -> int:
    if reward.faction_id is None or reputation_points is None:
        return reward.cost
    return calculate_faction_price(reward.cost, reputation_points)


async def to_reward_read(
    db: AsyncSession,
    reward: Reward,
    *,
    adventurer_id: int | None = None,
) -> RewardRead:
    effective_cost = reward.cost
    if adventurer_id is not None and reward.faction_id is not None:
        reputation_points = await get_faction_reputation_points(
            db,
            adventurer_id=adventurer_id,
            faction_id=reward.faction_id,
        )
        effective_cost = calculate_faction_price(
            reward.cost,
            reputation_points,
        )

    return RewardRead(
        id=reward.id,
        title=reward.title,
        cost=reward.cost,
        description=reward.description,
        icon=reward.icon,
        faction_id=reward.faction_id,
        effective_cost=effective_cost,
    )


async def create_reward(db: AsyncSession, data: RewardCreate) -> Reward:
    reward = Reward(**data.model_dump(exclude_none=True))
    db.add(reward)
    await db.commit()
    await db.refresh(reward)
    return reward


async def delete_reward(db: AsyncSession, reward_id: int) -> None:
    reward = await get_reward(db, reward_id)
    if reward is None:
        raise ValueError("Reward not found")
    await db.delete(reward)
    await db.commit()


async def update_reward(
    db: AsyncSession,
    reward_id: int,
    data: RewardUpdate,
) -> Reward:
    reward = await get_reward(db, reward_id)
    if reward is None:
        raise ValueError("Reward not found")

    fields_set = data.model_fields_set
    if "title" in fields_set and data.title is not None:
        reward.title = data.title.strip()
    if "description" in fields_set:
        reward.description = data.description
    if "cost" in fields_set and data.cost is not None:
        reward.cost = data.cost
    if "icon" in fields_set and data.icon is not None:
        reward.icon = data.icon
    if "faction_id" in fields_set:
        reward.faction_id = data.faction_id

    await db.commit()
    await db.refresh(reward)
    return reward


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

    reputation_points: int | None = None
    if reward.faction_id is not None:
        reputation_points = await get_faction_reputation_points(
            db,
            adventurer_id=adventurer_id,
            faction_id=reward.faction_id,
        )

    final_cost = _effective_cost_for_reward(
        reward,
        reputation_points=reputation_points,
    )

    if adventurer.gold < final_cost:
        raise ValueError(
            f"Not enough gold: need {final_cost}, have {adventurer.gold}",
        )

    adventurer.gold -= final_cost

    active_effect = None
    if adventurer.user_id is not None:
        effect = await create_effect_from_reward(
            db,
            user_id=adventurer.user_id,
            reward=reward,
        )
        if effect is not None:
            active_effect = ActiveEffectRead.model_validate(effect)

    await db.commit()
    await db.refresh(adventurer)
    await db.refresh(reward)

    reward_read = await to_reward_read(db, reward, adventurer_id=adventurer_id)

    message = f"Награда «{reward.title}» куплена за {final_cost} золота!"
    if active_effect is not None:
        message += " Бафф активирован!"

    return RewardPurchaseResponse(
        reward=reward_read,
        adventurer=to_adventurer_read(adventurer),
        message=message,
        gold_spent=final_cost,
        active_effect=active_effect,
    )
