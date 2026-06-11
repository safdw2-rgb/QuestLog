import json
import logging
import re
from typing import Literal

import httpx
from pydantic import BaseModel, Field, ValidationError

from app.config import settings
from app.models.enums import QuestDifficulty, QuestType
from app.services.ai_quest_fallback import generate_smart_fallback

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Ты — мастер подземелий для RPG-дневника заданий QuestLog.
По названию квеста сгенерируй детали задания.

Ответь ТОЛЬКО валидным JSON без markdown-обёртки:
{
  "description": "2-4 предложения художественного описания на русском",
  "quest_type": "main" или "side",
  "difficulty": "trivial" | "normal" | "hard" | "legendary",
  "xp_reward": целое число 10-500,
  "gold_reward": целое число 5-200
}

Правила баланса:
- trivial: xp 10-30, gold 5-15
- normal: xp 40-80, gold 15-35
- hard: xp 90-180, gold 35-70
- legendary: xp 200-500, gold 70-200
- main — для крупных целей, side — для обычных дел
"""


class QuestAiDetails(BaseModel):
    description: str = Field(min_length=10, max_length=2000)
    quest_type: QuestType
    difficulty: QuestDifficulty
    xp_reward: int = Field(ge=0, le=1000)
    gold_reward: int = Field(ge=0, le=500)


class QuestAiResult(QuestAiDetails):
    source: Literal["openrouter", "fallback"]


class OpenRouterGenerationError(RuntimeError):
    """OpenRouter недоступен, а fallback отключён (AI_QUEST_ALLOW_FALLBACK=false)."""


class AiQuestGeneratorService:
    async def generate(self, title: str) -> QuestAiResult:
        title = title.strip()
        if not title:
            raise ValueError("title is required")

        key_set = bool(settings.openrouter_api_key)
        logger.info(
            "AI generate request: title=%r key_set=%s model=%s allow_fallback=%s",
            title,
            key_set,
            settings.openrouter_model,
            settings.ai_quest_allow_fallback,
        )

        if key_set:
            try:
                details = await self._generate_via_openrouter(title)
                logger.info("AI generate success via OpenRouter for title=%r", title)
                return QuestAiResult(**details.model_dump(), source="openrouter")
            except Exception as exc:
                if self._should_fallback(exc):
                    reason = self._fallback_reason(exc)
                    logger.warning(
                        "OpenRouter unavailable (%s) — smart local fallback for title=%r",
                        reason,
                        title,
                    )
                    return self._build_fallback_result(title)

                logger.error(
                    "OpenRouter generation FAILED for title=%r: %s: %s",
                    title,
                    type(exc).__name__,
                    exc,
                    exc_info=True,
                )
                raise OpenRouterGenerationError(str(exc)) from exc

        logger.info("OPENROUTER_API_KEY not set — smart local fallback")
        return self._build_fallback_result(title)

    @staticmethod
    def _should_fallback(exc: Exception) -> bool:
        if not settings.ai_quest_allow_fallback:
            return False
        if isinstance(exc, httpx.HTTPStatusError):
            # 429 rate limit, 404 model gone, 5xx upstream — отдаём локальный лор
            return exc.response.status_code in {404, 429, 500, 502, 503, 504}
        if isinstance(exc, httpx.RequestError):
            return True
        if isinstance(exc, (ValueError, ValidationError, json.JSONDecodeError)):
            return True
        return False

    @staticmethod
    def _fallback_reason(exc: Exception) -> str:
        if isinstance(exc, httpx.HTTPStatusError):
            return f"HTTP {exc.response.status_code}"
        return type(exc).__name__

    def _build_fallback_result(self, title: str) -> QuestAiResult:
        payload = generate_smart_fallback(title)
        details = QuestAiDetails.model_validate(payload)
        logger.info(
            "Fallback quest: type=%s difficulty=%s xp=%s gold=%s",
            details.quest_type,
            details.difficulty,
            details.xp_reward,
            details.gold_reward,
        )
        return QuestAiResult(**details.model_dump(), source="fallback")

    async def _generate_via_openrouter(self, title: str) -> QuestAiDetails:
        payload = {
            "model": settings.openrouter_model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Название квеста: {title}"},
            ],
            "temperature": 0.8,
            "response_format": {"type": "json_object"},
        }

        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://questlog.local",
            "X-Title": "QuestLog",
        }

        logger.info("OpenRouter POST model=%s", settings.openrouter_model)

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    json=payload,
                    headers=headers,
                )
        except httpx.RequestError as exc:
            logger.error("OpenRouter network error: %s", exc, exc_info=True)
            raise

        if response.is_error:
            logger.error(
                "OpenRouter HTTP %s body=%s",
                response.status_code,
                response.text[:2000],
            )
            response.raise_for_status()

        try:
            data = response.json()
        except json.JSONDecodeError as exc:
            logger.error("OpenRouter response is not JSON: %s", response.text[:2000])
            raise ValueError("OpenRouter returned non-JSON response") from exc

        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            logger.error("Unexpected OpenRouter response shape: %s", data)
            raise ValueError(f"Unexpected OpenRouter response shape: {data}") from exc

        logger.info("OpenRouter content preview: %s", content[:300])

        try:
            parsed = self._parse_json_content(content)
        except json.JSONDecodeError as exc:
            logger.error("Failed to parse model JSON content: %s", content[:2000])
            raise ValueError(f"Model returned invalid JSON: {content[:500]}") from exc

        try:
            return QuestAiDetails.model_validate(parsed)
        except ValidationError as exc:
            logger.error("Model JSON failed validation: %s errors=%s", parsed, exc)
            raise ValueError(f"Model JSON schema mismatch: {exc}") from exc

    @staticmethod
    def _parse_json_content(content: str) -> dict:
        content = content.strip()
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)
        return json.loads(content)


ai_quest_generator = AiQuestGeneratorService()
