"use client";

import { FormEvent, useState } from "react";

import { FactionManager } from "@/components/faction/FactionManager";
import { updateAdventurer } from "@/lib/api";
import type { Adventurer, Faction } from "@/lib/types";

interface HeroCardContentProps {
  adventurer: Adventurer;
  factions: Faction[];
  editMode: boolean;
  adventurerId?: number;
  generatingLore?: boolean;
  onAdventurerUpdate: (adventurer: Adventurer) => void;
  onFactionsChange: () => Promise<void>;
  compactLore?: boolean;
}

export function HeroCardContent({
  adventurer,
  factions,
  editMode,
  adventurerId = 1,
  generatingLore = false,
  onAdventurerUpdate,
  onFactionsChange,
  compactLore = false,
}: HeroCardContentProps) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(adventurer.display_name);
  const [username, setUsername] = useState(adventurer.username);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextLevelXp = adventurer.experience_points + adventurer.xp_to_next_level;
  const progress =
    nextLevelXp === 0
      ? 0
      : Math.min(100, (adventurer.experience_points / nextLevelXp) * 100);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const updated = await updateAdventurer(adventurerId, {
        display_name: displayName.trim(),
        username: username.trim(),
      });
      onAdventurerUpdate(updated);
      setDisplayName(updated.display_name);
      setUsername(updated.username);
      setEditing(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось обновить профиль",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Искатель приключений
        </p>
        <h2 className="mt-0.5 font-display text-xl text-ink lg:text-2xl">
          {adventurer.display_name}
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">@{adventurer.username}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Уровень" value={String(adventurer.level)} accent />
        <StatCard label="Золото" value={`${adventurer.gold} 🪙`} />
      </div>

      <div>
        <div className="mb-2 flex justify-between text-sm text-ink-muted">
          <span>Опыт</span>
          <span>
            {adventurer.experience_points} / {nextLevelXp} XP
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-parchment-dark/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <FactionManager
        factions={factions}
        editMode={editMode}
        onFactionsChange={onFactionsChange}
      />

      <section>
        <h3 className="text-xs uppercase tracking-wide text-ink-muted">
          Лор персонажа
        </h3>
        {generatingLore ? (
          <p className="mt-2 text-sm italic text-ink-muted">
            Лютик переписывает вашу балладу…
          </p>
        ) : adventurer.lore ? (
          <p
            className={`mt-2 text-sm leading-relaxed text-ink/85 ${
              compactLore ? "line-clamp-4" : ""
            }`}
          >
            {adventurer.lore}
          </p>
        ) : (
          <p className="mt-2 text-sm italic text-ink-muted">
            Лор ещё не сочинён — завершите квесты.
          </p>
        )}
      </section>

      {editing ? (
        <form className="space-y-3 border-t border-ink/10 pt-4" onSubmit={handleProfileSubmit}>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-ink-muted">
              Имя героя
            </span>
            <input
              className="journal-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={128}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-ink-muted">
              Тег
            </span>
            <input
              className="journal-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={64}
              required
            />
          </label>
          {error && <p className="text-xs text-rose-800">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              className="journal-button-primary"
              disabled={submitting}
            >
              {submitting ? "Сохраняем..." : "Сохранить"}
            </button>
            <button
              type="button"
              className="journal-button-secondary"
              onClick={() => setEditing(false)}
              disabled={submitting}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : editMode ? (
        <button
          type="button"
          className="journal-button-secondary w-full"
          onClick={() => {
            setDisplayName(adventurer.display_name);
            setUsername(adventurer.username);
            setEditing(true);
          }}
        >
          ✏️ Редактировать профиль
        </button>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${
        accent
          ? "border-gold/40 bg-gold/10"
          : "border-ink/10 bg-parchment-dark/40"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="font-display text-xl text-ink">{value}</p>
    </div>
  );
}
