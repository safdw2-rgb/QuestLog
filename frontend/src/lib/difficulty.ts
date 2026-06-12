import type { QuestDifficulty } from "@/lib/types";

export interface DifficultyLevel {
  value: QuestDifficulty;
  swords: number;
  label: string;
  shortLabel: string;
  tier: "errand" | "adventure" | "trial" | "legendary";
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  {
    value: "trivial",
    swords: 1,
    label: "Поручение",
    shortLabel: "Поручение",
    tier: "errand",
  },
  {
    value: "normal",
    swords: 2,
    label: "Приключение",
    shortLabel: "Приключение",
    tier: "adventure",
  },
  {
    value: "hard",
    swords: 3,
    label: "Испытание",
    shortLabel: "Испытание",
    tier: "trial",
  },
  {
    value: "legendary",
    swords: 4,
    label: "Легендарный квест",
    shortLabel: "Легенда",
    tier: "legendary",
  },
];

const DIFFICULTY_BY_VALUE: Record<QuestDifficulty, DifficultyLevel> = {
  trivial: DIFFICULTY_LEVELS[0],
  easy: DIFFICULTY_LEVELS[0],
  normal: DIFFICULTY_LEVELS[1],
  hard: DIFFICULTY_LEVELS[2],
  legendary: DIFFICULTY_LEVELS[3],
};

export function getDifficultyLevel(
  difficulty: QuestDifficulty,
): DifficultyLevel {
  return DIFFICULTY_BY_VALUE[difficulty];
}

export function formatDifficultySwords(count: number): string {
  return "⚔️".repeat(count);
}

export function formatDifficultyLabel(
  difficulty: QuestDifficulty,
  compact = false,
): string {
  const level = getDifficultyLevel(difficulty);
  const swords = formatDifficultySwords(level.swords);
  const name = compact ? level.shortLabel : level.label;
  return `${swords} ${name}`;
}
