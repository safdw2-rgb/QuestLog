"""Обратная совместимость — основная реализация в ai_generator.py."""

from app.services.ai_generator import (
    AiQuestGeneratorService,
    GeminiGenerationError,
    QuestAiDetails,
    QuestAiResult,
    ai_quest_generator,
)

__all__ = [
    "AiQuestGeneratorService",
    "GeminiGenerationError",
    "QuestAiDetails",
    "QuestAiResult",
    "ai_quest_generator",
]

# Старое имя ошибки для импортов
OpenRouterGenerationError = GeminiGenerationError
