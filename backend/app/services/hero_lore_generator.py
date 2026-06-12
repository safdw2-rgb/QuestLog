import logging
import re

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.adventurer import Adventurer
from app.models.quest import Quest
from app.services.ai_generator import GEMINI_API_URL, GeminiGenerationError

logger = logging.getLogger(__name__)

MAX_LORE_LENGTH = 1000

HERO_LORE_SYSTEM_PROMPT = """Ты — Лютик (Dandelion) из игры «Ведьмак 3»: бард, хроникёр, остроумный рассказчик.
Составь художественное, балладное, слегка ироничное описание героя по списку его недавних подвигов.

Текст должен быть на русском языке и строго не превышать 1000 символов.
Пиши от третьего лица, как от автора баллады. Не используй markdown.
Не выдумывай подвиги, которых нет в списке — только творчески перескажи указанные квесты.
"""


class HeroLoreGeneratorService:
    async def generate_and_save(
        self,
        db: AsyncSession,
        adventurer: Adventurer,
        recent_quests: list[Quest],
    ) -> str:
        lore = await self.generate(adventurer, recent_quests)
        adventurer.lore = lore
        await db.commit()
        await db.refresh(adventurer)
        return lore

    async def generate(
        self,
        adventurer: Adventurer,
        recent_quests: list[Quest],
    ) -> str:
        quest_titles = [quest.title for quest in recent_quests if quest.title.strip()]
        if not quest_titles:
            quest_titles = ["первые шаги в дневнике заданий"]

        if settings.gemini_api_key:
            try:
                return await self._generate_via_gemini(
                    display_name=adventurer.display_name,
                    quest_titles=quest_titles,
                )
            except Exception as exc:
                logger.warning(
                    "Hero lore Gemini failed for adventurer %s: %s",
                    adventurer.id,
                    exc,
                )
                if not settings.ai_quest_allow_fallback:
                    raise GeminiGenerationError(str(exc)) from exc

        return self._build_fallback_lore(adventurer.display_name, quest_titles)

    def _build_user_prompt(self, display_name: str, quest_titles: list[str]) -> str:
        quests_line = ", ".join(f"«{title}»" for title in quest_titles[:10])
        return (
            f"Имя героя: {display_name}\n"
            f"Недавние выполненные квесты: {quests_line}\n\n"
            "Напиши лор персонажа в стиле Лютика."
        )

    async def _generate_via_gemini(
        self,
        *,
        display_name: str,
        quest_titles: list[str],
    ) -> str:
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                f"{HERO_LORE_SYSTEM_PROMPT}\n\n"
                                f"{self._build_user_prompt(display_name, quest_titles)}"
                            ),
                        },
                    ],
                },
            ],
            "generationConfig": {
                "temperature": 0.9,
                "maxOutputTokens": 512,
            },
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                GEMINI_API_URL,
                params={"key": settings.gemini_api_key},
                json=payload,
            )

        if response.is_error:
            response.raise_for_status()

        data = response.json()
        content = data["candidates"][0]["content"]["parts"][0]["text"]
        return self._normalize_lore(content)

    @staticmethod
    def _normalize_lore(text: str) -> str:
        cleaned = text.strip()
        cleaned = re.sub(r"^```(?:\w+)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if len(cleaned) > MAX_LORE_LENGTH:
            cleaned = cleaned[: MAX_LORE_LENGTH - 1].rstrip() + "…"
        return cleaned

    @staticmethod
    def _build_fallback_lore(display_name: str, quest_titles: list[str]) -> str:
        deeds = ", ".join(f"«{title}»" for title in quest_titles[:5])
        lore = (
            f"Позвольте, дамы и господа, представить вам {display_name} — "
            f"искателя, чьи недавние деяния ({deeds}) уже шепчутся в тавернах. "
            f"Бард бы сказал: судьба любит тех, кто не ленится записывать квесты в дневник."
        )
        return lore[:MAX_LORE_LENGTH]


hero_lore_generator = HeroLoreGeneratorService()
