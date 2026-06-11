"use client";

import { useCallback, useState } from "react";

import { HeroPanel } from "@/components/adventurer/HeroPanel";
import { RewardShop } from "@/components/rewards/RewardShop";
import {
  createSubquest,
  getAdventurer,
  getQuests,
  updateQuestDeadline,
  updateQuestStatus,
} from "@/lib/api";
import { getSubquests } from "@/lib/quest-utils";
import type { Adventurer, Quest } from "@/lib/types";
import { QuestJournal } from "@/components/quest/QuestJournal";

type DashboardView = "journal" | "shop";

interface QuestDashboardProps {
  initialAdventurer: Adventurer;
  initialQuests: Quest[];
  adventurerId?: number;
}

export function QuestDashboard({
  initialAdventurer,
  initialQuests,
  adventurerId = 1,
}: QuestDashboardProps) {
  const [adventurer, setAdventurer] = useState(initialAdventurer);
  const [quests, setQuests] = useState(initialQuests);
  const [view, setView] = useState<DashboardView>("journal");
  const [updatingQuestId, setUpdatingQuestId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshAdventurer = useCallback(async () => {
    const updated = await getAdventurer(adventurerId);
    setAdventurer(updated);
  }, [adventurerId]);

  const refreshQuests = useCallback(async () => {
    const updated = await getQuests({ adventurer_id: adventurerId });
    setQuests(updated);
  }, [adventurerId]);

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
      await refreshAdventurer();
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

  async function handleUpdateDeadline(questId: number, deadline: string | null) {
    setActionError(null);
    setUpdatingQuestId(questId);
    try {
      const result = await updateQuestDeadline(questId, deadline);
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
      await refreshAdventurer();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Не удалось провалить квест",
      );
    } finally {
      setUpdatingQuestId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(260px,300px)_1fr] lg:gap-8">
      <div className="flex flex-col gap-4">
        <HeroPanel adventurer={adventurer} />
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
            📜 Журнал
          </button>
          <button
            type="button"
            className={`dashboard-view-button flex-1 ${
              view === "shop" ? "dashboard-view-button-active" : ""
            }`}
            onClick={() => setView("shop")}
          >
            🏪 Магазин
          </button>
        </nav>
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
            adventurerId={adventurerId}
            updatingQuestId={updatingQuestId}
            onRefreshQuests={refreshQuests}
            onComplete={handleComplete}
            onFail={handleFail}
            onAddSubquest={handleAddSubquest}
            onToggleSubquest={handleToggleSubquest}
            onUpdateDeadline={handleUpdateDeadline}
            adventurerGold={adventurer.gold}
          />
        ) : (
          <RewardShop
            adventurer={adventurer}
            adventurerId={adventurerId}
            onAdventurerUpdate={setAdventurer}
          />
        )}
      </section>
    </div>
  );
}
