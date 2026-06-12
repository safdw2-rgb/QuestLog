"use client";

import { useEffect, useRef, useState } from "react";

import { HeroCardContent } from "@/components/adventurer/HeroCardContent";
import { HeroCharacterModal } from "@/components/adventurer/HeroCharacterModal";
import { generateAdventurerLore } from "@/lib/api";
import type { Adventurer, Faction } from "@/lib/types";

interface HeroPanelProps {
  adventurer: Adventurer;
  factions: Faction[];
  editMode: boolean;
  adventurerId?: number;
  onAdventurerUpdate: (adventurer: Adventurer) => void;
  onFactionsChange: () => Promise<void>;
}

export function HeroPanel({
  adventurer,
  factions,
  editMode,
  adventurerId = 1,
  onAdventurerUpdate,
  onFactionsChange,
}: HeroPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [generatingLore, setGeneratingLore] = useState(false);
  const loreRequestedRef = useRef(false);

  useEffect(() => {
    if (loreRequestedRef.current) {
      return;
    }

    loreRequestedRef.current = true;
    let cancelled = false;
    setGeneratingLore(true);

    generateAdventurerLore(adventurerId)
      .then((updated) => {
        if (!cancelled) {
          onAdventurerUpdate(updated);
        }
      })
      .catch(() => {
        // оставляем текущий лор
      })
      .finally(() => {
        if (!cancelled) {
          setGeneratingLore(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [adventurerId, onAdventurerUpdate]);

  return (
    <>
      <aside className="hero-panel-compact journal-panel px-4 py-3 md:hidden">
        <button
          type="button"
          className="hero-name-button w-full text-left"
          onClick={() => setModalOpen(true)}
          aria-haspopup="dialog"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Искатель приключений
          </p>
          <h2 className="mt-0.5 font-display text-xl text-ink transition hover:text-gold">
            {adventurer.display_name}
          </h2>
        </button>
      </aside>

      <aside className="hero-panel-expanded journal-panel hidden p-5 md:block">
        <HeroCardContent
          adventurer={adventurer}
          factions={factions}
          editMode={editMode}
          adventurerId={adventurerId}
          generatingLore={generatingLore}
          onAdventurerUpdate={onAdventurerUpdate}
          onFactionsChange={onFactionsChange}
          compactLore
        />
      </aside>

      <HeroCharacterModal
        open={modalOpen}
        adventurer={adventurer}
        factions={factions}
        editMode={editMode}
        adventurerId={adventurerId}
        onClose={() => setModalOpen(false)}
        onAdventurerUpdate={onAdventurerUpdate}
        onFactionsChange={onFactionsChange}
      />
    </>
  );
}
