import logging
from datetime import datetime
from pathlib import Path

from app.config import settings
from app.models.enums import QuestStatus
from app.models.quest import Quest

logger = logging.getLogger(__name__)

QUESTS_SUBDIR = "Quests"


class ObsidianSyncService:
    def sync_quest(
        self,
        quest: Quest,
        *,
        adventurer_level: int | None = None,
    ) -> Path | None:
        vault = settings.obsidian_vault_path
        if not vault:
            logger.debug("OBSIDIAN_VAULT_PATH not set — skip sync")
            return None

        vault_path = Path(vault).expanduser().resolve()
        quests_dir = vault_path / QUESTS_SUBDIR
        quests_dir.mkdir(parents=True, exist_ok=True)

        file_path = quests_dir / f"quest-{quest.id}.md"
        file_path.write_text(
            self._render_markdown(quest, adventurer_level=adventurer_level),
            encoding="utf-8",
        )
        logger.info("Obsidian quest synced: %s", file_path)
        return file_path

    def _render_markdown(
        self,
        quest: Quest,
        *,
        adventurer_level: int | None,
    ) -> str:
        frontmatter = self._build_frontmatter(quest, adventurer_level=adventurer_level)
        body = self._build_body(quest)
        return f"{frontmatter}\n\n{body}\n"

    def _build_frontmatter(
        self,
        quest: Quest,
        *,
        adventurer_level: int | None,
    ) -> str:
        lines = [
            "---",
            f"id: {quest.id}",
            f"title: {self._yaml_scalar(quest.title)}",
            f"status: {quest.status.value}",
            f"quest_type: {quest.quest_type.value}",
            f"difficulty: {quest.difficulty.value}",
            f"xp_reward: {quest.xp_reward}",
            f"gold_reward: {quest.gold_reward}",
            f"xp_earned: {quest.xp_earned}",
            f"gold_earned: {quest.gold_earned}",
            f"adventurer_id: {quest.adventurer_id}",
        ]

        if adventurer_level is not None:
            lines.append(f"adventurer_level: {adventurer_level}")

        lines.extend(
            [
                f"created_at: {self._fmt_dt(quest.created_at)}",
                f"started_at: {self._fmt_dt(quest.started_at)}",
                f"completed_at: {self._fmt_dt(quest.completed_at)}",
                f"failed_at: {self._fmt_dt(quest.failed_at)}",
                f"deadline: {self._fmt_dt(quest.deadline)}",
                f"fail_reason: {self._yaml_scalar(quest.fail_reason)}",
                "tags:",
                "  - questlog",
                f"  - status/{quest.status.value}",
                "---",
            ]
        )
        return "\n".join(lines)

    def _build_body(self, quest: Quest) -> str:
        status_badge = {
            QuestStatus.ACTIVE: "🟡 Активен",
            QuestStatus.COMPLETED: "✅ Выполнен",
            QuestStatus.FAILED: "❌ Провален",
            QuestStatus.DEFERRED: "⏸ Отложен",
            QuestStatus.ABANDONED: "⚫ Заброшен",
        }[quest.status]

        parts = [
            f"# {quest.title}",
            "",
            f"> Статус: **{status_badge}** · Тип: `{quest.quest_type.value}` · "
            f"Сложность: `{quest.difficulty.value}`",
            "",
            "## Описание",
            "",
            quest.description or "_Описание не указано._",
            "",
            "## Награды",
            "",
            f"- XP: **{quest.xp_reward}** (заработано: {quest.xp_earned})",
            f"- Золото: **{quest.gold_reward}** (заработано: {quest.gold_earned})",
            "",
            "## Связи",
            "",
            "- [[Quest]]",
            "- [[Adventurer]]",
            "- [[Economy]]",
        ]

        if quest.status == QuestStatus.FAILED and quest.fail_reason:
            parts.extend(["", "## Причина провала", "", quest.fail_reason])

        if quest.status == QuestStatus.COMPLETED and quest.completed_at:
            parts.extend(
                [
                    "",
                    "## Итог",
                    "",
                    f"Квест завершён {self._fmt_dt(quest.completed_at)}.",
                ]
            )

        return "\n".join(parts)

    @staticmethod
    def _yaml_scalar(value: str | None) -> str:
        if value is None:
            return "null"
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'

    @staticmethod
    def _fmt_dt(value: datetime | None) -> str:
        return value.isoformat() if value else "null"


obsidian_sync_service = ObsidianSyncService()
