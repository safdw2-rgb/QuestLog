import type {
  ActiveEffectList,
  Adventurer,
  Faction,
  MentorStudent,
  Quest,
  QuestDifficulty,
  QuestFrequency,
  QuestStatus,
  QuestType,
  QuestBargainResult,
  QuestDeadlineUpdateResult,
  QuestUpdateResult,
  Reward,
  RewardPurchaseResult,
} from "@/lib/types";
import {
  clearStoredToken,
  getStoredToken,
} from "@/lib/auth-storage";

export type { QuestType, QuestDifficulty, QuestFrequency };

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
}

export interface AuthRegisterResponse extends AuthTokenResponse {
  adventurer: Adventurer;
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function getApiBase(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_URL ?? "";
  }

  return (
    process.env.API_URL ??
    process.env.BACKEND_URL ??
    "http://localhost:8000"
  );
}

function buildAuthHeaders(init?: RequestInit): HeadersInit {
  const headers = new Headers(init?.headers);
  const token = getStoredToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (
    init?.body != null &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      init.body instanceof URLSearchParams
        ? "application/x-www-form-urlencoded"
        : "application/json",
    );
  }

  return headers;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: buildAuthHeaders(init),
    cache: "no-store",
  });

  if (response.status === 401) {
    clearStoredToken();
    unauthorizedHandler?.();
  }

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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function login(email: string, password: string): Promise<AuthTokenResponse> {
  const body = new URLSearchParams();
  body.set("username", email.trim());
  body.set("password", password);

  return apiFetch<AuthTokenResponse>("/api/v1/auth/token", {
    method: "POST",
    body,
  });
}

export function register(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthRegisterResponse> {
  return apiFetch<AuthRegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim(),
      password,
      display_name: displayName?.trim() || undefined,
    }),
  });
}

export function getMe(): Promise<Adventurer> {
  return apiFetch<Adventurer>("/api/v1/adventurers/me");
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  });
}

export function resetPassword(
  token: string,
  password: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export interface CreateQuestPayload {
  title: string;
  description?: string;
  quest_type: QuestType;
  difficulty: QuestDifficulty;
  frequency?: QuestFrequency;
  xp_reward: number;
  gold_reward: number;
  deadline?: string | null;
  reminder_time?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  faction_id?: number | null;
  assigned_to_id?: number | null;
}

export interface QuestAiGeneratePayload {
  title: string;
  latitude?: number | null;
  longitude?: number | null;
  faction_id?: number | null;
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

export interface QuestAiImproveDetails {
  title: string;
  description: string;
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
      faction_id: payload.faction_id ?? null,
    }),
  });
}

export function improveQuestAiDetails(
  title: string,
  description?: string | null,
  factionId?: number | null,
): Promise<QuestAiImproveDetails> {
  return apiFetch<QuestAiImproveDetails>("/api/v1/quests/improve-ai-details", {
    method: "POST",
    body: JSON.stringify({
      title: title.trim(),
      description: description?.trim() || null,
      faction_id: factionId ?? null,
    }),
  });
}

export function getActiveEffects(): Promise<ActiveEffectList> {
  return apiFetch<ActiveEffectList>("/api/v1/effects");
}

export function createQuest(payload: CreateQuestPayload): Promise<Quest> {
  return apiFetch<Quest>("/api/v1/quests", {
    method: "POST",
    body: JSON.stringify({
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
      assigned_to_id: payload.assigned_to_id ?? null,
      frequency: payload.frequency ?? "daily",
    }),
  });
}

export function getMentorStudents(): Promise<{ items: MentorStudent[] }> {
  return apiFetch<{ items: MentorStudent[] }>("/api/v1/mentor/students");
}

export function bindMentorStudent(
  inviteCode: string,
): Promise<{ student: MentorStudent; message: string }> {
  return apiFetch<{ student: MentorStudent; message: string }>(
    "/api/v1/mentor/bind",
    {
      method: "POST",
      body: JSON.stringify({ invite_code: inviteCode.trim() }),
    },
  );
}

export function unbindMentorStudent(studentUserId: number): Promise<void> {
  return apiFetch<void>(`/api/v1/mentor/students/${studentUserId}`, {
    method: "DELETE",
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
): Promise<Quest> {
  return apiFetch<Quest>("/api/v1/quests", {
    method: "POST",
    body: JSON.stringify({
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
  payload: UpdateAdventurerPayload,
): Promise<Adventurer> {
  return apiFetch<Adventurer>("/api/v1/adventurers/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function generateAdventurerLore(): Promise<Adventurer> {
  return apiFetch<Adventurer>("/api/v1/adventurers/me/generate-lore", {
    method: "POST",
  });
}

export interface UpdateQuestPayload {
  title?: string;
  description?: string | null;
  faction_id?: number | null;
  deadline?: string | null;
  reminder_time?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  frequency?: QuestFrequency;
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
  status?: QuestStatus;
  page?: number;
  size?: number;
  sort_by?: import("@/lib/quest-sort").QuestSortOption;
  fetch_all?: boolean;
}): Promise<import("@/lib/types").QuestPage> {
  const search = new URLSearchParams();
  if (params?.status) {
    search.set("status", params.status);
  }
  if (params?.fetch_all) {
    search.set("fetch_all", "true");
  } else {
    search.set("page", String(params?.page ?? 1));
    search.set("size", String(params?.size ?? 20));
  }
  if (params?.sort_by) {
    search.set("sort_by", params.sort_by);
  }
  const query = search.toString();
  return apiFetch<import("@/lib/types").QuestPage>(
    `/api/v1/quests${query ? `?${query}` : ""}`,
  );
}

export function getRewards(): Promise<Reward[]> {
  return apiFetch<Reward[]>("/api/v1/rewards");
}

export interface RewardCreatePayload {
  title: string;
  description?: string | null;
  cost: number;
  icon?: string;
  faction_id?: number | null;
}

export function createReward(payload: RewardCreatePayload): Promise<Reward> {
  return apiFetch<Reward>("/api/v1/rewards", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteReward(rewardId: number): Promise<void> {
  return apiFetch<void>(`/api/v1/rewards/${rewardId}`, {
    method: "DELETE",
  });
}

export interface RewardUpdatePayload {
  title?: string;
  description?: string | null;
  cost?: number;
  icon?: string;
  faction_id?: number | null;
}

export function updateReward(
  rewardId: number,
  payload: RewardUpdatePayload,
): Promise<Reward> {
  return apiFetch<Reward>(`/api/v1/rewards/${rewardId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface RewardAiDescriptionPayload {
  title: string;
  faction_id?: number | null;
}

export interface RewardAiDescriptionResult {
  description: string;
  source: string;
}

export function generateRewardAiDescription(
  payload: RewardAiDescriptionPayload,
): Promise<RewardAiDescriptionResult> {
  return apiFetch<RewardAiDescriptionResponse>(
    "/api/v1/rewards/generate-description",
    {
      method: "POST",
      body: JSON.stringify({
        title: payload.title.trim(),
        faction_id: payload.faction_id ?? null,
      }),
    },
  );
}

type RewardAiDescriptionResponse = RewardAiDescriptionResult;

export function purchaseReward(rewardId: number): Promise<RewardPurchaseResult> {
  return apiFetch<RewardPurchaseResult>(
    `/api/v1/rewards/${rewardId}/purchase`,
    { method: "POST" },
  );
}
