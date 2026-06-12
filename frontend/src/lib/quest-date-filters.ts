import { isRootQuest } from "@/lib/quest-utils";
import type { Quest } from "@/lib/types";

export type DateFilter = "today" | "tomorrow" | "future";

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toDateKeyFromIso(iso: string): string {
  return toDateKey(new Date(iso));
}

export function todayDateKey(): string {
  return toDateKey(new Date());
}

export function tomorrowDateKey(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toDateKey(date);
}

function startOfDayAfterTomorrow(): number {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function questScheduleDates(quest: Quest): string[] {
  const keys: string[] = [];
  if (quest.deadline) {
    keys.push(toDateKeyFromIso(quest.deadline));
  }
  if (quest.reminder_time) {
    keys.push(toDateKeyFromIso(quest.reminder_time));
  }
  return keys;
}

function questScheduleInstants(quest: Quest): number[] {
  const instants: number[] = [];
  if (quest.deadline) {
    instants.push(new Date(quest.deadline).getTime());
  }
  if (quest.reminder_time) {
    instants.push(new Date(quest.reminder_time).getTime());
  }
  return instants;
}

export function questMatchesDateFilter(
  quest: Quest,
  filter: DateFilter,
): boolean {
  if (!isRootQuest(quest) || quest.quest_type === "daily") {
    return false;
  }

  const scheduleDates = questScheduleDates(quest);
  const scheduleInstants = questScheduleInstants(quest);

  if (scheduleDates.length === 0 && scheduleInstants.length === 0) {
    return false;
  }

  if (filter === "today") {
    const today = todayDateKey();
    return scheduleDates.includes(today);
  }

  if (filter === "tomorrow") {
    const tomorrow = tomorrowDateKey();
    return scheduleDates.includes(tomorrow);
  }

  const afterTomorrow = startOfDayAfterTomorrow();
  return scheduleInstants.some((instant) => instant >= afterTomorrow);
}

export function filterQuestsByDateFilter(
  quests: Quest[],
  filter: DateFilter | null,
): Quest[] {
  if (!filter) {
    return quests;
  }
  return quests.filter((quest) => questMatchesDateFilter(quest, filter));
}

export const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today: "Сегодня",
  tomorrow: "Завтра",
  future: "Дальнейшие планы",
};
