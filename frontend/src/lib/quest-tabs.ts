import type { Quest } from "@/lib/types";
import { isRootQuest } from "@/lib/quest-utils";

export type QuestJournalTab =
  | "main"
  | "side"
  | "daily"
  | "completed"
  | "failed";

export const QUEST_JOURNAL_TABS: {
  id: QuestJournalTab;
  label: string;
  marker: string;
}[] = [
  { id: "main", label: "Основные", marker: "◆" },
  { id: "side", label: "Побочные", marker: "◇" },
  { id: "daily", label: "Ежедневные", marker: "◆" },
  { id: "completed", label: "Завершённые", marker: "✦" },
  { id: "failed", label: "Проваленные", marker: "☠" },
];

export const EMPTY_TAB_MESSAGE =
  'В этой секции дневника пока пусто. Нажмите "+ Добавить квест", чтобы начать новое приключение!';

export const EMPTY_DAILY_TAB_MESSAGE =
  "Ежедневных заданий пока нет. Создайте квест с типом «Ежедневное» — он будет сбрасываться каждую полночь.";

export function filterQuestsByTab(
  quests: Quest[],
  tab: QuestJournalTab,
): Quest[] {
  switch (tab) {
    case "main":
      return quests.filter(
        (q) =>
          isRootQuest(q) && q.status === "active" && q.quest_type === "main",
      );
    case "side":
      return quests.filter(
        (q) =>
          isRootQuest(q) && q.status === "active" && q.quest_type === "side",
      );
    case "daily":
      return quests.filter(
        (q) =>
          isRootQuest(q) &&
          q.quest_type === "daily" &&
          (q.status === "active" || q.status === "completed"),
      );
    case "completed":
      return quests.filter(
        (q) =>
          isRootQuest(q) &&
          q.status === "completed" &&
          q.quest_type !== "daily",
      );
    case "failed":
      return quests.filter(
        (q) =>
          isRootQuest(q) && q.status === "failed" && q.quest_type !== "daily",
      );
    default:
      return quests;
  }
}

export function countQuestsByTab(
  quests: Quest[],
  tab: QuestJournalTab,
): number {
  return filterQuestsByTab(quests, tab).length;
}
