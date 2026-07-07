export type QuestFrequency =
  | "daily"
  | "every_other_day"
  | "three_days"
  | "weekly";

export const QUEST_FREQUENCY_OPTIONS: {
  value: QuestFrequency;
  label: string;
}[] = [
  { value: "daily", label: "Каждый день" },
  { value: "every_other_day", label: "Через день" },
  { value: "three_days", label: "Раз в 3 дня" },
  { value: "weekly", label: "Раз в неделю" },
];

export const DEFAULT_QUEST_FREQUENCY: QuestFrequency = "daily";
