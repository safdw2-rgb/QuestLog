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
      className="rpg-game-tab-nav mb-4 flex flex-row flex-nowrap overflow-x-auto md:flex-wrap"
      style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
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
            className={`rpg-game-tab rpg-game-tab-sm ${isActive ? "rpg-game-tab-active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span aria-hidden>{tab.marker}</span>
            <span>{tab.label}</span>
            <span className="rpg-text-link-count"> {count}</span>
          </button>
        );
      })}
    </nav>
  );
}
