"use client";

import { useMemo, useState } from "react";

import type { Quest } from "@/lib/types";
import {
  EMPTY_DAILY_TAB_MESSAGE,
  filterQuestsByTab,
  type QuestJournalTab,
} from "@/lib/quest-tabs";
import { QuestCreateModal } from "@/components/quest/QuestCreateModal";
import { QuestJournalTabs } from "@/components/quest/QuestJournalTabs";
import { QuestList } from "@/components/quest/QuestList";

interface QuestJournalProps {
  quests: Quest[];
  adventurerId?: number;
  updatingQuestId?: number | null;
  onRefreshQuests: () => Promise<void>;
  onComplete: (questId: number) => Promise<void>;
  onFail: (questId: number, failReason: string) => Promise<void>;
  onAddSubquest?: (parentQuestId: number, title: string) => Promise<void>;
  onToggleSubquest?: (subquestId: number) => Promise<void>;
  onUpdateDeadline?: (questId: number, deadline: string | null) => Promise<void>;
  adventurerGold?: number;
}

export function QuestJournal({
  quests,
  updatingQuestId = null,
  onRefreshQuests,
  onComplete,
  onFail,
  onAddSubquest,
  onToggleSubquest,
  onUpdateDeadline,
  adventurerGold = 0,
}: QuestJournalProps) {
  const [activeTab, setActiveTab] = useState<QuestJournalTab>("main");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filteredQuests = useMemo(
    () => filterQuestsByTab(quests, activeTab),
    [quests, activeTab],
  );

  const showActions =
    activeTab === "main" || activeTab === "side" || activeTab === "daily";

  async function handleQuestCreated() {
    setRefreshing(true);
    try {
      await onRefreshQuests();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">Журнал заданий</h2>
        <button
          type="button"
          className="journal-button-primary"
          onClick={() => setModalOpen(true)}
        >
          + Добавить квест
        </button>
      </div>

      <QuestJournalTabs
        activeTab={activeTab}
        quests={quests}
        onTabChange={setActiveTab}
      />

      {refreshing && (
        <p className="mb-3 text-xs text-ink-muted">Обновляем список...</p>
      )}

      <QuestList
        quests={filteredQuests}
        allQuests={quests}
        showActions={showActions}
        isDailyTab={activeTab === "daily"}
        emptyMessage={
          activeTab === "daily" ? EMPTY_DAILY_TAB_MESSAGE : undefined
        }
        updatingQuestId={updatingQuestId}
        onComplete={onComplete}
        onFail={onFail}
        onAddSubquest={onAddSubquest}
        onToggleSubquest={onToggleSubquest}
        onUpdateDeadline={onUpdateDeadline}
        adventurerGold={adventurerGold}
      />

      <QuestCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleQuestCreated}
      />
    </>
  );
}
