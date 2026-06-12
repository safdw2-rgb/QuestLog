export type AppTheme = "parchment" | "dungeon" | "cyberpunk";

export const THEME_STORAGE_KEY = "questlog-theme";

export const APP_THEMES: {
  id: AppTheme;
  label: string;
  description: string;
}[] = [
  {
    id: "parchment",
    label: "Пергамент",
    description: "Тёплый светлый дневник",
  },
  {
    id: "dungeon",
    label: "Подземелье",
    description: "Тёмный режим с золотом",
  },
  {
    id: "cyberpunk",
    label: "Киберпанк",
    description: "Неон и контраст",
  },
];

export function isAppTheme(value: string): value is AppTheme {
  return value === "parchment" || value === "dungeon" || value === "cyberpunk";
}

export function readStoredTheme(): AppTheme {
  if (typeof window === "undefined") {
    return "parchment";
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isAppTheme(stored)) {
      return stored;
    }
  } catch {
    // localStorage недоступен
  }

  return "parchment";
}
