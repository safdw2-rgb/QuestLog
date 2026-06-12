import type { QuestDifficulty } from "@/lib/types";
import {
  formatDifficultyLabel,
  formatDifficultySwords,
  getDifficultyLevel,
} from "@/lib/difficulty";

const TIER_CLASS = {
  errand: "difficulty-badge-errand",
  adventure: "difficulty-badge-adventure",
  trial: "difficulty-badge-trial",
  legendary: "difficulty-badge-legendary",
} as const;

interface QuestDifficultyBadgeProps {
  difficulty: QuestDifficulty;
  showLabel?: boolean;
}

export function QuestDifficultyBadge({
  difficulty,
  showLabel = true,
}: QuestDifficultyBadgeProps) {
  const level = getDifficultyLevel(difficulty);

  return (
    <span
      className={`difficulty-badge ${TIER_CLASS[level.tier]} max-w-[9.5rem] shrink-0 sm:max-w-none`}
      title={formatDifficultyLabel(difficulty)}
      aria-label={`Сложность: ${formatDifficultyLabel(difficulty)}`}
    >
      <span className="difficulty-badge-swords" aria-hidden>
        {formatDifficultySwords(level.swords)}
      </span>
      {showLabel && (
        <span className="difficulty-badge-label hidden truncate sm:inline">
          {level.shortLabel}
        </span>
      )}
    </span>
  );
}
