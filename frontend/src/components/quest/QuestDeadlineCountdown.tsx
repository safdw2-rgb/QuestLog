"use client";

import { useNow } from "@/hooks/useNow";
import {
  formatCountdown,
  formatDeadlineDateTime,
  formatReminderTime,
  getDeadlineRemainingMs,
  isDeadlineOverdue,
} from "@/lib/deadline";
import type { QuestType } from "@/lib/types";

interface QuestDeadlineCountdownProps {
  deadline: string;
  status: string;
  questType?: QuestType;
  compact?: boolean;
  editable?: boolean;
}

export function QuestDeadlineCountdown({
  deadline,
  status,
  questType,
  compact = false,
  editable = false,
}: QuestDeadlineCountdownProps) {
  const isDailyReminder = questType === "daily";
  const now = useNow(compact ? 60_000 : 1000);
  const remainingMs = getDeadlineRemainingMs(deadline, now.getTime());
  const overdue = isDeadlineOverdue(deadline, status, now.getTime());
  const countdownText = formatCountdown(remainingMs, { compact });
  const label = overdue
    ? isDailyReminder
      ? "Оповещение прошло"
      : "Просрочен"
    : isDailyReminder
      ? `До оповещения: ${countdownText}`
      : `Осталось: ${countdownText}`;
  const metaLabel = isDailyReminder
    ? `Оповещение в ${formatReminderTime(deadline)}`
    : formatDeadlineDateTime(deadline);

  if (compact) {
    return (
      <span
        className={`quest-deadline-compact ${editable ? "quest-deadline-editable" : ""} ${overdue ? "quest-deadline-overdue" : ""}`}
        title={metaLabel}
      >
        {overdue ? "⏰ Просрочен" : `⏳ ${countdownText}`}
      </span>
    );
  }

  return (
    <div
      className={`quest-deadline-countdown ${editable ? "quest-deadline-editable" : ""} ${overdue ? "quest-deadline-overdue" : ""}`}
    >
      <p className="quest-deadline-countdown-label">
        {overdue
          ? isDailyReminder
            ? "Оповещение прошло"
            : "Срок истёк"
          : isDailyReminder
            ? "До оповещения"
            : "До дедлайна"}
      </p>
      <p className="quest-deadline-countdown-value">{label}</p>
      <p className="quest-deadline-countdown-meta">{metaLabel}</p>
    </div>
  );
}
