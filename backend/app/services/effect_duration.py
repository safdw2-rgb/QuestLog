import re
from datetime import timedelta

HOUR_PATTERN = re.compile(
    r"(\d+)\s*(?:ч(?:ас(?:а|ов)?)?|h(?:our)?s?)",
    re.IGNORECASE,
)
MINUTE_PATTERN = re.compile(
    r"(\d+)\s*(?:мин(?:ут(?:а|ы)?)?|m(?:in)?)",
    re.IGNORECASE,
)

BUFF_KEYWORDS = (
    "час",
    "минут",
    "видеоигр",
    "игр",
    "отдых",
    "сериал",
    "фильм",
    "музык",
    "перекус",
    "кофе",
    "сон",
    "дрём",
    "youtube",
    "netflix",
    "scroll",
    "tiktok",
)

DEFAULT_BUFF_DURATION = timedelta(hours=2)


def _combined_text(title: str, description: str | None) -> str:
    return f"{title} {description or ''}".lower()


def is_buff_reward(title: str, description: str | None = None) -> bool:
    text = _combined_text(title, description)
    if HOUR_PATTERN.search(text) or MINUTE_PATTERN.search(text):
        return True
    return any(keyword in text for keyword in BUFF_KEYWORDS)


def parse_effect_duration(
    title: str,
    description: str | None = None,
) -> timedelta | None:
    """Возвращает длительность баффа или None, если награда не временная."""
    if not is_buff_reward(title, description):
        return None

    text = _combined_text(title, description)
    hour_match = HOUR_PATTERN.search(text)
    if hour_match:
        return timedelta(hours=int(hour_match.group(1)))

    minute_match = MINUTE_PATTERN.search(text)
    if minute_match:
        return timedelta(minutes=int(minute_match.group(1)))

    return DEFAULT_BUFF_DURATION
