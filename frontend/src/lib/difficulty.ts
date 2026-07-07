import type { QuestDifficulty } from "@/lib/types";

export interface DifficultyLevel {
  value: QuestDifficulty;
  swords: number;
  label: string;
  shortLabel: string;
  tier: "errand" | "adventure" | "trial" | "legendary";
  /** Подсказка об условиях сложности, показывается под селектором. */
  hint: string;
  /** Базовая награда за квест такой сложности (до ручной корректировки). */
  baseXp: number;
  baseGold: number;
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  {
    value: "trivial",
    swords: 1,
    label: "Поручение",
    shortLabel: "Поручение",
    tier: "errand",
    hint: "Простая задача, мелкое дело или рутина до 15–30 минут.",
    baseXp: 10,
    baseGold: 2,
  },
  {
    value: "normal",
    swords: 2,
    label: "Приключение",
    shortLabel: "Приключение",
    tier: "adventure",
    hint: "Обычное дело, требующее сосредоточенности до 1–2 часов.",
    baseXp: 50,
    baseGold: 10,
  },
  {
    value: "hard",
    swords: 3,
    label: "Испытание",
    shortLabel: "Испытание",
    tier: "trial",
    hint: "Сложный вызов, требующий серьезных усилий или нескольких дней работы.",
    baseXp: 150,
    baseGold: 30,
  },
  {
    value: "legendary",
    swords: 4,
    label: "Легендарный квест",
    shortLabel: "Легенда",
    tier: "legendary",
    hint: "Эпический проект или ключевая жизненная веха, требующая огромных ресурсов.",
    baseXp: 500,
    baseGold: 100,
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
