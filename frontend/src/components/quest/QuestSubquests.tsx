"use client";

import { useState } from "react";

import type { Quest } from "@/lib/types";

interface QuestSubquestsProps {
  subquests: Quest[];
  isUpdating?: boolean;
  updatingSubquestId?: number | null;
  canEdit?: boolean;
  onAdd?: (title: string) => Promise<void>;
  onToggle?: (subquestId: number) => Promise<void>;
}

export function QuestSubquests({
  subquests,
  isUpdating = false,
  updatingSubquestId = null,
  canEdit = false,
  onAdd,
  onToggle,
}: QuestSubquestsProps) {
  const [newStepTitle, setNewStepTitle] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const showForm = canEdit && onAdd;

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!onAdd || isUpdating) return;

    const title = newStepTitle.trim();
    if (!title) {
      setLocalError("Введите название этапа");
      return;
    }

    setLocalError(null);
    try {
      await onAdd(title);
      setNewStepTitle("");
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "Не удалось добавить этап",
      );
    }
  }

  return (
    <div
      className="quest-subquests mt-4 border-t border-ink/10 pt-4"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="quest-subquests-heading text-xs uppercase tracking-[0.15em] text-ink-muted">
        Этапы задания
        {subquests.length > 0 && (
          <span className="ml-2 font-normal normal-case tracking-normal text-ink/50">
            {subquests.filter((s) => s.status === "completed").length}/
            {subquests.length}
          </span>
        )}
      </p>

      {subquests.length > 0 ? (
        <ul className="quest-subquests-list mt-2 space-y-1">
          {subquests.map((subquest) => {
            const isDone = subquest.status === "completed";
            const isToggling = updatingSubquestId === subquest.id;

            return (
              <li key={subquest.id} className="quest-subquest-item">
                <label
                  className={`quest-subquest-row ${isDone ? "quest-subquest-row-done" : ""} ${
                    canEdit && onToggle ? "cursor-pointer" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    className="quest-subquest-checkbox"
                    checked={isDone}
                    disabled={!canEdit || !onToggle || isUpdating || isToggling}
                    onChange={() => onToggle?.(subquest.id)}
                  />
                  <span
                    className={`quest-subquest-title ${isDone ? "quest-subquest-title-done" : ""}`}
                  >
                    {subquest.title}
                  </span>
                  {isToggling && (
                    <span className="quest-subquest-spinner text-ink-muted">
                      …
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-xs italic text-ink-muted">
          Этапов пока нет — добавьте первый шаг ниже.
        </p>
      )}

      {showForm && (
        <form className="quest-subquests-form mt-3" onSubmit={handleAdd}>
          <input
            type="text"
            className="quest-subquests-input"
            value={newStepTitle}
            onChange={(e) => {
              setNewStepTitle(e.target.value);
              setLocalError(null);
            }}
            placeholder="Новый этап..."
            disabled={isUpdating}
            maxLength={200}
          />
          <button
            type="submit"
            className="quest-subquests-add"
            disabled={isUpdating || !newStepTitle.trim()}
            aria-label="Добавить этап"
            title="Добавить этап"
          >
            +
          </button>
        </form>
      )}

      {localError && (
        <p className="mt-2 text-xs text-rose-800">{localError}</p>
      )}
    </div>
  );
}
