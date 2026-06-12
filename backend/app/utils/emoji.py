import re

_EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "]+",
    flags=re.UNICODE,
)


def extract_emoji_from_text(text: str) -> str | None:
    match = _EMOJI_PATTERN.search(text)
    return match.group(0) if match else None


def resolve_faction_icon(name: str, icon: str | None) -> str | None:
    if icon and icon.strip():
        return icon.strip()[:32]
    return extract_emoji_from_text(name)
