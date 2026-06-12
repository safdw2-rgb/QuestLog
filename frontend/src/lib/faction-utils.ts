import type { Faction } from "@/lib/types";

export function extractEmojiFromText(text: string): string | null {
  for (const char of text) {
    if (/\p{Extended_Pictographic}/u.test(char)) {
      return char;
    }
  }
  return null;
}

export function resolveFactionIcon(faction: Pick<Faction, "name" | "icon">): string | null {
  const explicit = faction.icon?.trim();
  if (explicit) {
    return explicit;
  }
  return extractEmojiFromText(faction.name);
}

export function resolveFactionIconFromForm(
  name: string,
  icon: string,
): string | null {
  const trimmedIcon = icon.trim();
  if (trimmedIcon) {
    return trimmedIcon;
  }
  return extractEmojiFromText(name);
}
