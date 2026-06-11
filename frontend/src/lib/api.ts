import type { Adventurer, Quest, QuestStatus } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function getAdventurer(id: number): Promise<Adventurer> {
  return apiFetch<Adventurer>(`/api/v1/adventurers/${id}`);
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
