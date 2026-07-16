"use client";

import { FormEvent, useState } from "react";

import dynamic from "next/dynamic";

const ActiveEffectsBar = dynamic(
  () => import("@/components/effects/ActiveEffectsBar").then((m) => m.ActiveEffectsBar),
  { ssr: false },
);
import { FactionManager } from "@/components/faction/FactionManager";
import { generateAdventurerLore, updateAdventurer } from "@/lib/api";
import type { Adventurer, Faction } from "@/lib/types";

interface HeroCardContentProps {
  adventurer: Adventurer;
  factions: Faction[];
  editMode: boolean;
  selectedFactionId?: number | null;
  onFactionFilterToggle?: (factionId: number) => void;
  onAdventurerUpdate: (adventurer: Adventurer) => void;
  onFactionsChange: () => Promise<void>;
  showFactions?: boolean;
  showLore?: boolean;
}

export function HeroCardContent({
  adventurer,
  factions,
  editMode,
  selectedFactionId = null,
  onFactionFilterToggle,
  onAdventurerUpdate,
  onFactionsChange,
  showFactions = true,
  showLore = true,
}: HeroCardContentProps) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(adventurer.display_name);
  const [username, setUsername] = useState(adventurer.username);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingLore, setRefreshingLore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);

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
      const updated = await updateAdventurer({
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

  async function handleRefreshLore() {
    setRefreshingLore(true);
    setError(null);
    try {
      const updated = await generateAdventurerLore();
      onAdventurerUpdate(updated);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось обновить лор",
      );
    } finally {
      setRefreshingLore(false);
    }
  }

  return (
    /* position:relative so the wallet tab can be absolutely anchored to the left edge */
    <div className="relative w-full min-w-0 box-border space-y-2.5 lg:space-y-3">

      {/* ── WALLET — vertical side tab hanging off the LEFT edge ──────── */}
      {/* tab asset is 75×142 px  →  rendered at 46×87 px (same ratio) */}
      {/* transform lives in .hero-wallet-tab (globals.css) so :hover can animate it, */}
      {/* mirroring how .rpg-game-tab handles the Журнал/Магазин hover state */}
      <button
        type="button"
        className="hero-wallet-tab"
        onClick={() => setIsWalletOpen((v) => !v)}
        aria-pressed={isWalletOpen}
        aria-label={isWalletOpen ? 'Закрыть кошелёк' : 'Открыть кошелёк'}
        style={{
          position: 'absolute',
          left: 0,
          top: 80,
          backgroundImage: isWalletOpen
            ? "url('/rpg-ui/Tabs/UI_tab3_On.png')"
            : "url('/rpg-ui/Tabs/UI_tab3_Off.png')",
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          width: 46,
          height: 87,
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Rotate content -90° so it reads bottom-to-top on the side tab */}
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            transform: 'rotate(-90deg)',
            whiteSpace: 'nowrap',
          }}
        >
          <img
            src="/rpg-ui/icons-1/icon12.png"
            alt=""
            aria-hidden
            style={{ width: 16, height: 16, objectFit: 'contain', imageRendering: 'pixelated' }}
          />
          <span
            style={{
              fontFamily: "'Moyenage', Georgia, serif",
              fontSize: isWalletOpen ? '0.85rem' : '0.65rem',
              color: isWalletOpen ? '#3a2214' : '#fff8e7',
              textShadow: isWalletOpen
                ? '0 1px 0 rgba(255,255,255,0.2)'
                : '0 1px 2px rgba(0,0,0,0.75)',
              lineHeight: 1,
            }}
          >
            {isWalletOpen ? adventurer.gold : 'Кошелёк'}
          </span>
        </span>
      </button>

      {/* ── 1. RIBBON with name + hanging level bookmark ─────────────── */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#4a3224]">
          Искатель приключений
        </p>

        {/* Ribbon: 700×141 px → height = containerWidth / (700/141) ≈ containerWidth * 0.201 */}
        <div
          className="relative mt-1 mx-auto"
          style={{
            backgroundImage: "url('/rpg-ui/Decorations/UI_TitleBg_Ribbon_Large.png')",
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            width: '100%',
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Name — gold-leaf cream, carved out of the dark ribbon with a deep shadow */}
          <h2
            style={{
              fontFamily: "'Moyenage', Georgia, serif",
              fontWeight: 'normal',
              fontStyle: 'normal',
              fontSize: '1.6rem',
              letterSpacing: '0.07em',
              lineHeight: 1,
              /* Moyenage has internal top-heavy metrics — nudge down visually */
              transform: 'translateY(-3px)',
              color: '#f6c85b',
              textShadow: '2px 2px 0px #1a0d07, -1px -1px 0px #1a0d07',
              margin: 0,
            }}
          >
            {adventurer.display_name}
          </h2>

          {/* Bookmark hangs from the bottom centre of the ribbon */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translate(-50%, 60%)',
              backgroundImage: "url('/rpg-ui/Decorations/UI_Image_bookmark.png')",
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              width: 36,
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontFamily: "'Moyenage', Georgia, serif",
                fontSize: '1.15rem',
                color: '#fff8e7',
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                lineHeight: 1,
                paddingTop: '4px',
                display: 'block',
              }}
            >
              {adventurer.level}
            </span>
          </div>
        </div>

        {/* Username — edit mode only, below the ribbon */}
        {editMode && (
          <p className="mt-8 text-center text-xs text-[#4a3224]">
            @{adventurer.username}
          </p>
        )}
      </div>

      {/* Spacer so the hanging bookmark doesn't overlap the next row */}
      <div style={{ height: 22 }} />

      {/* Buff icons */}
      <div className="flex justify-start">
        <ActiveEffectsBar />
      </div>

      {/* ── 3. XP BAR — clean Tailwind, no sprite stretching ─────────── */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-[#4a3224]">
          <span className="flex items-center gap-1">
            <img
              src="/rpg-ui/Items/Icon_Special_Grimoire_.png"
              alt=""
              aria-hidden
              className="inline-block h-5 w-5 shrink-0 object-contain align-middle"
              style={{ imageRendering: 'pixelated' }}
            />
            Опыт
          </span>
          <span className="tabular-nums text-[11px]">
            {adventurer.experience_points} / {nextLevelXp} XP
          </span>
        </div>
        {/* Track */}
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Опыт: ${adventurer.experience_points} / ${nextLevelXp}`}
          className="relative w-full overflow-hidden rounded-sm"
          style={{
            height: 10,
            background: 'rgba(44,24,14,0.30)',
            border: '1px solid rgba(44,24,14,0.35)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.35)',
          }}
        >
          {/* Fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-500"
            style={{
              width: `${Math.max(0, Math.min(100, progress))}%`,
              background: 'linear-gradient(180deg, #d4a017 0%, #a07510 100%)',
              boxShadow: '0 0 6px rgba(212,160,23,0.55)',
            }}
          />
        </div>
      </div>

      {showFactions && (
        <FactionManager
          factions={factions}
          editMode={editMode}
          selectedFactionId={selectedFactionId}
          onFactionFilterToggle={onFactionFilterToggle}
          onFactionsChange={onFactionsChange}
        />
      )}

      {showLore && (
        <section className="hero-lore-section pt-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] uppercase tracking-wide text-[#4a3224]">
              Лор персонажа
            </h3>
            {editMode && (
              <button
                type="button"
                className="journal-button-secondary px-2 py-1 text-[10px]"
                onClick={handleRefreshLore}
                disabled={refreshingLore}
              >
                {refreshingLore ? "Лютик пишет…" : "🪶 Обновить лор"}
              </button>
            )}
          </div>
          {refreshingLore ? (
            <p className="mt-1.5 text-xs italic text-[#4a3224]">
              Лютик переписывает вашу балладу…
            </p>
          ) : adventurer.lore ? (
            <div className="hero-lore-body mt-1.5 max-h-36 overflow-y-auto text-xs leading-snug text-[#3a2214]/90">
              <p className="whitespace-pre-wrap break-words">{adventurer.lore}</p>
            </div>
          ) : (
            <p className="mt-1.5 text-xs italic text-[#4a3224]">
              Лор обновляется каждую ночь в 03:00. Завершите квесты или нажмите
              «Обновить лор» в режиме редактирования.
            </p>
          )}
          {/* Decorative gold ornament — separates lore from mentorship */}
          <img
            src="/rpg-ui/Decorations/UI_Image_Deco.png"
            className="mx-auto my-3 h-4 w-auto object-contain"
            alt=""
            aria-hidden
          />
        </section>
      )}

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

