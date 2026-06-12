import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"


async def send_telegram_message(text: str) -> bool:
    token = settings.telegram_bot_token
    chat_id = settings.telegram_chat_id

    if not token or not chat_id:
        logger.debug("Telegram not configured — skip notification")
        return False

    url = TELEGRAM_API.format(token=token)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                url,
                json={"chat_id": chat_id, "text": text},
            )
        if response.is_success:
            return True
        logger.warning(
            "Telegram API error %s: %s",
            response.status_code,
            response.text[:200],
        )
    except httpx.HTTPError as exc:
        logger.warning("Telegram request failed: %s", exc)

    return False


def format_quest_alarm(quest_title: str) -> str:
    return (
        f"⚔️ Паша, время приключений! Пора приступать к квесту: {quest_title}"
    )


def format_deadline_warning(quest_title: str) -> str:
    return (
        f"⏳ ВНИМАНИЕ! До дедлайна квеста {quest_title} осталось всего 15 минут! "
        "Поспеши, иначе контракт будет провален, а золото — потеряно!"
    )


def format_quest_failed(quest_title: str) -> str:
    return (
        f"☠️ КВЕСТ ПРОВАЛЕН: {quest_title}. Время вышло. "
        "Вы теряете очки опыта и золото, а контракт отправляется "
        "на кладбище невыполненных задач!"
    )
