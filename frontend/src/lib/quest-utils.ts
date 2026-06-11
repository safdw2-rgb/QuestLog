import type { Quest } from "@/lib/types";

export function isRootQuest(quest: Quest): boolean {
  return quest.parent_quest_id == null;
}

export function getSubquests(quests: Quest[], parentQuestId: number): Quest[] {
  return quests
    .filter((q) => q.parent_quest_id === parentQuestId)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export function hasIncompleteSubquests(
  quests: Quest[],
  parentQuestId: number,
): boolean {
  return getSubquests(quests, parentQuestId).some((q) => q.status === "active");
}
