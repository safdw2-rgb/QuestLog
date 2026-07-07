import logging
import re

from pydantic import BaseModel, Field

from app.config import settings
from app.services.gemini_client import GeminiGenerationError, generate_content

logger = logging.getLogger(__name__)

REWARD_DESCRIPTION_SYSTEM_PROMPT = """Ты — лавочник в тёмном фэнтези-RPG мире в духе Gothic.
По названию товара и фракции-поставщику напиши короткое атмосферное описание для магазина наград.

Требования:
- русский язык
- 200–300 символов (не больше 320)
- стиль RPG-дневника: осязаемо, с характером, без markdown
- не перечисляй характеристики и цены — только лор и настроение предмета
- каждый ответ уникален, без шаблонных фраз"""


class RewardDescriptionResult(BaseModel):
    description: str = Field(min_length=20, max_length=320)
    source: str = "gemini"


class RewardDescriptionGeneratorService:
    async def generate(
        self,
        title: str,
        *,
        faction_name: str | None = None,
    ) -> RewardDescriptionResult:
        title = title.strip()
        if not title:
            raise ValueError("title is required")

        if not settings.gemini_api_key:
            if settings.ai_quest_allow_fallback:
                return RewardDescriptionResult(
                    description=self._build_fallback(title, faction_name),
                    source="fallback",
                )
            raise GeminiGenerationError("GEMINI_API_KEY is not set")

        try:
            description = await self._generate_via_gemini(title, faction_name)
            return RewardDescriptionResult(description=description, source="gemini")
        except Exception as exc:
            logger.warning("Reward description Gemini failed: %s", exc)
            if settings.ai_quest_allow_fallback:
                return RewardDescriptionResult(
                    description=self._build_fallback(title, faction_name),
                    source="fallback",
                )
            raise GeminiGenerationError(str(exc)) from exc

    def _build_user_prompt(self, title: str, faction_name: str | None) -> str:
        faction_line = (
            f"Фракция-поставщик: {faction_name}"
            if faction_name
            else "Фракция-поставщик: не указана (обычный рыночный товар)"
        )
        return f"Название товара: {title}\n{faction_line}\n\nНапиши уникальное описание для витрины магазина."

    async def _generate_via_gemini(
        self,
        title: str,
        faction_name: str | None,
    ) -> str:
        content = await generate_content(
            system_instruction=REWARD_DESCRIPTION_SYSTEM_PROMPT,
            user_prompt=self._build_user_prompt(title, faction_name),
            temperature=0.88,
            max_output_tokens=256,
        )
        return self._normalize_description(content)

    @staticmethod
    def _normalize_description(text: str) -> str:
        cleaned = text.strip()
        cleaned = re.sub(r"^```(?:\w+)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if len(cleaned) > 320:
            cleaned = cleaned[:317].rstrip() + "…"
        return cleaned

    @staticmethod
    def _build_fallback(title: str, faction_name: str | None) -> str:
        if faction_name:
            return (
                f"«{title}» — редкая находка из сундуков {faction_name}. "
                f"Торговцы шепчут, что предмет пахнет приключениями и старым дымом костра."
            )[:320]
        return (
            f"«{title}» — трофей для искателя, что ценит практичность не меньше славы. "
            f"На прилавке лежит ровно так, будто ждало именно вас."
        )[:320]


reward_description_generator = RewardDescriptionGeneratorService()
