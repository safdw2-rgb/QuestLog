"use client";

import { FormEvent, useState } from "react";

import { createFaction, updateFaction } from "@/lib/api";
import { getReputationLevel } from "@/lib/faction-reputation";
import { resolveFactionIcon, resolveFactionIconFromForm } from "@/lib/faction-utils";
import type { Faction } from "@/lib/types";

interface FactionManagerProps {
  factions: Faction[];
  editMode: boolean;
  onFactionsChange: () => Promise<void>;
}

interface FactionFormState {
  name: string;
  icon: string;
}

const EMPTY_FORM: FactionFormState = { name: "", icon: "" };

export function FactionManager({
  factions,
  editMode,
  onFactionsChange,
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs uppercase tracking-wide text-ink-muted">
            Репутация фракций
          </h3>
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
          <p className="mt-2 text-sm text-ink-muted">
            Фракций пока нет.
            {editMode ? " Нажмите +, чтобы создать." : ""}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {factions.map((faction) => {
              const icon = resolveFactionIcon(faction);
              return (
                <li
                  key={faction.id}
                  className="flex items-center justify-between rounded-lg border border-ink/10 bg-parchment-dark/30 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {icon ? `${icon} ` : ""}
                    {faction.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {editMode && (
                      <button
                        type="button"
                        className="faction-edit-button"
                        onClick={() => openEditModal(faction)}
                        aria-label={`Редактировать ${faction.name}`}
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                    )}
                    <span className="text-xs text-ink-muted">
                      {getReputationLevel(faction.reputation_points)} ·{" "}
                      {faction.reputation_points}
                    </span>
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
          <div className="journal-panel relative z-10 w-full max-w-md overflow-x-hidden rounded-t-2xl p-5 sm:rounded-xl">
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
