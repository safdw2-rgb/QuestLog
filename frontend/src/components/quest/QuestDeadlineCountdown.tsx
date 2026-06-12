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
  datetime: string;
  status: string;
  field?: "deadline" | "reminder";
  questType?: QuestType;
  compact?: boolean;
  editable?: boolean;
}

export function QuestDeadlineCountdown({
  datetime,
  status,
  field = "deadline",
  questType,
  compact = false,
  editable = false,
}: QuestDeadlineCountdownProps) {
  const isReminder =
    field === "reminder" || (field === "deadline" && questType === "daily");
  const now = useNow(compact ? 60_000 : 1000);
  const remainingMs = getDeadlineRemainingMs(datetime, now.getTime());
  const overdue = isDeadlineOverdue(datetime, status, now.getTime());
  const countdownText = formatCountdown(remainingMs, { compact });
  const label = overdue
    ? isReminder
      ? "Оповещение прошло"
      : "Просрочен"
    : isReminder
      ? `До будильника: ${countdownText}`
      : `Осталось: ${countdownText}`;
  const metaLabel = isReminder
    ? `Будильник в ${formatReminderTime(datetime)}`
    : formatDeadlineDateTime(datetime);

  if (compact) {
    const icon = isReminder ? "⚔️" : "⏳";
    return (
      <span
        className={`quest-deadline-compact ${editable ? "quest-deadline-editable" : ""} ${overdue ? "quest-deadline-overdue" : ""}`}
        title={metaLabel}
      >
        {overdue
          ? isReminder
            ? `${icon} Прошло`
            : "⏰ Просрочен"
          : `${icon} ${countdownText}`}
      </span>
    );
  }

  return (
    <div
      className={`quest-deadline-countdown ${editable ? "quest-deadline-editable" : ""} ${overdue ? "quest-deadline-overdue" : ""}`}
    >
      <p className="quest-deadline-countdown-label">
        {overdue
          ? isReminder
            ? "Оповещение прошло"
            : "Срок истёк"
          : isReminder
            ? "До будильника"
            : "До дедлайна"}
      </p>
      <p className="quest-deadline-countdown-value">{label}</p>
      <p className="quest-deadline-countdown-meta">{metaLabel}</p>
    </div>
  );
}
