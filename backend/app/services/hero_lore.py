import logging
from datetime import datetime
from pathlib import Path

from app.config import settings
from app.models.quest import Quest

logger = logging.getLogger(__name__)

HERO_LORE_DIR = "Hero_Lore"
SKILLS_FILE = "Skills.md"
LDVIR_FILE = "Ldvir_History.md"

MUSIC_FACTION_MARKERS = {"музыка", "music"}
LDVIR_FACTION_MARKERS = {"ldvir.ua", "ldvir"}
SKILL_KEYWORDS = (
    "бас",
    "bass",
    "serum",
    "гитар",
    "guitar",
    "синт",
    "synth",
    "музык",
    "music",
    "урок",
    "пресет",
    "preset",
    "сэмпл",
    "sample",
    "daw",
    "ableton",
)


class HeroLoreService:
    def record_quest_completion(
        self,
        quest: Quest,
        *,
        faction_name: str | None = None,
        faction_slug: str | None = None,
    ) -> None:
        vault = settings.obsidian_vault_path
        if not vault:
            logger.debug("OBSIDIAN_VAULT_PATH not set — skip hero lore")
            return

        lore_dir = Path(vault).expanduser().resolve() / HERO_LORE_DIR
        lore_dir.mkdir(parents=True, exist_ok=True)

        date_label = self._completion_date(quest)
        text_blob = self._quest_text(quest)

        if self._should_log_skills(text_blob, faction_name, faction_slug):
            self._append_line(
                lore_dir / SKILLS_FILE,
                self._skills_entry(quest, date_label),
                header="# Навыки и практика\n\n",
            )

        if self._should_log_ldvir(faction_name, faction_slug):
            self._append_line(
                lore_dir / LDVIR_FILE,
                self._ldvir_entry(quest, date_label),
                header="# История Ldvir.ua\n\n",
            )

    def _completion_date(self, quest: Quest) -> str:
        when = quest.completed_at or quest.updated_at
        return when.strftime("%Y-%m-%d") if when else datetime.now().strftime("%Y-%m-%d")

    @staticmethod
    def _quest_text(quest: Quest) -> str:
        parts = [quest.title]
        if quest.description:
            parts.append(quest.description)
        return " ".join(parts).lower()

    @staticmethod
    def _should_log_skills(
        text_blob: str,
        faction_name: str | None,
        faction_slug: str | None,
    ) -> bool:
        faction_blob = " ".join(
            value.lower()
            for value in (faction_name, faction_slug)
            if value
        )
        if any(marker in faction_blob for marker in MUSIC_FACTION_MARKERS):
            return True
        return any(keyword in text_blob for keyword in SKILL_KEYWORDS)

    @staticmethod
    def _should_log_ldvir(
        faction_name: str | None,
        faction_slug: str | None,
    ) -> bool:
        faction_blob = " ".join(
            value.lower()
            for value in (faction_name, faction_slug)
            if value
        )
        return any(marker in faction_blob for marker in LDVIR_FACTION_MARKERS)

    def _skills_entry(self, quest: Quest, date_label: str) -> str:
        text_blob = self._quest_text(quest)
        if "бас" in text_blob or "bass" in text_blob:
            body = "Проведена практика игры на бас-гитаре"
        elif "serum" in text_blob:
            body = "Работа с Serum: пресеты, звук и творчество"
        elif any(word in text_blob for word in ("гитар", "guitar")):
            body = "Музыкальная практика на гитаре"
        else:
            body = f"Завершён творческий квест: {quest.title}"
        return f"- [{date_label}] {body}"

    def _ldvir_entry(self, quest: Quest, date_label: str) -> str:
        if quest.description:
            summary = quest.description.strip().split("\n", maxsplit=1)[0]
            if len(summary) > 120:
                summary = summary[:117] + "..."
            return f"- [{date_label}] {quest.title} — {summary}"
        return f"- [{date_label}] {quest.title}"

    @staticmethod
    def _append_line(file_path: Path, line: str, *, header: str) -> None:
        if file_path.exists():
            content = file_path.read_text(encoding="utf-8")
            if line.strip() in content:
                logger.info("Hero lore line already exists in %s", file_path.name)
                return
            if not content.endswith("\n"):
                content += "\n"
            content += f"{line}\n"
        else:
            content = f"{header}{line}\n"

        file_path.write_text(content, encoding="utf-8")
        logger.info("Hero lore appended: %s", file_path)


hero_lore_service = HeroLoreService()
