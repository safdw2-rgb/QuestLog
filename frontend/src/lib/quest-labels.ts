import type { QuestDifficulty, QuestStatus, QuestType } from "@/lib/types";

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
  trivial: "Пустяк",
  easy: "Лёгкий",
  normal: "Обычный",
  hard: "Сложный",
  legendary: "Легендарный",
};
