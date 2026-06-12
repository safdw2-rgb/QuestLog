import type { QuestScheduleUpdatePayload } from "@/lib/api";
import type { Faction, Quest } from "@/lib/types";
import { getSubquests } from "@/lib/quest-utils";
import { EMPTY_TAB_MESSAGE } from "@/lib/quest-tabs";
import { QuestCard } from "@/components/quest/QuestCard";

interface QuestListProps {
  quests: Quest[];
  allQuests?: Quest[];
  factions?: Faction[];
  emptyMessage?: string;
  showActions?: boolean;
  isDailyTab?: boolean;
  updatingQuestId?: number | null;
  onComplete?: (questId: number) => Promise<void>;
  onFail?: (questId: number, failReason: string) => Promise<void>;
  onAddSubquest?: (parentQuestId: number, title: string) => Promise<void>;
  onToggleSubquest?: (subquestId: number) => Promise<void>;
  onUpdateSchedule?: (
    questId: number,
    payload: QuestScheduleUpdatePayload,
  ) => Promise<void>;
  onBargain?: (questId: number) => Promise<string | null>;
  onRetireDaily?: (questId: number) => Promise<void>;
  onShowOnMap?: (quest: Quest) => void;
  onEdit?: (quest: Quest) => void;
  adventurerGold?: number;
  focusQuestId?: number | null;
  onFocusConsumed?: () => void;
}

export function QuestList({
  quests,
  allQuests,
  factions = [],
  emptyMessage = EMPTY_TAB_MESSAGE,
  showActions = false,
  isDailyTab = false,
  updatingQuestId = null,
  onComplete,
  onFail,
  onAddSubquest,
  onToggleSubquest,
  onUpdateSchedule,
  onBargain,
  onRetireDaily,
  onShowOnMap,
  onEdit,
  adventurerGold = 0,
  focusQuestId = null,
  onFocusConsumed,
}: QuestListProps) {
  const questPool = allQuests ?? quests;
  if (quests.length === 0) {
    return (
      <div className="journal-panel border-dashed border-ink/15 p-10 text-center">
        <p className="font-display text-lg leading-relaxed text-ink-muted">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {quests.map((quest) => (
        <li key={quest.id}>
          <QuestCard
            quest={quest}
            isDailyTab={isDailyTab}
            subquests={getSubquests(questPool, quest.id)}
            isUpdating={updatingQuestId === quest.id}
            updatingSubquestId={updatingQuestId}
            onComplete={showActions ? onComplete : undefined}
            onFail={showActions && !isDailyTab ? onFail : undefined}
            onAddSubquest={
              showActions && onAddSubquest
                ? (title) => onAddSubquest(quest.id, title)
                : undefined
            }
            onToggleSubquest={showActions ? onToggleSubquest : undefined}
            onUpdateSchedule={showActions ? onUpdateSchedule : undefined}
            onBargain={showActions ? onBargain : undefined}
            onRetireDaily={
              showActions && isDailyTab ? onRetireDaily : undefined
            }
            onShowOnMap={onShowOnMap}
            onEdit={showActions ? onEdit : undefined}
            faction={
              factions.find((faction) => faction.id === quest.faction_id) ??
              null
            }
            adventurerGold={adventurerGold}
            focus={focusQuestId === quest.id}
            onFocused={focusQuestId === quest.id ? onFocusConsumed : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
