"use client";

import { FormEvent, useEffect, useState } from "react";

import { LocationPickerMiniMap } from "@/components/map/LocationPickerMiniMap";
import { updateQuest } from "@/lib/api";
import {
  dailyTimeToIso,
  isoToDailyTime,
  isoToDatetimeLocal,
  localDatetimeToIso,
} from "@/lib/deadline";
import type { Faction, Quest, QuestUpdateResult } from "@/lib/types";
import { DEADLINE_RESCHEDULE_COST } from "@/lib/types";

interface QuestEditModalProps {
  open: boolean;
  quest: Quest | null;
  factions: Faction[];
  adventurerGold: number;
  onClose: () => void;
  onUpdated: (result: QuestUpdateResult) => void;
}

interface EditFormState {
  title: string;
  description: string;
  factionId: string;
  deadlineLocal: string;
  reminderLocal: string;
  reminderTime: string;
  latitude: number | null;
  longitude: number | null;
}

function questToForm(quest: Quest): EditFormState {
  const isDaily = quest.quest_type === "daily";
  return {
    title: quest.title,
    description: quest.description ?? "",
    factionId: quest.faction_id ? String(quest.faction_id) : "",
    deadlineLocal: quest.deadline ? isoToDatetimeLocal(quest.deadline) : "",
    reminderLocal:
      !isDaily && quest.reminder_time
        ? isoToDatetimeLocal(quest.reminder_time)
        : "",
    reminderTime:
      isDaily && quest.reminder_time
        ? isoToDailyTime(quest.reminder_time)
        : "",
    latitude: quest.latitude,
    longitude: quest.longitude,
  };
}

export function QuestEditModal({
  open,
  quest,
  factions,
  adventurerGold,
  onClose,
  onUpdated,
}: QuestEditModalProps) {
  const [form, setForm] = useState<EditFormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open && quest) {
      setForm(questToForm(quest));
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(timer);
  }, [open, quest]);

  useEffect(() => {
    if (!mounted) {
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
  }, [mounted, onClose]);

  if (!mounted || !quest || !form) {
    return null;
  }

  const isDaily = quest.quest_type === "daily";
  const originalDeadlineDate = quest.deadline
    ? isoToDatetimeLocal(quest.deadline).slice(0, 10)
    : "";
  const newDeadlineDate = form.deadlineLocal.slice(0, 10);
  const deadlineDateWillChange =
    !isDaily &&
    originalDeadlineDate !== newDeadlineDate &&
    Boolean(originalDeadlineDate || newDeadlineDate);
  const canAffordReschedule = adventurerGold >= DEADLINE_RESCHEDULE_COST;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form!.title.trim();
    if (!title) {
      setError("Название квеста обязательно");
      return;
    }

    if (deadlineDateWillChange && !canAffordReschedule) {
      setError(
        `Недостаточно золота для переноса дедлайна (нужно ${DEADLINE_RESCHEDULE_COST} 🪙)`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await updateQuest(quest!.id, {
        title,
        description: form!.description.trim() || null,
        faction_id: form!.factionId ? Number(form!.factionId) : null,
        latitude: form!.latitude,
        longitude: form!.longitude,
        deadline: isDaily ? null : localDatetimeToIso(form!.deadlineLocal),
        reminder_time: isDaily
          ? dailyTimeToIso(form!.reminderTime)
          : localDatetimeToIso(form!.reminderLocal),
      });
      onUpdated(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить квест");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="quest-create-overlay fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quest-edit-title"
    >
      <button
        type="button"
        className={`absolute inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-label="Закрыть"
      />

      <div
        className={`quest-create-panel journal-panel relative z-10 flex w-full max-w-lg flex-col overflow-x-hidden overflow-y-hidden rounded-t-2xl transition-transform duration-300 sm:max-h-[90vh] sm:rounded-xl sm:transition-none ${
          visible ? "translate-y-0" : "translate-y-full sm:translate-y-0"
        }`}
      >
        <header className="shrink-0 border-b border-ink/10 px-4 py-3 md:px-8 md:py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
            Редактирование записи
          </p>
          <h2
            id="quest-edit-title"
            className="mt-0.5 font-display text-xl text-ink md:text-2xl"
          >
            ✏️ Редактировать квест
          </h2>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="quest-create-body min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-4 py-3 md:space-y-4 md:px-8 md:py-5">
            <Field label="Название" required>
              <input
                className="journal-input"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) =>
                    prev ? { ...prev, title: e.target.value } : prev,
                  )
                }
                maxLength={200}
                required
              />
            </Field>

            <Field label="Описание">
              <textarea
                className="journal-input min-h-20 resize-y"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev,
                  )
                }
                rows={3}
              />
            </Field>

            <Field label="Фракция">
              <select
                className="journal-input"
                value={form.factionId}
                onChange={(e) =>
                  setForm((prev) =>
                    prev ? { ...prev, factionId: e.target.value } : prev,
                  )
                }
              >
                <option value="">Без фракции</option>
                {factions.map((faction) => (
                  <option key={faction.id} value={String(faction.id)}>
                    {faction.icon ? `${faction.icon} ` : ""}
                    {faction.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Локация на карте">
              <LocationPickerMiniMap
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(latitude, longitude) =>
                  setForm((prev) =>
                    prev ? { ...prev, latitude, longitude } : prev,
                  )
                }
              />
            </Field>

            {isDaily ? (
              <Field label="Время оповещения">
                <input
                  className="journal-input"
                  type="time"
                  value={form.reminderTime}
                  onChange={(e) =>
                    setForm((prev) =>
                      prev ? { ...prev, reminderTime: e.target.value } : prev,
                    )
                  }
                />
              </Field>
            ) : (
              <>
                <Field label="Дедлайн">
                  <input
                    className="journal-input"
                    type="datetime-local"
                    value={form.deadlineLocal}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, deadlineLocal: e.target.value }
                          : prev,
                      )
                    }
                  />
                  {deadlineDateWillChange && (
                    <p className="mt-1.5 text-xs text-amber-900/80">
                      Смена даты дедлайна спишет {DEADLINE_RESCHEDULE_COST} 🪙
                      {!canAffordReschedule && " — недостаточно золота"}
                    </p>
                  )}
                </Field>

                <Field label="Будильник">
                  <input
                    className="journal-input"
                    type="datetime-local"
                    value={form.reminderLocal}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? { ...prev, reminderLocal: e.target.value }
                          : prev,
                      )
                    }
                  />
                </Field>
              </>
            )}

            {error && (
              <p className="rounded-lg border border-rose-300/50 bg-rose-50/80 px-3 py-2 text-sm text-rose-900">
                {error}
              </p>
            )}
          </div>

          <div className="quest-create-footer shrink-0 flex flex-wrap justify-end gap-2 border-t border-ink/10 bg-parchment/95 px-4 py-3 backdrop-blur-sm md:px-8">
            <button
              type="button"
              className="journal-button-secondary"
              onClick={onClose}
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
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wide text-ink-muted">
        {label}
        {required && <span className="text-gold"> *</span>}
      </span>
      {children}
    </label>
  );
}
