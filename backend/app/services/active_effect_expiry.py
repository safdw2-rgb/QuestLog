import logging
from datetime import UTC, datetime

from sqlalchemy import select

from app.db.session import async_session_factory
from app.models.active_effect import ActiveEffect
from app.services.telegram_notifier import (
    format_effect_expired,
    send_telegram_message,
)

logger = logging.getLogger(__name__)


async def check_expired_effects() -> int:
    now = datetime.now(UTC)

    async with async_session_factory() as db:
        stmt = select(ActiveEffect).where(
            ActiveEffect.expires_at <= now,
            ActiveEffect.is_notified.is_(False),
        )
        result = await db.execute(stmt)
        effects = list(result.scalars().all())

        notified = 0
        for effect in effects:
            sent = await send_telegram_message(format_effect_expired(effect.name))
            effect.is_notified = True
            if sent:
                notified += 1
                logger.info("Effect expired notification sent: %s", effect.name)
            else:
                logger.info(
                    "Effect expired (telegram skipped): %s",
                    effect.name,
                )

        if effects:
            await db.commit()

        return notified
