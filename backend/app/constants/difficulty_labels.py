"""Отображаемые названия сложности квестов (4 уровня)."""

from app.models.enums import QuestDifficulty

DIFFICULTY_DISPLAY_LABELS: dict[QuestDifficulty, str] = {
    QuestDifficulty.TRIVIAL: "⚔️ Поручение",
    QuestDifficulty.EASY: "⚔️ Поручение",
    QuestDifficulty.NORMAL: "⚔️⚔️ Приключение",
    QuestDifficulty.HARD: "⚔️⚔️⚔️ Испытание",
    QuestDifficulty.LEGENDARY: "⚔️⚔️⚔️⚔️ Легендарный квест",
}
