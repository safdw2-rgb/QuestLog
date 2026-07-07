import type { QuestDifficulty } from "@/lib/types";

/** 1 час отдыха в магазине = 20 золота (2:1 труд/отдых). */
export const GOLD_PER_FOCUS_HOUR = 10;

export const GOLD_BY_DIFFICULTY: Record<QuestDifficulty, number> = {
  trivial: 2,
  easy: 5,
  normal: 10,
  hard: 25,
  legendary: 60,
};

export function goldForDifficulty(difficulty: QuestDifficulty): number {
  return GOLD_BY_DIFFICULTY[difficulty] ?? GOLD_BY_DIFFICULTY.normal;
}

export function goldForRestHours(hours: number): number {
  return Math.max(1, Math.round(hours * GOLD_PER_FOCUS_HOUR * 2));
}

export const DIFFICULTY_GOLD_LABELS: Record<QuestDifficulty, string> = {
  trivial: "2 🪙 (5 мин)",
  easy: "5 🪙 (15–30 мин)",
  normal: "10 🪙 (1 ч фокуса)",
  hard: "25 🪙 (2–3 ч)",
  legendary: "60 🪙 (весь день)",
};
