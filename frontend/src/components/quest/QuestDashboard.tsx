"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import { MapTabIcon } from "@/components/icons/MapTabIcon";
import { HeroPanel } from "@/components/adventurer/HeroPanel";
import { RewardShop } from "@/components/rewards/RewardShop";
import {
  bargainQuestReward,
  createSubquest,
  getAdventurer,
  getFactions,
  getQuests,
  retireDailyQuest,
  updateQuestSchedule,
  type QuestScheduleUpdatePayload,
  updateQuestStatus,
} from "@/lib/api";
import type { DateFilter } from "@/lib/quest-date-filters";
import { getSubquests } from "@/lib/quest-utils";
import type { Adventurer, Faction, Quest } from "@/lib/types";
import { QuestJournal } from "@/components/quest/QuestJournal";

const WorldMap = dynamic(
  () =>
    import("@/components/map/WorldMap").then((module) => module.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div className="journal-panel p-10 text-center text-ink-muted">
        Загружаем карту мира...
      </div>
    ),
  },
);

type DashboardView = "journal" | "shop" | "map";

interface QuestDashboardProps {
  initialAdventurer: Adventurer;
  initialQuests: Quest[];
  initialFactions: Faction[];
  adventurerId?: number;
}

export function QuestDashboard({
  initialAdventurer,
  initialQuests,
  initialFactions,
  adventurerId = 1,
}: QuestDashboardProps) {
  const [adventurer, setAdventurer] = useState(initialAdventurer);
  const [quests, setQuests] = useState(initialQuests);
  const [factions, setFactions] = useState(initialFactions);
  const [view, setView] = useState<DashboardView>("journal");
  const [updatingQuestId, setUpdatingQuestId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [focusQuestId, setFocusQuestId] = useState<number | null>(null);
  const [mapFocusQuestId, setMapFocusQuestId] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter | null>(null);
  const [editMode, setEditMode] = useState(false);

  const refreshAdventurer = useCallback(async () => {
    const updated = await getAdventurer(adventurerId);
    setAdventurer(updated);
  }, [adventurerId]);

  const refreshQuests = useCallback(async () => {
    const updated = await getQuests({ adventurer_id: adventurerId });
    setQuests(updated);
  }, [adventurerId]);

  const refreshFactions = useCallback(async () => {
    const updated = await getFactions();
    setFactions(updated);
  }, []);

  async function handleComplete(questId: number) {
    setActionError(null);

    const subquests = getSubquests(quests, questId);
    const incomplete = subquests.filter((q) => q.status === "active");
    if (incomplete.length > 0) {
      setActionError(
        `Сначала выполните все этапы задания (осталось ${incomplete.length})`,
      );
      return;
    }

    setUpdatingQuestId(questId);
    try {
      const updated = await updateQuestStatus(questId, { status: "completed" });
      setQuests((prev) =>
        prev.map((quest) => (quest.id === questId ? updated : quest)),
      );
      await Promise.all([refreshAdventurer(), refreshFactions()]);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Не удалось завершить квест",
      );
    } finally {
      setUpdatingQuestId(null);
    }
  }

  async function handleAddSubquest(parentQuestId: number, title: string) {
    setActionError(null);
    setUpdatingQuestId(parentQuestId);
    try {
      const created = await createSubquest(parentQuestId, title, adventurerId);
      setQuests((prev) => [...prev, created]);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Не удалось добавить этап";
      setActionError(message);
      throw e;
    } finally {
      setUpdatingQuestId(null);
    }
  }

  async function handleToggleSubquest(subquestId: number) {
    setActionError(null);
    const subquest = quests.find((q) => q.id === subquestId);
    if (
      !subquest ||
      (subquest.status !== "active" && subquest.status !== "completed")
    ) {
      return;
    }

    const nextStatus =
      subquest.status === "completed" ? "active" : "completed";
    setUpdatingQuestId(subquestId);
    try {
      const updated = await updateQuestStatus(subquestId, {
        status: nextStatus,
      });
      setQuests((prev) =>
        prev.map((quest) => (quest.id === subquestId ? updated : quest)),
      );
      if (nextStatus === "completed") {
        await refreshAdventurer();
      }
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Не удалось обновить этап",
      );
    } finally {
      setUpdatingQuestId(null);
    }
  }

  async function handleUpdateSchedule(
    questId: number,
    payload: QuestScheduleUpdatePayload,
  ) {
    setActionError(null);
    setUpdatingQuestId(questId);
    try {
      const result = await updateQuestSchedule(questId, payload);
      setQuests((prev) =>
        prev.map((quest) => (quest.id === questId ? result.quest : quest)),
      );
      setAdventurer(result.adventurer);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Не удалось обновить время";
      setActionError(message);
      throw e;
    } finally {
      setUpdatingQuestId(null);
    }
  }

  async function handleBargain(questId: number): Promise<string | null> {
    setActionError(null);
    setUpdatingQuestId(questId);
    try {
      const result = await bargainQuestReward(questId);
      setQuests((prev) =>
        prev.map((quest) => (quest.id === questId ? result.quest : quest)),
      );
      setAdventurer(result.adventurer);
      return `${result.message} (бросок d20: ${result.roll})`;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Не удалось провести торги";
      setActionError(message);
      throw e;
    } finally {
      setUpdatingQuestId(null);
    }
  }

  async function handleFail(questId: number, failReason: string) {
    setActionError(null);
    setUpdatingQuestId(questId);
    try {
      const updated = await updateQuestStatus(questId, {
        status: "failed",
        fail_reason: failReason,
      });
      setQuests((prev) =>
        prev.map((quest) => (quest.id === questId ? updated : quest)),
      );
      await Promise.all([refreshAdventurer(), refreshFactions()]);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Не удалось провалить квест",
      );
    } finally {
      setUpdatingQuestId(null);
    }
  }

  async function handleRetireDaily(questId: number) {
    setActionError(null);
    setUpdatingQuestId(questId);
    try {
      const updated = await retireDailyQuest(questId);
      setQuests((prev) =>
        prev.map((quest) => (quest.id === questId ? updated : quest)),
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Не удалось убрать дейлик";
      setActionError(message);
      throw e;
    } finally {
      setUpdatingQuestId(null);
    }
  }

  function handleNavigateToQuest(quest: Quest) {
    setView("journal");
    setFocusQuestId(quest.id);
  }

  function handleShowQuestOnMap(quest: Quest) {
    setView("map");
    setMapFocusQuestId(quest.id);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(260px,300px)_1fr] lg:gap-8">
      <div className="flex flex-col gap-4">
        <nav
          className="dashboard-view-switch journal-panel flex gap-1 p-1"
          aria-label="Разделы дневника"
        >
          <button
            type="button"
            className={`dashboard-view-button flex-1 ${
              view === "journal" ? "dashboard-view-button-active" : ""
            }`}
            onClick={() => setView("journal")}
          >
            <span className="dashboard-view-icon" aria-hidden>
              📜
            </span>
            <span>Журнал</span>
          </button>
          <button
            type="button"
            className={`dashboard-view-button flex-1 ${
              view === "shop" ? "dashboard-view-button-active" : ""
            }`}
            onClick={() => setView("shop")}
          >
            <span className="dashboard-view-icon" aria-hidden>
              🏪
            </span>
            <span>Магазин</span>
          </button>
          <button
            type="button"
            className={`dashboard-view-button flex-1 ${
              view === "map" ? "dashboard-view-button-active" : ""
            }`}
            onClick={() => setView("map")}
          >
            <MapTabIcon className="h-5 w-5" />
            <span>Карта</span>
          </button>
        </nav>

        <HeroPanel
          adventurer={adventurer}
          factions={factions}
          editMode={editMode}
          adventurerId={adventurerId}
          onAdventurerUpdate={setAdventurer}
          onFactionsChange={refreshFactions}
        />
      </div>

      <section>
        {actionError && view === "journal" && (
          <p className="mb-3 rounded-lg border border-rose-300/50 bg-rose-50/80 px-3 py-2 text-sm text-rose-900">
            {actionError}
          </p>
        )}

        {view === "journal" ? (
          <QuestJournal
            quests={quests}
            factions={factions}
            adventurerId={adventurerId}
            updatingQuestId={updatingQuestId}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            editMode={editMode}
            onEditModeChange={setEditMode}
            onRefreshQuests={async () => {
              await Promise.all([refreshQuests(), refreshFactions()]);
            }}
            onComplete={handleComplete}
            onFail={handleFail}
            onAddSubquest={handleAddSubquest}
            onToggleSubquest={handleToggleSubquest}
            onUpdateSchedule={handleUpdateSchedule}
            onBargain={handleBargain}
            onRetireDaily={handleRetireDaily}
            onShowOnMap={handleShowQuestOnMap}
            onAdventurerUpdate={setAdventurer}
            onQuestUpdated={(updated) => {
              setQuests((prev) =>
                prev.map((quest) =>
                  quest.id === updated.id ? updated : quest,
                ),
              );
            }}
            adventurerGold={adventurer.gold}
            focusQuestId={focusQuestId}
            onFocusConsumed={() => setFocusQuestId(null)}
          />
        ) : view === "shop" ? (
          <RewardShop
            adventurer={adventurer}
            adventurerId={adventurerId}
            onAdventurerUpdate={setAdventurer}
          />
        ) : (
          <WorldMap
            quests={quests}
            focusQuestId={mapFocusQuestId}
            onFocusConsumed={() => setMapFocusQuestId(null)}
            onNavigateToQuest={handleNavigateToQuest}
          />
        )}
      </section>
    </div>
  );
}
