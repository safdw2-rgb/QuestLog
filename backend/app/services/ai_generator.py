import logging
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.config import settings
from app.models.enums import QuestDifficulty, QuestType
from app.services.ai_quest_fallback import generate_smart_fallback
from app.services.ai_quest_prompts import (
    QuestAiContext,
    QUEST_GENERATE_JSON_SCHEMA,
    QUEST_IMPROVE_JSON_SCHEMA,
    build_quest_generate_system_prompt,
    build_quest_generate_user_prompt,
    build_quest_improve_system_prompt,
    build_quest_improve_user_prompt,
)
from app.services.gemini_client import (
    GeminiGenerationError,
    generate_json,
    get_gemini_api_url,
)
from app.services.gold_economy import gold_for_difficulty

logger = logging.getLogger(__name__)

# Обратная совместимость для импортов
GEMINI_MODEL_DEFAULT = "gemini-2.5-flash"
GEMINI_API_URL = get_gemini_api_url()


class QuestAiDetails(BaseModel):
    model_config = ConfigDict(extra="ignore")

    description: str = Field(min_length=10, max_length=2000)
    quest_type: QuestType
    difficulty: QuestDifficulty
    xp_reward: int = Field(ge=0, le=1000)
    gold_reward: int = Field(default=0, ge=0, le=500)


class QuestAiResult(QuestAiDetails):
    source: Literal["gemini", "fallback"]


class QuestAiImproveDetails(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=10, max_length=2000)


class QuestAiImproveResult(QuestAiImproveDetails):
    source: Literal["gemini", "fallback"]


def _sanitize_gemini_quest(data: dict[str, Any]) -> dict[str, Any]:
    """Clamp numeric fields so Pydantic validation doesn't fail on out-of-range values."""
    result = dict(data)
    if "xp_reward" in result:
        try:
            result["xp_reward"] = max(0, min(1000, int(result["xp_reward"])))
        except (TypeError, ValueError):
            result["xp_reward"] = 10
    if "gold_reward" in result:
        try:
            result["gold_reward"] = max(0, min(500, int(result["gold_reward"])))
        except (TypeError, ValueError):
            result["gold_reward"] = 0
    if "description" in result and isinstance(result["description"], str):
        result["description"] = result["description"][:2000]
    return result


class AiQuestGeneratorService:
    async def generate(
        self,
        title: str,
        *,
        latitude: float | None = None,
        longitude: float | None = None,
        faction_name: str | None = None,
        hero_level: int | None = None,
        hero_display_name: str | None = None,
    ) -> QuestAiResult:
        title = title.strip()
        if not title:
            raise ValueError("title is required")

        context = QuestAiContext(
            title=title,
            faction_name=faction_name,
            hero_level=hero_level,
            hero_display_name=hero_display_name,
            latitude=latitude,
            longitude=longitude,
        )

        key_set = bool(settings.gemini_api_key)
        logger.info(
            "AI generate request: title=%r faction=%r level=%s model=%s allow_fallback=%s",
            title,
            faction_name,
            hero_level,
            settings.gemini_model,
            settings.ai_quest_allow_fallback,
        )

        if key_set:
            try:
                details = await self._generate_via_gemini(context)
                details = self._apply_gold_balance(details)
                logger.info("AI generate success via Gemini for title=%r", title)
                return QuestAiResult(**details.model_dump(), source="gemini")
            except Exception as exc:
                if self._should_fallback(exc):
                    logger.warning(
                        "Gemini unavailable (%s) — smart local fallback for title=%r",
                        self._fallback_reason(exc),
                        title,
                    )
                    return self._build_fallback_result(title)

                logger.error(
                    "Gemini generation FAILED for title=%r: %s: %s",
                    title,
                    type(exc).__name__,
                    exc,
                    exc_info=True,
                )
                raise GeminiGenerationError(str(exc)) from exc

        logger.info("GEMINI_API_KEY not set — smart local fallback")
        return self._build_fallback_result(title)

    @staticmethod
    def _should_fallback(exc: Exception) -> bool:
        if not settings.ai_quest_allow_fallback:
            return False
        import httpx

        if isinstance(exc, httpx.HTTPStatusError):
            return exc.response.status_code in {400, 403, 404, 429, 500, 502, 503, 504}
        if isinstance(exc, httpx.RequestError):
            return True
        if isinstance(exc, (ValueError, ValidationError)):
            return True
        return False

    @staticmethod
    def _fallback_reason(exc: Exception) -> str:
        import httpx

        if isinstance(exc, httpx.HTTPStatusError):
            return f"HTTP {exc.response.status_code}"
        return type(exc).__name__

    def _build_fallback_result(self, title: str) -> QuestAiResult:
        payload = generate_smart_fallback(title)
        details = QuestAiDetails.model_validate(payload)
        details = self._apply_gold_balance(details)
        logger.info(
            "Fallback quest: type=%s difficulty=%s xp=%s gold=%s",
            details.quest_type,
            details.difficulty,
            details.xp_reward,
            details.gold_reward,
        )
        return QuestAiResult(**details.model_dump(), source="fallback")

    @staticmethod
    def _apply_gold_balance(details: QuestAiDetails) -> QuestAiDetails:
        data = details.model_dump()
        data["gold_reward"] = gold_for_difficulty(details.difficulty)
        return QuestAiDetails.model_validate(data)

    async def _generate_via_gemini(self, context: QuestAiContext) -> QuestAiDetails:
        parsed = await generate_json(
            system_instruction=build_quest_generate_system_prompt(),
            user_prompt=build_quest_generate_user_prompt(context),
            json_schema=QUEST_GENERATE_JSON_SCHEMA,
            temperature=0.9,
        )
        return QuestAiDetails.model_validate(_sanitize_gemini_quest(parsed))

    async def improve(
        self,
        title: str,
        description: str | None = None,
        *,
        faction_name: str | None = None,
        hero_level: int | None = None,
    ) -> QuestAiImproveResult:
        title = title.strip()
        if not title:
            raise ValueError("title is required")

        current_description = (description or "").strip()
        if not current_description:
            current_description = "Описание пока не задано."

        if settings.gemini_api_key:
            try:
                details = await self._improve_via_gemini(
                    title=title,
                    description=current_description,
                    faction_name=faction_name,
                    hero_level=hero_level,
                )
                return QuestAiImproveResult(
                    **details.model_dump(),
                    source="gemini",
                )
            except Exception as exc:
                if not self._should_fallback(exc):
                    raise GeminiGenerationError(str(exc)) from exc
                logger.warning(
                    "Gemini improve unavailable (%s) — local fallback",
                    self._fallback_reason(exc),
                )

        return self._build_improve_fallback(title, current_description)

    def _build_improve_fallback(
        self,
        title: str,
        description: str,
    ) -> QuestAiImproveResult:
        improved_title = title if title.startswith("⚔") else f"⚔ {title}"
        improved_description = (
            "Тропы судьбы ведут героя сквозь испытание, "
            "где каждый шаг отзывается в хрониках гильдии."
        )
        if description and description != "Описание пока не задано.":
            improved_description = (
                f"Гильдия вновь выносит на свиток поручение «{title.strip()}». "
                f"{improved_description}"
            )

        return QuestAiImproveResult(
            title=improved_title[:200],
            description=improved_description[:2000],
            source="fallback",
        )

    async def _improve_via_gemini(
        self,
        *,
        title: str,
        description: str,
        faction_name: str | None,
        hero_level: int | None,
    ) -> QuestAiImproveDetails:
        parsed = await generate_json(
            system_instruction=build_quest_improve_system_prompt(),
            user_prompt=build_quest_improve_user_prompt(
                title=title,
                description=description,
                faction_name=faction_name,
                hero_level=hero_level,
            ),
            json_schema=QUEST_IMPROVE_JSON_SCHEMA,
            temperature=0.88,
        )
        return QuestAiImproveDetails.model_validate(parsed)


ai_quest_generator = AiQuestGeneratorService()
