import enum
from typing import TypeVar

from sqlalchemy import Enum as SAEnum

E = TypeVar("E", bound=enum.Enum)


def pg_enum(enum_cls: type[E]) -> SAEnum:
    """PostgreSQL enum: сохраняем .value ('side'), а не .name ('SIDE')."""
    return SAEnum(enum_cls, values_callable=lambda choices: [item.value for item in choices])


class QuestType(str, enum.Enum):
    """Тип квеста — влияет на отображение, награды и правила достижений."""

    MAIN = "main"  # главная сюжетная линия / крупная цель
    SIDE = "side"  # побочное задание
    DAILY = "daily"  # ежедневный ритуал
    BOUNTY = "bounty"  # контракт с дедлайном
    EXPLORATION = "exploration"  # исследование / новая территория
    BOSS = "boss"  # сложная «босс-задача»


class QuestStatus(str, enum.Enum):
    """Жизненный цикл квеста."""

    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    DEFERRED = "deferred"  # отложен, но не провален
    ABANDONED = "abandoned"  # сознательно заброшен


class QuestDifficulty(str, enum.Enum):
    TRIVIAL = "trivial"
    EASY = "easy"
    NORMAL = "normal"
    HARD = "hard"
    LEGENDARY = "legendary"


class StepStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class PlaceType(str, enum.Enum):
    """Тип локации на карте — для RPG-атмосферы."""

    SETTLEMENT = "settlement"
    TAVERN = "tavern"
    WILDERNESS = "wilderness"
    DUNGEON = "dungeon"
    STRONGHOLD = "stronghold"  # дом, офис
    SHRINE = "shrine"  # спортзал, врач
    MARKET = "market"
    UNKNOWN = "unknown"


class AchievementRarity(str, enum.Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class AchievementConditionType(str, enum.Enum):
    """Условие разблокировки — проверяется сервисом достижений."""

    QUESTS_COMPLETED = "quests_completed"
    QUESTS_FAILED = "quests_failed"
    STREAK_DAYS = "streak_days"
    BOSS_DEFEATED = "boss_defeated"
    GOLD_EARNED = "gold_earned"
    XP_EARNED = "xp_earned"
    FACTION_QUESTS = "faction_quests"  # N квестов в одной фракции
    DEADLINE_HERO = "deadline_hero"  # выполнить N квестов до дедлайна


class JournalEntryType(str, enum.Enum):
    PROGRESS = "progress"
    COMPLETION = "completion"
    FAILURE = "failure"
    LORE = "lore"  # заметка от игрока в дневник
