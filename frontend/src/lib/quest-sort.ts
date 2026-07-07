import type { Quest, QuestDifficulty } from "@/lib/types";

export type QuestSortOption =
  | "created_desc"
  | "faction"
  | "difficulty"
  | "urgency";

export const QUEST_SORT_OPTIONS: {
  value: QuestSortOption;
  label: string;
}[] = [
  { value: "created_desc", label: "По дате (новые)" },
  { value: "faction", label: "По фракциям" },
  { value: "difficulty", label: "По сложности" },
  { value: "urgency", label: "По срочности" },
];

const DIFFICULTY_RANK: Record<QuestDifficulty, number> = {
  legendary: 0,
  hard: 1,
  normal: 2,
  easy: 3,
  trivial: 4,
};

function getUrgencyTimestamp(quest: Quest): number | null {
  const target = quest.deadline ?? quest.reminder_time;
  if (!target) {
    return null;
  }
  const ms = Date.parse(target);
  return Number.isNaN(ms) ? null : ms;
}

export function sortQuests(
  quests: Quest[],
  sortBy: QuestSortOption,
  factionNames: Map<number, string>,
): Quest[] {
  const sorted = [...quests];

  if (sortBy === "created_desc") {
    return sorted.sort(
      (a, b) =>
        Date.parse(b.created_at) - Date.parse(a.created_at) ||
        b.id - a.id,
    );
  }

  if (sortBy === "faction") {
    return sorted.sort((a, b) => {
      const nameA =
        a.faction_id != null
          ? (factionNames.get(a.faction_id) ?? "")
          : "яяяя";
      const nameB =
        b.faction_id != null
          ? (factionNames.get(b.faction_id) ?? "")
          : "яяяя";
      return (
        nameA.localeCompare(nameB, "ru") ||
        Date.parse(b.created_at) - Date.parse(a.created_at)
      );
    });
  }

  if (sortBy === "difficulty") {
    return sorted.sort(
      (a, b) =>
        DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] ||
        Date.parse(b.created_at) - Date.parse(a.created_at),
    );
  }

  return sorted.sort((a, b) => {
    const urgencyA = getUrgencyTimestamp(a);
    const urgencyB = getUrgencyTimestamp(b);
    if (urgencyA == null && urgencyB == null) {
      return Date.parse(b.created_at) - Date.parse(a.created_at);
    }
    if (urgencyA == null) {
      return 1;
    }
    if (urgencyB == null) {
      return -1;
    }
    return urgencyA - urgencyB || Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

export const QUEST_PAGE_SIZE = 20;

export function paginateQuests<T>(items: T[], page: number, pageSize = QUEST_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page: safePage,
    totalPages,
  };
}
