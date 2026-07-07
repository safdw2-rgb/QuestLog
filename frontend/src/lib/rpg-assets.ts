import type { Quest } from "@/lib/types";
import { getDifficultyLevel } from "@/lib/difficulty";

/** Фоновые ассеты скевоморфной темы (public/rpg-ui/ui-theme). */
export const RPG_UI_THEME = {
  libraryBg: "/rpg-ui/ui-theme/UI_Image_Bg.png",
  magicBook: "/rpg-ui/ui-theme/UI_Image_MagicBook.png",
} as const;

/** Соотношение сторон раскрытой книги (1405×765 px). */
export const MAGIC_BOOK_ASPECT = "1405 / 765";

/** PNG-ассеты RPG UI (public/rpg-ui). Пути к папкам icons-1 / icons-2. */
export const RPG_UI = {
  goldBag: "/rpg-ui/icons-1/icon12.png",
  editGear: "/rpg-ui/icons-1/icon3.png",
  questScroll: "/rpg-ui/icons-2/icon10.png",
  rewardChest: "/rpg-ui/icons-2/icon9.png",
  deleteCross: "/rpg-ui/icons-1/icon2.png",
  skull: "/rpg-ui/icons-2/icon7.png",
  crossedSwords: "/rpg-ui/icons-2/icon5.png",
  compass: "/rpg-ui/icons-2/icon4.png",
  levelFrame: "/rpg-ui/icons-2/icon12.png",
  potions: {
    red: "/rpg-ui/icons-1/icon9.png",
    blue: "/rpg-ui/icons-1/icon10.png",
    green: "/rpg-ui/icons-1/icon11.png",
  },
} as const;

/** Системные пиксельные иконки из папки System. */
export const SYS_ICON = {
  sparkles: "/rpg-ui/System/Icon_sparkles.png",
  setting:  "/rpg-ui/System/Icon_setting.png",
  trash:    "/rpg-ui/System/Icon_trash.png",
  xCircle:  "/rpg-ui/System/Icon_x-circle.png",
  pencil:   "/rpg-ui/System/Icon_pencil.png",
  star:     "/rpg-ui/System/Icon_star.png",
  moon:     "/rpg-ui/System/Icon_moon.png",
  trophy:   "/rpg-ui/System/Icon_trophy.png",
  plus:     "/rpg-ui/System/Icon_plus.png",
  alertFill: "/rpg-ui/System/Icon_alert-fill.png",
} as const;

export const CHEAP_REWARD_COST_THRESHOLD = 20;

export function potionForEffect(effectId: number): string {
  const icons = [
    RPG_UI.potions.red,
    RPG_UI.potions.blue,
    RPG_UI.potions.green,
  ];
  return icons[effectId % icons.length];
}

type QuestIconSource = Pick<Quest, "difficulty" | "status" | "quest_type">;

export function resolveQuestIconSrc(
  quest: QuestIconSource,
  options: { isFailedTab?: boolean } = {},
): string {
  if (options.isFailedTab || quest.status === "failed") {
    return RPG_UI.skull;
  }

  const tier = getDifficultyLevel(quest.difficulty).tier;

  if (tier === "legendary") {
    return RPG_UI.skull;
  }
  if (tier === "trial") {
    return RPG_UI.crossedSwords;
  }
  if (tier === "errand") {
    return RPG_UI.compass;
  }

  return RPG_UI.questScroll;
}

export function resolveQuestIconFallback(
  quest: QuestIconSource,
  factionIcon: string | null,
  options: { isFailedTab?: boolean } = {},
): string {
  if (options.isFailedTab || quest.status === "failed") {
    return "💀";
  }

  const tier = getDifficultyLevel(quest.difficulty).tier;

  if (tier === "legendary") {
    return "💀";
  }
  if (tier === "trial") {
    return "⚔️";
  }
  if (tier === "errand") {
    return "🧭";
  }

  return factionIcon ?? "📜";
}

export function resolveRewardIconSrc(cost: number, rewardId: number): string {
  if (cost > CHEAP_REWARD_COST_THRESHOLD) {
    return RPG_UI.rewardChest;
  }

  return rewardId % 2 === 0 ? RPG_UI.goldBag : RPG_UI.potions.green;
}
