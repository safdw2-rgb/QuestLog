import type { Quest } from "@/lib/types";
import { isRootQuest } from "@/lib/quest-utils";

export type QuestJournalTab =
  | "all"
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
  { id: "all", label: "Все", marker: "✧" },
  { id: "main", label: "Основные", marker: "◆" },
  { id: "side", label: "Побочные", marker: "◇" },
  { id: "daily", label: "Ежедневные", marker: "◆" },
  { id: "completed", label: "Завершённые", marker: "✦" },
  { id: "failed", label: "Проваленные", marker: "☠" },
];

export const EMPTY_ALL_TAB_MESSAGE =
  "Активных квестов пока нет. Создайте новое задание в любом разделе!";

export const EMPTY_TAB_MESSAGE =
  'В этой секции дневника пока пусто. Нажмите "+ Добавить квест", чтобы начать новое приключение!';

export const EMPTY_DAILY_TAB_MESSAGE =
  "Ежедневных заданий пока нет. Создайте квест с типом «Ежедневное» — он будет сбрасываться каждую полночь.";

export function filterQuestsByTab(
  quests: Quest[],
  tab: QuestJournalTab,
): Quest[] {
  switch (tab) {
    case "all":
      return quests.filter((q) => isRootQuest(q) && q.status === "active");
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

export function getTabForQuest(quest: Quest): QuestJournalTab {
  if (quest.status === "active") {
    return "all";
  }
  if (quest.status === "completed" && quest.quest_type !== "daily") {
    return "completed";
  }
  if (quest.status === "failed" && quest.quest_type !== "daily") {
    return "failed";
  }
  if (quest.quest_type === "daily") {
    return "daily";
  }
  if (quest.quest_type === "main") {
    return "main";
  }
  return "side";
}

export function countQuestsByTab(
  quests: Quest[],
  tab: QuestJournalTab,
): number {
  return filterQuestsByTab(quests, tab).length;
}
