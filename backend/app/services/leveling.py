def total_xp_for_level(level: int) -> int:
    """Суммарный XP, необходимый для достижения уровня (уровень 1 = 0 XP)."""
    if level <= 1:
        return 0
    return 50 * level * (level - 1)


def level_from_total_xp(xp: int) -> int:
    """Текущий уровень по накопленному опыту."""
    level = 1
    while total_xp_for_level(level + 1) <= xp:
        level += 1
    return level
