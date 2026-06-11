const MS_MINUTE = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;

export function localDatetimeToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

/** Ежедневное оповещение: сегодняшняя дата + время HH:MM (локально). */
export function dailyTimeToIso(time: string): string | null {
  const trimmed = time.trim();
  if (!trimmed) {
    return null;
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }

  const now = new Date();
  const reminder = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
    0,
  );

  return reminder.toISOString();
}

export function isoToDatetimeLocal(deadline: string): string {
  const date = new Date(deadline);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isoToDailyTime(deadline: string): string {
  const date = new Date(deadline);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getDeadlineRemainingMs(deadline: string, now = Date.now()): number {
  return new Date(deadline).getTime() - now;
}

export function isDeadlineOverdue(
  deadline: string,
  status: string,
  now = Date.now(),
): boolean {
  return status === "active" && getDeadlineRemainingMs(deadline, now) <= 0;
}

export interface FormatCountdownOptions {
  compact?: boolean;
}

export function formatCountdown(
  remainingMs: number,
  options: FormatCountdownOptions = {},
): string {
  const { compact = false } = options;

  if (remainingMs <= 0) {
    return "Просрочен";
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (compact) {
    if (remainingMs < MS_MINUTE) {
      return "меньше минуты";
    }
    if (remainingMs < MS_HOUR) {
      return `${minutes}м`;
    }
    if (remainingMs < MS_DAY) {
      return `${hours}ч`;
    }
    return `${days}д ${hours}ч`;
  }

  if (days > 0) {
    return `${days}д ${String(hours).padStart(2, "0")}ч ${String(minutes).padStart(2, "0")}м`;
  }

  if (hours > 0) {
    return `${hours}ч ${String(minutes).padStart(2, "0")}м ${String(seconds).padStart(2, "0")}с`;
  }

  if (minutes > 0) {
    return `${minutes}м ${String(seconds).padStart(2, "0")}с`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDeadlineDateTime(deadline: string): string {
  return new Date(deadline).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatReminderTime(deadline: string): string {
  return new Date(deadline).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
