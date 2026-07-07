"use client";

import { useState } from "react";

import { HeroCardContent } from "@/components/adventurer/HeroCardContent";
import { HeroCharacterModal } from "@/components/adventurer/HeroCharacterModal";
import { MentorshipPanel } from "@/components/mentor/MentorshipPanel";
import type { Adventurer, Faction, MentorStudent } from "@/lib/types";

interface HeroPanelProps {
  adventurer: Adventurer;
  factions: Faction[];
  editMode: boolean;
  onAdventurerUpdate: (adventurer: Adventurer) => void;
  onFactionsChange: () => Promise<void>;
  onMentorStudentsChange?: (students: MentorStudent[]) => void;
}

export function HeroPanel({
  adventurer,
  factions,
  editMode,
  onAdventurerUpdate,
  onFactionsChange,
  onMentorStudentsChange,
}: HeroPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="w-full min-w-0 box-border">
      <aside className="hero-panel-compact h-auto overflow-visible lg:hidden">
        <button
          type="button"
          className="hero-name-button w-full text-left"
          onClick={() => setModalOpen(true)}
          aria-haspopup="dialog"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Искатель приключений
          </p>
          <h2 className="mt-0.5 font-display text-xl text-[#3a2214] transition hover:text-[#8b6914]">
            {adventurer.display_name}
          </h2>
        </button>
      </aside>

      <aside className="hero-panel-expanded hidden min-h-0 lg:block">
        <HeroCardContent
          adventurer={adventurer}
          factions={factions}
          editMode={editMode}
          onAdventurerUpdate={onAdventurerUpdate}
          onFactionsChange={onFactionsChange}
        />
      </aside>

      <div className="mt-2 hidden lg:block">
        <MentorshipPanel
          inviteCode={adventurer.invite_code}
          onStudentsChange={onMentorStudentsChange}
        />
      </div>

      <HeroCharacterModal
        open={modalOpen}
        adventurer={adventurer}
        factions={factions}
        editMode={editMode}
        onClose={() => setModalOpen(false)}
        onAdventurerUpdate={onAdventurerUpdate}
        onFactionsChange={onFactionsChange}
        onMentorStudentsChange={onMentorStudentsChange}
      />
    </div>
  );
}
