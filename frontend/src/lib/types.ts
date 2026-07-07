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

export type QuestFrequency =
  | "daily"
  | "every_other_day"
  | "three_days"
  | "weekly";

export interface Faction {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  reputation_points: number;
}

export interface Adventurer {
  id: number;
  user_id: number;
  invite_code: string;
  username: string;
  display_name: string;
  experience_points: number;
  gold: number;
  level: number;
  lore: string | null;
  xp_to_next_level: number;
  created_at: string;
  updated_at: string;
}

export interface QuestUpdateResult {
  quest: Quest;
  adventurer: Adventurer;
  gold_spent: number;
}

export interface Reward {
  id: number;
  title: string;
  cost: number;
  effective_cost?: number | null;
  description: string | null;
  icon: string;
  faction_id: number | null;
}

export interface ActiveEffect {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  effect_type: string;
  expires_at: string;
  created_at: string;
}

export interface ActiveEffectList {
  items: ActiveEffect[];
}

export interface RewardPurchaseResult {
  reward: Reward;
  adventurer: Adventurer;
  message: string;
  gold_spent?: number;
  active_effect?: ActiveEffect | null;
}

export interface QuestPage {
  items: Quest[];
  total: number;
  page: number;
  size: number;
}

export interface QuestDeadlineUpdateResult {
  quest: Quest;
  adventurer: Adventurer;
  gold_spent: number;
}

export interface QuestBargainResult {
  quest: Quest;
  adventurer: Adventurer;
  roll: number;
  outcome: "fail" | "success" | "critical";
  message: string;
  gold_spent: number;
}

export const DEADLINE_RESCHEDULE_COST = 20;
export const BARGAIN_COST = 10;

export interface MentorStudent {
  user_id: number;
  adventurer_id: number;
  display_name: string;
  username: string;
  invite_code: string;
}

export interface Quest {
  id: number;
  adventurer_id: number;
  creator_user_id: number | null;
  faction_id: number | null;
  location_id: number | null;
  parent_quest_id: number | null;
  title: string;
  description: string | null;
  quest_type: QuestType;
  status: QuestStatus;
  difficulty: QuestDifficulty;
  frequency: QuestFrequency;
  xp_reward: number;
  gold_reward: number;
  xp_earned: number;
  gold_earned: number;
  deadline: string | null;
  reminder_time: string | null;
  latitude: number | null;
  longitude: number | null;
  bargained: boolean;
  started_at: string;
  completed_at: string | null;
  failed_at: string | null;
  fail_reason: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
