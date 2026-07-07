import logging
import re
from datetime import datetime

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.crud.faction import list_factions
from app.db.session import async_session_factory
from app.models.adventurer_faction_reputation import AdventurerFactionReputation
from app.schemas.faction import FactionRead
from app.services.gemini_client import generate_content
from app.services.telegram_notifier import send_telegram_message

logger = logging.getLogger(__name__)

MAX_REPORT_LENGTH = 2000
LEGACY_SEASON_ADVENTURER_ID = 1

SEASON_SYSTEM_PROMPT = """Ты — Лютик (Dandelion) из «Ведьмака 3»: бард и хроникёр.
Составь художественный, ироничный ежемесячный отчёт-балладу о балансе репутации героя Павла между фракциями.

Текст должен быть на русском языке, до 1500 символов, без markdown.
Укажи, какой гильдии герой уделил больше внимания, какую забросил, и дай 1–2 вывода на следующий месяц.
Опирайся только на переданные очки репутации."""


class FactionSeasonReportService:
    async def run_monthly_season(self) -> None:
        async with async_session_factory() as db:
            factions = await list_factions(
                db,
                adventurer_id=LEGACY_SEASON_ADVENTURER_ID,
            )
            active = [f for f in factions if f.reputation_points > 0]

            if not active:
                logger.info("Monthly faction season: no reputation to report")
                return

            month_label = datetime.now().strftime("%B %Y")
            report = await self._generate_report(active, month_label)
            sent = await send_telegram_message(
                f"📜 Итоги месяца ({month_label})\n\n{report}",
            )

            if sent:
                await self._reset_all_reputation(db)
                logger.info(
                    "Monthly faction season: report sent, reputations reset",
                )
            else:
                logger.warning(
                    "Monthly faction season: Telegram failed — reputation not reset",
                )

    async def _generate_report(
        self,
        factions: list[FactionRead],
        month_label: str,
    ) -> str:
        lines = [
            f"Месяц: {month_label}",
            "Очки репутации по фракциям:",
        ]
        for faction in sorted(
            factions,
            key=lambda item: item.reputation_points,
            reverse=True,
        ):
            icon = f"{faction.icon} " if faction.icon else ""
            lines.append(f"- {icon}{faction.name}: {faction.reputation_points}")

        user_prompt = "\n".join(lines)

        if settings.gemini_api_key:
            try:
                return await self._generate_via_gemini(user_prompt)
            except Exception as exc:
                logger.warning("Faction season Gemini failed: %s", exc)

        return self._build_fallback_report(factions)

    async def _generate_via_gemini(self, user_prompt: str) -> str:
        content = await generate_content(
            system_instruction=SEASON_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.9,
            max_output_tokens=768,
            timeout=45.0,
        )
        return self._normalize_text(content)

    @staticmethod
    def _normalize_text(text: str) -> str:
        cleaned = text.strip()
        cleaned = re.sub(r"^```(?:\w+)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        if len(cleaned) > MAX_REPORT_LENGTH:
            cleaned = cleaned[: MAX_REPORT_LENGTH - 1].rstrip() + "…"
        return cleaned

    @staticmethod
    def _build_fallback_report(factions: list[FactionRead]) -> str:
        top = max(factions, key=lambda item: item.reputation_points)
        low = min(factions, key=lambda item: item.reputation_points)
        return (
            f"Паша, месяц вышел показательным: гильдия «{top.name}» вела хоровод "
            f"({top.reputation_points} очков), а «{low.name}» томилась в тени "
            f"({low.reputation_points}). Бард советует в новом сезоне хотя бы махнуть "
            f"рукой остальным гильдиям — иначе слухи разойдутся."
        )

    @staticmethod
    async def _reset_all_reputation(db: AsyncSession) -> None:
        await db.execute(
            update(AdventurerFactionReputation).values(reputation_points=0),
        )
        await db.commit()


faction_season_service = FactionSeasonReportService()
