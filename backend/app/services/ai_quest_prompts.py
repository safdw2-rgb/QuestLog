"""Контекст и промпты для ИИ-генерации квестов."""

from __future__ import annotations

from dataclasses import dataclass

QUEST_GENERATE_JSON_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "description": {
            "type": "string",
            "description": "2-4 предложения уникального RPG-описания на русском",
        },
        "quest_type": {
            "type": "string",
            "enum": ["main", "side", "daily"],
        },
        "difficulty": {
            "type": "string",
            "enum": ["trivial", "easy", "normal", "hard", "legendary"],
        },
        "xp_reward": {
            "type": "integer",
        },
        "gold_reward": {
            "type": "integer",
            "description": "Награда золотом (0–100)",
        },
    },
    "required": ["description", "quest_type", "difficulty", "xp_reward", "gold_reward"],
}

QUEST_IMPROVE_JSON_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string",
            "description": "Улучшенное эпичное название квеста на русском",
        },
        "description": {
            "type": "string",
            "description": "2-4 предложения улучшенного RPG-описания на русском",
        },
    },
    "required": ["title", "description"],
}

_FACTION_STYLE_HINTS: tuple[tuple[str, str], ...] = (
    ("семь", "клановые саги, домашние поручения, очаг и забота о близких"),
    ("family", "клановые саги, домашние поручения, очаг и забота о близких"),
    ("работ", "корпоративные контракты, дедлайны гильдии, офисная мистика"),
    ("work", "корпоративные контракты, дедлайны гильдии, офисная мистика"),
    ("саморазвит", "путь ученика, тренировки мастерства, внутренний рост героя"),
    ("self", "путь ученика, тренировки мастерства, внутренний рост героя"),
    ("здоров", "ритуалы восстановления, алхимия тела и духа"),
    ("health", "ритуалы восстановления, алхимия тела и духа"),
)


@dataclass(frozen=True)
class QuestAiContext:
    title: str
    faction_name: str | None = None
    hero_level: int | None = None
    hero_display_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None


def hero_rank_label(level: int | None) -> str:
    if level is None or level <= 1:
        return "новичок — простые поручения и обучающие контракты"
    if level <= 3:
        return "подмастерье — уверенные приключения средней сложности"
    if level <= 6:
        return "опытный авантюрист — серьёзные испытания"
    if level <= 10:
        return "ветеран — сложные контракты с высокими ставками"
    return "легендарный герой — эпические саги и судьбоносные задания"


def faction_style_hint(faction_name: str | None) -> str:
    if not faction_name:
        return (
            "нейтральный контракт гильдии искателей без привязки к конкретной фракции"
        )

    lowered = faction_name.lower()
    for needle, hint in _FACTION_STYLE_HINTS:
        if needle in lowered:
            return hint

    return (
        f"уникальная стилистика фракции «{faction_name}» — вплети её ценности и тон в лор"
    )


def build_quest_generate_system_prompt() -> str:
    return """Ты — мастер подземелий для RPG-дневника QuestLog в атмосфере тёмного фэнтези.

Твоя задача — по входному контексту создать УНИКАЛЬНЫЙ квест. Каждый ответ должен быть
оригинальным художественным текстом на русском языке.

СТРОГО ЗАПРЕЩЕНО:
- использовать шаблонные заготовки и клише вроде «судьба зовёт», «герой должен» без конкретики;
- копировать примеры из инструкции;
- писать что-либо кроме JSON.

Учитывай фракцию: для работы — корпоративные контракты и дедлайны;
для семьи — клановые саги и домашние квесты; для саморазвития — путь ученика.
Учитывай уровень героя: новичку — скромные поручения, ветерану — эпические контракты.

Верни JSON со полями:
- description: 2-4 предложения живого RPG-лора, привязанного к названию и контексту;
- quest_type: main | side | daily;
- difficulty: trivial | easy | normal | hard | legendary;
- xp_reward: целое число по балансу (trivial 10-30, easy 15-35, normal 25-50,
  hard 45-80, legendary 80-150). Поле gold_reward не возвращай."""


def build_quest_generate_user_prompt(context: QuestAiContext) -> str:
    parts = [
        f"Название квеста от игрока: {context.title}",
        f"Стилистика фракции: {faction_style_hint(context.faction_name)}",
    ]

    if context.faction_name:
        parts.append(f"Фракция: {context.faction_name}")

    if context.hero_level is not None:
        hero = context.hero_display_name or "Герой"
        parts.append(
            f"Герой: {hero}, уровень {context.hero_level} "
            f"({hero_rank_label(context.hero_level)})"
        )

    if context.latitude is not None and context.longitude is not None:
        parts.append(
            f"Точка на карте мира: широта {context.latitude}, долгота {context.longitude}. "
            "Вплети географический контекст в описание."
        )

    parts.append(
        "Сгенерируй уникальное описание и параметры квеста строго в JSON."
    )
    return "\n".join(parts)


def build_quest_improve_system_prompt() -> str:
    return """Ты — мастер подземелий QuestLog. Улучши существующий квест:
сделай название и описание более художественными, атмосферными и уникальными.
Сохрани смысл задания. Не используй шаблонные фразы.

ВАЖНО: верни ПОЛНОСТЬЮ НОВЫЕ title и description, которые заменяют старые.
Не дописывай и не конкатенируй старый текст — только итоговые значения полей.

Верни только JSON с полями title и description на русском языке."""


def build_quest_improve_user_prompt(
    *,
    title: str,
    description: str,
    faction_name: str | None = None,
    hero_level: int | None = None,
) -> str:
    parts = [
        f"Текущее название: {title}",
        f"Текущее описание: {description}",
        f"Стилистика фракции: {faction_style_hint(faction_name)}",
    ]
    if faction_name:
        parts.append(f"Фракция: {faction_name}")
    if hero_level is not None:
        parts.append(f"Уровень героя: {hero_level} ({hero_rank_label(hero_level)})")
    return "\n".join(parts)
