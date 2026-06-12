import type {
  Adventurer,
  Faction,
  Quest,
  QuestDifficulty,
  QuestStatus,
  QuestType,
  QuestBargainResult,
  QuestDeadlineUpdateResult,
  QuestUpdateResult,
  Reward,
  RewardPurchaseResult,
} from "@/lib/types";

export type { QuestType, QuestDifficulty };

function getApiBase(): string {
  // Браузер: относительный /api → Next.js rewrite → backend.
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL ?? "";
  }

  // SSR в Node.js: нужен абсолютный URL (Docker-сеть или localhost).
  return (
    process.env.API_URL ??
    process.env.BACKEND_URL ??
    "http://localhost:8000"
  );
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") {
        detail = body.detail;
      }
    } catch {
      // тело ответа не JSON — оставляем statusText
    }
    throw new Error(`API ${response.status}: ${detail}`);
  }

  return response.json() as Promise<T>;
}

export interface CreateQuestPayload {
  title: string;
  description?: string;
  quest_type: QuestType;
  difficulty: QuestDifficulty;
  xp_reward: number;
  gold_reward: number;
  deadline?: string | null;
  reminder_time?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  faction_id?: number | null;
}

export interface QuestAiGeneratePayload {
  title: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface QuestScheduleUpdatePayload {
  deadline?: string | null;
  reminder_time?: string | null;
}

export interface QuestAiDetails {
  description: string;
  quest_type: QuestType;
  difficulty: QuestDifficulty;
  xp_reward: number;
  gold_reward: number;
  source: string;
}

export function generateQuestAiDetails(
  payload: QuestAiGeneratePayload,
): Promise<QuestAiDetails> {
  return apiFetch<QuestAiDetails>("/api/v1/quests/generate-ai-details", {
    method: "POST",
    body: JSON.stringify({
      title: payload.title.trim(),
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
    }),
  });
}

export function createQuest(payload: CreateQuestPayload): Promise<Quest> {
  return apiFetch<Quest>("/api/v1/quests", {
    method: "POST",
    body: JSON.stringify({
      adventurer_id: 1,
      title: payload.title,
      description: payload.description || null,
      quest_type: payload.quest_type,
      difficulty: payload.difficulty,
      xp_reward: payload.xp_reward,
      gold_reward: payload.gold_reward,
      faction_id: payload.faction_id ?? null,
      location_id: null,
      parent_quest_id: null,
      deadline: payload.deadline ?? null,
      reminder_time: payload.reminder_time ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
    }),
  });
}

export function bargainQuestReward(questId: number): Promise<QuestBargainResult> {
  return apiFetch<QuestBargainResult>(`/api/v1/quests/${questId}/bargain`, {
    method: "POST",
  });
}

export function createSubquest(
  parentQuestId: number,
  title: string,
  adventurerId = 1,
): Promise<Quest> {
  return apiFetch<Quest>("/api/v1/quests", {
    method: "POST",
    body: JSON.stringify({
      adventurer_id: adventurerId,
      title: title.trim(),
      description: null,
      quest_type: "side",
      difficulty: "trivial",
      xp_reward: 0,
      gold_reward: 0,
      faction_id: null,
      location_id: null,
      parent_quest_id: parentQuestId,
    }),
  });
}

export function getAdventurer(id: number): Promise<Adventurer> {
  return apiFetch<Adventurer>(`/api/v1/adventurers/${id}`);
}

export function getFactions(): Promise<Faction[]> {
  return apiFetch<Faction[]>("/api/v1/factions");
}

export interface CreateFactionPayload {
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

export interface UpdateFactionPayload {
  name?: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

export function createFaction(payload: CreateFactionPayload): Promise<Faction> {
  return apiFetch<Faction>("/api/v1/factions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateFaction(
  factionId: number,
  payload: UpdateFactionPayload,
): Promise<Faction> {
  return apiFetch<Faction>(`/api/v1/factions/${factionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface UpdateAdventurerPayload {
  display_name?: string;
  username?: string;
  lore?: string | null;
}

export function updateAdventurer(
  adventurerId: number,
  payload: UpdateAdventurerPayload,
): Promise<Adventurer> {
  return apiFetch<Adventurer>(`/api/v1/adventurers/${adventurerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function generateAdventurerLore(adventurerId: number): Promise<Adventurer> {
  return apiFetch<Adventurer>(
    `/api/v1/adventurers/${adventurerId}/generate-lore`,
    { method: "POST" },
  );
}

export interface UpdateQuestPayload {
  title?: string;
  description?: string | null;
  faction_id?: number | null;
  deadline?: string | null;
  reminder_time?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function updateQuest(
  questId: number,
  payload: UpdateQuestPayload,
): Promise<QuestUpdateResult> {
  return apiFetch<QuestUpdateResult>(`/api/v1/quests/${questId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function retireDailyQuest(questId: number): Promise<Quest> {
  return apiFetch<Quest>(`/api/v1/quests/${questId}/retire-daily`, {
    method: "POST",
  });
}

export function updateQuestStatus(
  questId: number,
  payload: { status: QuestStatus; fail_reason?: string },
): Promise<Quest> {
  return apiFetch<Quest>(`/api/v1/quests/${questId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateQuestSchedule(
  questId: number,
  payload: QuestScheduleUpdatePayload,
): Promise<QuestDeadlineUpdateResult> {
  return apiFetch<QuestDeadlineUpdateResult>(
    `/api/v1/quests/${questId}/deadline`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function getQuests(params?: {
  adventurer_id?: number;
  status?: QuestStatus;
}): Promise<Quest[]> {
  const search = new URLSearchParams();
  if (params?.adventurer_id != null) {
    search.set("adventurer_id", String(params.adventurer_id));
  }
  if (params?.status) {
    search.set("status", params.status);
  }
  const query = search.toString();
  return apiFetch<Quest[]>(`/api/v1/quests${query ? `?${query}` : ""}`);
}

export function getRewards(): Promise<Reward[]> {
  return apiFetch<Reward[]>("/api/v1/rewards");
}

export function purchaseReward(
  rewardId: number,
  adventurerId = 1,
): Promise<RewardPurchaseResult> {
  return apiFetch<RewardPurchaseResult>(
    `/api/v1/rewards/${rewardId}/purchase?adventurer_id=${adventurerId}`,
    { method: "POST" },
  );
}
