from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.faction import (
    REPUTATION_GAIN_ON_COMPLETE,
    adjust_faction_reputation,
)
from app.models.adventurer import Adventurer
from app.models.enums import JournalEntryType, QuestStatus
from app.models.journal import JournalEntry
from app.models.quest import Quest
from app.services.leveling import level_from_total_xp


class AdventurerNotFoundError(Exception):
    pass


class QuestCompletionService:
    async def complete_quest(self, db: AsyncSession, quest: Quest) -> Quest:
        adventurer = await db.get(Adventurer, quest.adventurer_id)
        if adventurer is None:
            raise AdventurerNotFoundError(quest.adventurer_id)

        now = datetime.now(UTC)
        xp_earned = quest.xp_reward
        gold_earned = quest.gold_reward

        quest.status = QuestStatus.COMPLETED
        quest.completed_at = now
        quest.failed_at = None
        quest.fail_reason = None
        quest.xp_earned = xp_earned
        quest.gold_earned = gold_earned

        old_level = adventurer.level
        adventurer.experience_points += xp_earned
        adventurer.gold += gold_earned
        adventurer.level = level_from_total_xp(adventurer.experience_points)

        journal = JournalEntry(
            adventurer_id=adventurer.id,
            quest_id=quest.id,
            entry_type=JournalEntryType.COMPLETION,
            content=self._build_journal_content(
                quest=quest,
                xp_earned=xp_earned,
                gold_earned=gold_earned,
                old_level=old_level,
                new_level=adventurer.level,
            ),
        )
        db.add(journal)

        if quest.faction_id is not None:
            await adjust_faction_reputation(
                db,
                quest.faction_id,
                REPUTATION_GAIN_ON_COMPLETE,
            )

        return quest

    @staticmethod
    def _build_journal_content(
        *,
        quest: Quest,
        xp_earned: int,
        gold_earned: int,
        old_level: int,
        new_level: int,
    ) -> str:
        lines = [
            f"Квест «{quest.title}» успешно завершён.",
            f"Награда: +{xp_earned} XP, +{gold_earned} золота.",
        ]
        if new_level > old_level:
            lines.append(f"Уровень повышен: {old_level} → {new_level}!")
        return "\n".join(lines)


quest_completion_service = QuestCompletionService()
