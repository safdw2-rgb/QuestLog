"use client";

import React, { useEffect, useMemo, useState } from "react";

import type { QuestScheduleUpdatePayload } from "@/lib/api";
import {
  DATE_FILTER_LABELS,
  filterQuestsByDateFilter,
  type DateFilter,
} from "@/lib/quest-date-filters";
import type { Faction, MentorStudent, Quest } from "@/lib/types";
import {
  EMPTY_ALL_TAB_MESSAGE,
  EMPTY_DAILY_TAB_MESSAGE,
  filterQuestsByTab,
  getTabForQuest,
  type QuestJournalTab,
} from "@/lib/quest-tabs";
import { JournalSectionTitle } from "@/components/layout/JournalSectionTitle";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { QuestCreateModal } from "@/components/quest/QuestCreateModal";
import { QuestEditModal } from "@/components/quest/QuestEditModal";
import { QuestJournalTabs } from "@/components/quest/QuestJournalTabs";
import { QuestList } from "@/components/quest/QuestList";
import { QuestPagination } from "@/components/quest/QuestPagination";
import {
  paginateQuests,
  QUEST_PAGE_SIZE,
  QUEST_SORT_OPTIONS,
  sortQuests,
  type QuestSortOption,
} from "@/lib/quest-sort";

interface QuestJournalProps {
  quests: Quest[];
  factions: Faction[];
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
  currentUserId?: number;
  mentorStudents?: MentorStudent[];
  focusQuestId?: number | null;
  onFocusConsumed?: () => void;
  title?: string;
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
  currentUserId,
  mentorStudents = [],
  focusQuestId = null,
  onFocusConsumed,
  onAdventurerUpdate,
  onQuestUpdated,
  title = "Журнал заданий",
}: QuestJournalProps) {
  const [activeTab, setActiveTab] = useState<QuestJournalTab>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<QuestSortOption>("created_desc");
  const [page, setPage] = useState(1);

  const factionNames = useMemo(
    () => new Map(factions.map((faction) => [faction.id, faction.name])),
    [factions],
  );

  const filteredQuests = useMemo(() => {
    const byTab = filterQuestsByTab(quests, activeTab);
    const byDate = filterQuestsByDateFilter(byTab, dateFilter);
    return sortQuests(byDate, sortBy, factionNames);
  }, [quests, activeTab, dateFilter, sortBy, factionNames]);

  const pagination = useMemo(
    () => paginateQuests(filteredQuests, page, QUEST_PAGE_SIZE),
    [filteredQuests, page],
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab, dateFilter, sortBy]);

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
    <div className="quest-journal-root flex min-h-0 w-full min-w-0 flex-1 flex-col box-border">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <JournalSectionTitle>{title}</JournalSectionTitle>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rpg-game-button"
            onClick={() => setModalOpen(true)}
          >
            + Добавить квест
          </button>
          <ThemeSwitcher />
          <button
            type="button"
            className="active:scale-95 transition-transform border-0 bg-transparent p-0 cursor-pointer"
            onClick={() => onEditModeChange(!editMode)}
            aria-pressed={editMode}
            title={editMode ? "Выключить режим редактирования" : "Включить режим редактирования"}
          >
            <img
              src={editMode
                ? "/rpg-ui/Controls/UI_Toggle2_On.png"
                : "/rpg-ui/Controls/UI_Toggle2_Off.png"
              }
              alt={editMode ? "Редактирование включено" : "Редактирование выключено"}
              className="h-8 w-auto object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </button>
        </div>
      </div>

      {/* Scroll hint: fade on right edge shows there are more tabs to swipe */}
      <div className="relative shrink-0">
        <QuestJournalTabs
          activeTab={activeTab}
          quests={quests}
          onTabChange={setActiveTab}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 md:hidden"
          style={{ background: 'linear-gradient(to left, #f0e6c8 0%, transparent 100%)' }}
          aria-hidden
        />
      </div>

      <div className="rpg-filter-nav mb-5 flex shrink-0 flex-row flex-nowrap overflow-x-auto items-center gap-x-5 gap-y-2 pb-1 md:flex-wrap" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {(["today", "tomorrow", "future"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            className={`rpg-text-link ${
              dateFilter === filter ? "rpg-text-link-active" : ""
            }`}
            onClick={() => toggleDateFilter(filter)}
          >
            {DATE_FILTER_LABELS[filter]}
          </button>
        ))}

        <label className="journal-sort-select-wrap ml-auto flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-ink-muted">
            Сортировка
          </span>
          <select
            className="journal-sort-select"
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as QuestSortOption)
            }
            aria-label="Сортировка квестов"
          >
            {QUEST_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {refreshing && (
        <p className="mb-3 shrink-0 text-xs text-ink-muted">Обновляем список...</p>
      )}

      <div className="quest-journal-list-scroll rpg-fantasy-vscroll min-h-0 flex-1 overflow-y-auto">
        <QuestList
          quests={pagination.items}
          allQuests={quests}
          factions={factions}
          showActions={showActions}
          isDailyTab={activeTab === "daily"}
          isFailedTab={activeTab === "failed"}
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
          currentUserId={currentUserId}
          focusQuestId={focusQuestId}
          onFocusConsumed={onFocusConsumed}
        />

        {filteredQuests.length > QUEST_PAGE_SIZE && (
          <QuestPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      <QuestCreateModal
        open={modalOpen}
        factions={factions}
        students={mentorStudents}
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
    </div>
  );
}
