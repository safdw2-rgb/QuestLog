import type { QuestDifficulty, QuestStatus, QuestType } from "@/lib/types";
import { formatDifficultyLabel } from "@/lib/difficulty";

export const QUEST_TYPE_LABELS: Record<QuestType, string> = {
  main: "Главный сюжет",
  side: "Побочное",
  daily: "Ежедневное",
  bounty: "Контракт",
  exploration: "Исследование",
  boss: "Босс",
};

export const QUEST_STATUS_LABELS: Record<QuestStatus, string> = {
  active: "Активен",
  completed: "Выполнен",
  failed: "Провален",
  deferred: "Отложен",
  abandoned: "Заброшен",
};

export const QUEST_DIFFICULTY_LABELS: Record<QuestDifficulty, string> = {
  trivial: formatDifficultyLabel("trivial"),
  easy: formatDifficultyLabel("easy"),
  normal: formatDifficultyLabel("normal"),
  hard: formatDifficultyLabel("hard"),
  legendary: formatDifficultyLabel("legendary"),
};
