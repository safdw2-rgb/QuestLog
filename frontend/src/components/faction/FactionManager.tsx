"use client";

import { FormEvent, useState } from "react";

import { createFaction, updateFaction } from "@/lib/api";
import { JournalSectionTitle } from "@/components/layout/JournalSectionTitle";
import { getReputationLevel } from "@/lib/faction-reputation";
import { resolveFactionIcon, resolveFactionIconFromForm } from "@/lib/faction-utils";
import type { Faction } from "@/lib/types";

interface FactionManagerProps {
  factions: Faction[];
  editMode: boolean;
  selectedFactionId?: number | null;
  onFactionFilterToggle?: (factionId: number) => void;
  onFactionsChange: () => Promise<void>;
  title?: string;
}

interface FactionFormState {
  name: string;
  icon: string;
}

const EMPTY_FORM: FactionFormState = { name: "", icon: "" };

export function FactionManager({
  factions,
  editMode,
  selectedFactionId = null,
  onFactionFilterToggle,
  onFactionsChange,
  title = "Репутация на этой неделе",
}: FactionManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaction, setEditingFaction] = useState<Faction | null>(null);
  const [form, setForm] = useState<FactionFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreateModal() {
    setEditingFaction(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(faction: Faction) {
    setEditingFaction(faction);
    setForm({
      name: faction.name,
      icon: faction.icon ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingFaction(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Название фракции обязательно");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const icon = resolveFactionIconFromForm(name, form.icon);
      if (editingFaction) {
        await updateFaction(editingFaction.id, { name, icon });
      } else {
        await createFaction({ name, icon });
      }
      await onFactionsChange();
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить фракцию");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section>
        <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
          <JournalSectionTitle as="h3" className="min-w-0 flex-1">
            {title}
          </JournalSectionTitle>
          {editMode && (
            <button
              type="button"
              className="faction-add-button"
              onClick={openCreateModal}
              aria-label="Создать фракцию"
              title="Создать фракцию"
            >
              +
            </button>
          )}
        </div>

        {factions.length === 0 ? (
          <p className="mt-1.5 text-xs text-[#4a3224]">
            Фракций пока нет.
            {editMode ? " Нажмите +, чтобы создать." : ""}
          </p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {factions.map((faction) => {
              const icon = resolveFactionIcon(faction);
              const REP_MAX = 50;
              const repPct = Math.max(
                0,
                Math.min(100, (faction.reputation_points / REP_MAX) * 100),
              );
              const isSelected = selectedFactionId === faction.id;

              return (
                <li key={faction.id}>
                  <div
                    className={`faction-row flex items-start gap-1 px-1.5 py-1 text-xs ${
                      isSelected ? "faction-row-selected" : ""
                    } ${onFactionFilterToggle ? "faction-row-interactive" : ""}`}
                  >
                    <button
                      type="button"
                      className="faction-row-button min-w-0 flex-1 text-left"
                      onClick={() => onFactionFilterToggle?.(faction.id)}
                      aria-pressed={isSelected}
                      title={
                        isSelected
                          ? "Сбросить фильтр фракции"
                          : `Показать только «${faction.name}»`
                      }
                      disabled={!onFactionFilterToggle}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="min-w-0 truncate">
                          {icon ? `${icon} ` : ""}
                          {faction.name}
                        </span>
                        <span className="shrink-0 text-[10px] text-[#4a3224]/80">
                          {getReputationLevel(faction.reputation_points)}
                        </span>
                      </div>
                      <div
                        className="rpg-faction-bar-bg mt-0.5"
                        role="progressbar"
                        aria-valuenow={Math.round(repPct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Репутация ${faction.name}: ${faction.reputation_points} очков`}
                      >
                        <div
                          className="rpg-faction-bar-fill"
                          style={{
                            clipPath: `inset(0 ${100 - repPct}% 0 0)`,
                          }}
                        />
                      </div>
                    </button>
                    {editMode && (
                      <button
                        type="button"
                        className="faction-edit-button mt-0.5 shrink-0"
                        onClick={() => openEditModal(faction)}
                        aria-label={`Редактировать ${faction.name}`}
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {modalOpen && editMode && (
        <div
          className="quest-create-overlay fixed inset-0 z-[60] flex items-end justify-center overflow-x-hidden p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            onClick={closeModal}
            aria-label="Закрыть"
          />
          <div className="quest-modal-panel journal-panel relative z-10 w-full max-w-md overflow-x-hidden rounded-t-2xl bg-parchment p-5 sm:rounded-xl">
            <h3 className="font-display text-xl text-ink">
              {editingFaction ? "Редактировать фракцию" : "Новая фракция"}
            </h3>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-wide text-ink-muted">
                  Название
                </span>
                <input
                  className="journal-input"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  maxLength={64}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-wide text-ink-muted">
                  Эмодзи фракции
                </span>
                <input
                  className="journal-input"
                  value={form.icon}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, icon: e.target.value }))
                  }
                  maxLength={8}
                  placeholder="⚔️"
                />
                <p className="mt-1 text-xs text-ink-muted">
                  Один эмодзи. Если пусто — возьмём первый из названия.
                </p>
              </label>
              {error && (
                <p className="rounded-lg border border-rose-300/50 bg-rose-50/80 px-3 py-2 text-sm text-rose-900">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="journal-button-secondary"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="journal-button-primary"
                  disabled={submitting}
                >
                  {submitting ? "Сохраняем..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
