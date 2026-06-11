"use client";

import {
  QUEST_JOURNAL_TABS,
  countQuestsByTab,
  type QuestJournalTab,
} from "@/lib/quest-tabs";
import type { Quest } from "@/lib/types";

interface QuestJournalTabsProps {
  activeTab: QuestJournalTab;
  quests: Quest[];
  onTabChange: (tab: QuestJournalTab) => void;
}

export function QuestJournalTabs({
  activeTab,
  quests,
  onTabChange,
}: QuestJournalTabsProps) {
  return (
    <nav
      className="journal-tabs mb-5"
      role="tablist"
      aria-label="Разделы квестового дневника"
    >
      {QUEST_JOURNAL_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = countQuestsByTab(quests, tab.id);

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`journal-tab ${isActive ? "journal-tab-active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="journal-tab-marker" aria-hidden>
              {tab.marker}
            </span>
            <span>{tab.label}</span>
            <span className="journal-tab-count">{count}</span>
          </button>
        );
      })}
    </nav>
  );
}
