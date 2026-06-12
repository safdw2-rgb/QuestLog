import logging

from app.models.faction import Faction
from app.services.telegram_notifier import send_telegram_message

logger = logging.getLogger(__name__)

REPUTATION_IMBALANCE_THRESHOLD = 100


async def maybe_send_imbalance_warning(
    faction: Faction,
    *,
    previous_points: int,
    new_points: int,
) -> None:
    if (
        previous_points <= REPUTATION_IMBALANCE_THRESHOLD
        and new_points > REPUTATION_IMBALANCE_THRESHOLD
    ):
        text = (
            f"🛡️ Паша, твоя репутация в {faction.name} взлетела до небес! "
            "Другие гильдии начинают косо смотреть на тебя. "
            "Пора уделить время квестам остальных фракций!"
        )
        sent = await send_telegram_message(text)
        if sent:
            logger.info(
                "Faction imbalance warning sent for %s (%s pts)",
                faction.name,
                new_points,
            )
