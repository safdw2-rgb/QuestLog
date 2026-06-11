import type { QuestDifficulty } from "@/lib/types";

type BadgeTier = "low" | "normal" | "high" | "deadly";

const DIFFICULTY_TIER: Record<QuestDifficulty, BadgeTier> = {
  trivial: "low",
  easy: "low",
  normal: "normal",
  hard: "high",
  legendary: "deadly",
};

const TIER_LABELS: Record<BadgeTier, string> = {
  low: "Низкий риск",
  normal: "Обычный контракт",
  high: "Высокая угроза",
  deadly: "Смертельно",
};

const TIER_CLASS: Record<BadgeTier, string> = {
  low: "difficulty-badge-low",
  normal: "difficulty-badge-normal",
  high: "difficulty-badge-high",
  deadly: "difficulty-badge-deadly",
};

interface QuestDifficultyBadgeProps {
  difficulty: QuestDifficulty;
  showLabel?: boolean;
}

export function QuestDifficultyBadge({
  difficulty,
  showLabel = true,
}: QuestDifficultyBadgeProps) {
  const tier = DIFFICULTY_TIER[difficulty];
  const label = TIER_LABELS[tier];

  return (
    <span
      className={`difficulty-badge ${TIER_CLASS[tier]} shrink-0`}
      title={`Сложность: ${label}`}
      aria-label={`Сложность: ${label}`}
    >
      <span className="difficulty-badge-gem" aria-hidden />
      {showLabel && (
        <span className="difficulty-badge-label hidden sm:inline">{label}</span>
      )}
    </span>
  );
}
