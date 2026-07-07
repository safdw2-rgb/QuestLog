"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { HeroPanel } from "@/components/adventurer/HeroPanel";
import { useDashboardView } from "@/components/layout/DashboardViewContext";
import { FlexibleRpgLayout } from "@/components/layout/FlexibleRpgLayout";
import { RewardShop } from "@/components/rewards/RewardShop";
import {
  bargainQuestReward,
  createSubquest,
  getFactions,
  getMe,
  getMentorStudents,
  getQuests,
  retireDailyQuest,
  updateQuestSchedule,
  type QuestScheduleUpdatePayload,
  updateQuestStatus,
} from "@/lib/api";
import type { DateFilter } from "@/lib/quest-date-filters";
import { getSubquests } from "@/lib/quest-utils";
import type { Adventurer, Faction, MentorStudent, Quest } from "@/lib/types";
import { QuestJournal } from "@/components/quest/QuestJournal";
import { useEditMode } from "@/components/layout/EditModeContext";
import { useAuth } from "@/components/auth/AuthContext";

const WorldMap = dynamic(
  () =>
    import("@/components/map/WorldMap").then((module) => module.WorldMap),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 text-center text-[#4a3224]">Загружаем карту мира...</div>
    ),
  },
);
interface QuestDashboardProps {
  initialAdventurer: Adventurer;
  initialQuests: Quest[];
  initialFactions: Faction[];
  onEffectsRefresh?: () => void;
}

export function QuestDashboard({
  initialAdventurer,
  initialQuests,
  initialFactions,
  onEffectsRefresh,
}: QuestDashboardProps) {
  const { setAdventurer: setAuthAdventurer } = useAuth();
  const [adventurer, setAdventurer] = useState(initialAdventurer);
  const [quests, setQuests] = useState(initialQuests);
  const [factions, setFactions] = useState(initialFactions);
  const [mentorStudents, setMentorStudents] = useState<MentorStudent[]>([]);
  const { view, setView } = useDashboardView();
  const [updatingQuestId, setUpdatingQuestId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [focusQuestId, setFocusQuestId] = useState<number | null>(null);
  const [mapFocusQuestId, setMapFocusQuestId] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter | null>(null);
  const { editMode, setEditMode } = useEditMode();

  const handleAdventurerUpdate = useCallback(
    (updated: Adventurer) => {
      setAdventurer(updated);
      setAuthAdventurer(updated);
    },
    [setAuthAdventurer],
  );

  const refreshAdventurer = useCallback(async () => {
    const updated = await getMe();
    handleAdventurerUpdate(updated);
  }, [handleAdventurerUpdate]);

  const refreshQuests = useCallback(async () => {
    const page = await getQuests({
      fetch_all: true,
    });
    setQuests(page.items);
  }, []);

  const handleMentorStudentsChange = useCallback((students: MentorStudent[]) => {
    setMentorStudents(students);
  }, []);

  const refreshMentorStudents = useCallback(async () => {
    try {
      const response = await getMentorStudents();
      setMentorStudents(response.items);
    } catch {
      setMentorStudents([]);
    }
  }, []);

  useEffect(() => {
    void refreshMentorStudents();
  }, [refreshMentorStudents]);

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
      const created = await createSubquest(parentQuestId, title);
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
      handleAdventurerUpdate(result.adventurer);
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
      handleAdventurerUpdate(result.adventurer);
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
    <FlexibleRpgLayout
      left={
        <HeroPanel
          adventurer={adventurer}
          factions={factions}
          editMode={editMode}
          onAdventurerUpdate={handleAdventurerUpdate}
          onFactionsChange={refreshFactions}
          onMentorStudentsChange={handleMentorStudentsChange}
        />
      }
      rightTabs={
        <>
          <button
            type="button"
            className={`rpg-game-tab ${view === "journal" ? "rpg-game-tab-active" : ""}`}
            onClick={() => setView("journal")}
            aria-pressed={view === "journal"}
          >
            📖 Журнал
          </button>
          <button
            type="button"
            className={`rpg-game-tab ${view === "shop" ? "rpg-game-tab-active" : ""}`}
            onClick={() => setView("shop")}
            aria-pressed={view === "shop"}
          >
            🏪 Магазин
          </button>
        </>
      }
      right={
        <section className="flex w-full min-w-0 flex-1 flex-col gap-4 box-border min-h-0">
          {actionError && view === "journal" && (
            <p className="shrink-0 rounded-lg border border-rose-300/50 bg-rose-50/80 px-3 py-2 text-sm text-rose-900">
              {actionError}
            </p>
          )}

          {view === "journal" ? (
            <QuestJournal
              quests={quests}
              factions={factions}
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
              onAdventurerUpdate={handleAdventurerUpdate}
              onQuestUpdated={(updated) => {
                setQuests((prev) =>
                  prev.map((quest) =>
                    quest.id === updated.id ? updated : quest,
                  ),
                );
              }}
              adventurerGold={adventurer.gold}
              currentUserId={adventurer.user_id}
              mentorStudents={mentorStudents}
              focusQuestId={focusQuestId}
              onFocusConsumed={() => setFocusQuestId(null)}
            />
          ) : view === "shop" ? (
            <RewardShop
              adventurer={adventurer}
              factions={factions}
              editMode={editMode}
              onAdventurerUpdate={handleAdventurerUpdate}
              onEffectsRefresh={onEffectsRefresh}
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
      }
    />
  );
}

