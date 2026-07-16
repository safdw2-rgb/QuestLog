"use client";

import { useEffect } from "react";

import { HeroCardContent } from "@/components/adventurer/HeroCardContent";
import { MentorshipPanel } from "@/components/mentor/MentorshipPanel";
import type { Adventurer, Faction, MentorStudent } from "@/lib/types";

interface HeroCharacterModalProps {
  open: boolean;
  adventurer: Adventurer;
  factions: Faction[];
  editMode: boolean;
  selectedFactionId?: number | null;
  onFactionFilterToggle?: (factionId: number) => void;
  onClose: () => void;
  onAdventurerUpdate: (adventurer: Adventurer) => void;
  onFactionsChange: () => Promise<void>;
  onMentorStudentsChange?: (students: MentorStudent[]) => void;
}

export function HeroCharacterModal({
  open,
  adventurer,
  factions,
  editMode,
  selectedFactionId = null,
  onFactionFilterToggle,
  onClose,
  onAdventurerUpdate,
  onFactionsChange,
  onMentorStudentsChange,
}: HeroCharacterModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="quest-create-overlay fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden p-0 sm:items-center sm:p-4 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hero-card-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Закрыть"
      />

      <div className="hero-character-panel journal-panel relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-parchment">
        <header className="shrink-0 border-b border-ink/10 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
            Карточка персонажа
          </p>
          <h2 id="hero-card-title" className="mt-1 font-display text-2xl text-ink">
            {adventurer.display_name}
          </h2>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-5 py-4">
          <HeroCardContent
            adventurer={adventurer}
            factions={factions}
            editMode={editMode}
            selectedFactionId={selectedFactionId}
            onFactionFilterToggle={
              onFactionFilterToggle
                ? (factionId) => {
                    onFactionFilterToggle(factionId);
                    onClose();
                  }
                : undefined
            }
            onAdventurerUpdate={onAdventurerUpdate}
            onFactionsChange={onFactionsChange}
          />
          <MentorshipPanel
            inviteCode={adventurer.invite_code}
            onStudentsChange={onMentorStudentsChange}
          />
        </div>

        <footer className="shrink-0 border-t border-ink/10 px-5 py-3">
          <button
            type="button"
            className="journal-button-secondary w-full"
            onClick={onClose}
          >
            Закрыть
          </button>
        </footer>
      </div>
    </div>
  );
}
