"use client";

import { useEffect, useMemo, useState } from "react";

import type { QuestScheduleUpdatePayload } from "@/lib/api";
import {
  DATE_FILTER_LABELS,
  filterQuestsByDateFilter,
  type DateFilter,
} from "@/lib/quest-date-filters";
import type { Faction, Quest } from "@/lib/types";
import {
  EMPTY_ALL_TAB_MESSAGE,
  EMPTY_DAILY_TAB_MESSAGE,
  filterQuestsByTab,
  getTabForQuest,
  type QuestJournalTab,
} from "@/lib/quest-tabs";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { QuestCreateModal } from "@/components/quest/QuestCreateModal";
import { QuestEditModal } from "@/components/quest/QuestEditModal";
import { QuestJournalTabs } from "@/components/quest/QuestJournalTabs";
import { QuestList } from "@/components/quest/QuestList";

interface QuestJournalProps {
  quests: Quest[];
  factions: Faction[];
  adventurerId?: number;
  updatingQuestId?: number | null;
  dateFilter: DateFilter | null;
  onDateFilterChange: (filter: DateFilter | null) => void;
  editMode: boolean;
  onEditModeChange: (enabled: boolean) => void;
  onAdventurerUpdate?: (adventurer: import("@/lib/types").Adventurer) => void;
  onQuestUpdated?: (quest: Quest) => void;
  onRefreshQuests: () => Promise<void>;
  onComplete: (questId: number) => Promise<void>;
  onFail: (questId: number, failReason: string) => Promise<void>;
  onAddSubquest?: (parentQuestId: number, title: string) => Promise<void>;
  onToggleSubquest?: (subquestId: number) => Promise<void>;
  onUpdateSchedule?: (
    questId: number,
    payload: QuestScheduleUpdatePayload,
  ) => Promise<void>;
  onBargain?: (questId: number) => Promise<string | null>;
  onRetireDaily?: (questId: number) => Promise<void>;
  onShowOnMap?: (quest: Quest) => void;
  adventurerGold?: number;
  focusQuestId?: number | null;
  onFocusConsumed?: () => void;
}

export function QuestJournal({
  quests,
  factions,
  updatingQuestId = null,
  dateFilter,
  onDateFilterChange,
  editMode,
  onEditModeChange,
  onRefreshQuests,
  onComplete,
  onFail,
  onAddSubquest,
  onToggleSubquest,
  onUpdateSchedule,
  onBargain,
  onRetireDaily,
  onShowOnMap,
  adventurerGold = 0,
  focusQuestId = null,
  onFocusConsumed,
  onAdventurerUpdate,
  onQuestUpdated,
}: QuestJournalProps) {
  const [activeTab, setActiveTab] = useState<QuestJournalTab>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filteredQuests = useMemo(() => {
    const byTab = filterQuestsByTab(quests, activeTab);
    return filterQuestsByDateFilter(byTab, dateFilter);
  }, [quests, activeTab, dateFilter]);

  useEffect(() => {
    if (focusQuestId == null) {
      return;
    }

    const quest = quests.find((item) => item.id === focusQuestId);
    if (quest) {
      setActiveTab(getTabForQuest(quest));
    }
  }, [focusQuestId, quests]);

  const showActions =
    activeTab === "all" ||
    activeTab === "main" ||
    activeTab === "side" ||
    activeTab === "daily";

  const emptyMessage =
    activeTab === "daily"
      ? EMPTY_DAILY_TAB_MESSAGE
      : activeTab === "all"
        ? dateFilter
          ? `Нет квестов для фильтра «${DATE_FILTER_LABELS[dateFilter]}».`
          : EMPTY_ALL_TAB_MESSAGE
        : dateFilter
          ? `В этой вкладке ничего нет для «${DATE_FILTER_LABELS[dateFilter]}».`
          : undefined;

  async function handleQuestCreated() {
    setRefreshing(true);
    try {
      await onRefreshQuests();
    } finally {
      setRefreshing(false);
    }
  }

  function toggleDateFilter(next: DateFilter) {
    onDateFilterChange(dateFilter === next ? null : next);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">Журнал заданий</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="journal-button-primary"
            onClick={() => setModalOpen(true)}
          >
            + Добавить квест
          </button>
          <button
            type="button"
            className={`edit-mode-toggle ${editMode ? "edit-mode-toggle-active" : ""}`}
            onClick={() => onEditModeChange(!editMode)}
            aria-pressed={editMode}
            title="Режим редактирования"
          >
            <span aria-hidden>⚙️</span>
            <span className="sr-only">Режим редактирования</span>
          </button>
          <ThemeSwitcher />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <QuestJournalTabs
          activeTab={activeTab}
          quests={quests}
          onTabChange={setActiveTab}
        />
        {(["today", "tomorrow", "future"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className={`journal-today-button ${
              dateFilter === filter ? "journal-today-button-active" : ""
            }`}
            onClick={() => toggleDateFilter(filter)}
          >
            {DATE_FILTER_LABELS[filter]}
          </button>
        ))}
      </div>

      {refreshing && (
        <p className="mb-3 text-xs text-ink-muted">Обновляем список...</p>
      )}

      <QuestList
        quests={filteredQuests}
        allQuests={quests}
        factions={factions}
        showActions={showActions}
        isDailyTab={activeTab === "daily"}
        emptyMessage={emptyMessage}
        updatingQuestId={updatingQuestId}
        onComplete={onComplete}
        onFail={onFail}
        onAddSubquest={onAddSubquest}
        onToggleSubquest={onToggleSubquest}
        onUpdateSchedule={onUpdateSchedule}
        onBargain={onBargain}
        onRetireDaily={onRetireDaily}
        onShowOnMap={onShowOnMap}
        onEdit={editMode ? setEditingQuest : undefined}
        adventurerGold={adventurerGold}
        focusQuestId={focusQuestId}
        onFocusConsumed={onFocusConsumed}
      />

      <QuestCreateModal
        open={modalOpen}
        factions={factions}
        onClose={() => setModalOpen(false)}
        onCreated={handleQuestCreated}
      />

      <QuestEditModal
        open={editingQuest != null}
        quest={editingQuest}
        factions={factions}
        adventurerGold={adventurerGold}
        onClose={() => setEditingQuest(null)}
        onUpdated={(result) => {
          setEditingQuest(null);
          onQuestUpdated?.(result.quest);
          onAdventurerUpdate?.(result.adventurer);
        }}
      />
    </>
  );
}
