export type QuestType =
  | "main"
  | "side"
  | "daily"
  | "bounty"
  | "exploration"
  | "boss";

export type QuestStatus =
  | "active"
  | "completed"
  | "failed"
  | "deferred"
  | "abandoned";

export type QuestDifficulty =
  | "trivial"
  | "easy"
  | "normal"
  | "hard"
  | "legendary";

export interface Adventurer {
  id: number;
  username: string;
  display_name: string;
  experience_points: number;
  gold: number;
  level: number;
  xp_to_next_level: number;
  created_at: string;
  updated_at: string;
}

export interface Reward {
  id: number;
  title: string;
  cost: number;
  description: string | null;
  icon: string;
}

export interface RewardPurchaseResult {
  reward: Reward;
  adventurer: Adventurer;
  message: string;
}

export interface QuestDeadlineUpdateResult {
  quest: Quest;
  adventurer: Adventurer;
  gold_spent: number;
}

export const DEADLINE_RESCHEDULE_COST = 20;

export interface Quest {
  id: number;
  adventurer_id: number;
  faction_id: number | null;
  location_id: number | null;
  parent_quest_id: number | null;
  title: string;
  description: string | null;
  quest_type: QuestType;
  status: QuestStatus;
  difficulty: QuestDifficulty;
  xp_reward: number;
  gold_reward: number;
  xp_earned: number;
  gold_earned: number;
  deadline: string | null;
  started_at: string;
  completed_at: string | null;
  failed_at: string | null;
  fail_reason: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
