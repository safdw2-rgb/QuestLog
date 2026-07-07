"""Баланс золота: привязка к «Часам Фокуса» и сложности квеста."""

from app.models.enums import QuestDifficulty

# 1 час отдыха в магазине = 20 золота; 2:1 труд/отдых.
GOLD_PER_FOCUS_HOUR = 10

GOLD_BY_DIFFICULTY: dict[QuestDifficulty, int] = {
    QuestDifficulty.TRIVIAL: 2,      # ~5 мин
    QuestDifficulty.EASY: 5,           # 15–30 мин
    QuestDifficulty.NORMAL: 10,      # 1 час фокуса (Medium)
    QuestDifficulty.HARD: 25,        # 2–3 часа
    QuestDifficulty.LEGENDARY: 60,     # целый день (Epic)
}


def gold_for_difficulty(difficulty: QuestDifficulty) -> int:
    return GOLD_BY_DIFFICULTY.get(difficulty, GOLD_BY_DIFFICULTY[QuestDifficulty.NORMAL])


def gold_for_rest_hours(hours: float) -> int:
    """Стоимость награды-отдыха: 2 часа работы = 1 час отдыха."""
    return max(1, round(hours * GOLD_PER_FOCUS_HOUR * 2))
