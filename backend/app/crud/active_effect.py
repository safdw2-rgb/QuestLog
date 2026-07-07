from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.active_effect import ActiveEffect
from app.models.reward import Reward
from app.services.effect_duration import parse_effect_duration


async def list_active_effects(
    db: AsyncSession,
    *,
    user_id: int,
) -> list[ActiveEffect]:
    now = datetime.now(UTC)
    stmt = (
        select(ActiveEffect)
        .where(
            ActiveEffect.user_id == user_id,
            ActiveEffect.expires_at > now,
        )
        .order_by(ActiveEffect.expires_at.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_effect_from_reward(
    db: AsyncSession,
    *,
    user_id: int,
    reward: Reward,
) -> ActiveEffect | None:
    duration = parse_effect_duration(reward.title, reward.description)
    if duration is None:
        return None

    now = datetime.now(UTC)
    effect = ActiveEffect(
        user_id=user_id,
        name=reward.title,
        description=reward.description,
        icon=reward.icon or "✨",
        effect_type="buff",
        expires_at=now + duration,
        is_notified=False,
    )
    db.add(effect)
    await db.flush()
    return effect
