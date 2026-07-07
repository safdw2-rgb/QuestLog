"use client";

import { FormEvent, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const LocationPickerMiniMap = dynamic(
  () =>
    import("@/components/map/LocationPickerMiniMap").then(
      (m) => m.LocationPickerMiniMap,
    ),
  { ssr: false },
);
import { improveQuestAiDetails, updateQuest } from "@/lib/api";
import { SYS_ICON } from "@/lib/rpg-assets";
import {
  dailyTimeToIso,
  isoToDailyTime,
  isoToDatetimeLocal,
  localDatetimeToIso,
} from "@/lib/deadline";
import type { Faction, Quest, QuestFrequency, QuestUpdateResult } from "@/lib/types";
import {
  DEFAULT_QUEST_FREQUENCY,
  QUEST_FREQUENCY_OPTIONS,
} from "@/lib/quest-frequency";
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
  frequency: QuestFrequency;
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
    frequency: quest.frequency ?? DEFAULT_QUEST_FREQUENCY,
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
  const [improving, setImproving] = useState(false);
  const [aiSource, setAiSource] = useState<string | null>(null);
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

  async function handleImproveWithAi() {
    if (!form || improving) {
      return;
    }

    const title = form.title.trim();
    if (!title) {
      setError("Сначала укажите название квеста");
      return;
    }

    setImproving(true);
    setError(null);
    setAiSource(null);

    try {
      const result = await improveQuestAiDetails(
        title,
        form.description,
        form.factionId ? Number(form.factionId) : null,
      );
      setForm((prev) =>
        prev
          ? {
              ...prev,
              title: result.title.trim(),
              description: result.description.trim(),
            }
          : prev,
      );
      setAiSource(result.source);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось улучшить квест с помощью ИИ",
      );
    } finally {
      setImproving(false);
    }
  }

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
        frequency: isDaily ? form!.frequency : undefined,
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

      {/* ─── Elastic parchment panel — stretches cleanly to any height ─── */}
      <div
        className={`quest-create-panel rpg-elastic-panel relative z-10 w-full max-w-lg overflow-hidden p-6 transition-transform duration-300 sm:transition-none ${
          visible ? "translate-y-0" : "translate-y-full sm:translate-y-0"
        }`}
      >
        {/* Close button — top right corner */}
        <button
          type="button"
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center opacity-70 transition hover:opacity-100"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <img src={SYS_ICON.xCircle} alt="" width={22} height={22} style={{ imageRendering: 'pixelated' }} />
        </button>

        {/* Title on parchment — dark ink */}
        <div className="mb-3 pr-8">
          <p className="text-xs uppercase tracking-[0.25em] text-[#4a3224]/60">
            Редактирование записи
          </p>
          <h2
            id="quest-edit-title"
            className="font-display text-xl tracking-wide text-[#3a2214]"
          >
            ✏️ Редактировать квест
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Scrollable form body ── */}
          <div
            className="overflow-y-auto space-y-3 bg-transparent pr-1"
            style={{ maxHeight: '50vh' }}
          >
            <Field label="Название" required>
              <input
                className="journal-input"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => prev ? { ...prev, title: e.target.value } : prev)
                }
                maxLength={200}
                required
              />
            </Field>

            <Field label="Описание">
              <textarea
                className="journal-input resize-y"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => prev ? { ...prev, description: e.target.value } : prev)
                }
                rows={2}
              />
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="journal-button-secondary text-xs"
                  onClick={handleImproveWithAi}
                  disabled={submitting || improving}
                >
                  <img src={SYS_ICON.sparkles} alt="" width={16} height={16} style={{ imageRendering: 'pixelated', display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} aria-hidden />
                  {improving ? "ИИ думает..." : "Улучшить с помощью ИИ"}
                </button>
                {aiSource && (
                  <span className="text-[10px] uppercase tracking-wide text-ink-muted">
                    источник: {aiSource}
                  </span>
                )}
              </div>
            </Field>

            <Field label="Фракция">
              <select
                className="journal-input"
                value={form.factionId}
                onChange={(e) =>
                  setForm((prev) => prev ? { ...prev, factionId: e.target.value } : prev)
                }
              >
                <option value="">Без фракции</option>
                {factions.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.icon ? `${f.icon} ` : ""}{f.name}
                  </option>
                ))}
              </select>
            </Field>

            {isDaily ? (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Периодичность">
                  <select
                    className="journal-input"
                    value={form.frequency}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, frequency: e.target.value as QuestFrequency } : prev
                      )
                    }
                  >
                    {QUEST_FREQUENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Время оповещения">
                  <input
                    className="journal-input"
                    type="time"
                    value={form.reminderTime}
                    onChange={(e) =>
                      setForm((prev) => prev ? { ...prev, reminderTime: e.target.value } : prev)
                    }
                  />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Дедлайн">
                  <input
                    className="journal-input"
                    type="datetime-local"
                    value={form.deadlineLocal}
                    onChange={(e) =>
                      setForm((prev) => prev ? { ...prev, deadlineLocal: e.target.value } : prev)
                    }
                  />
                  {deadlineDateWillChange && (
                    <p className="mt-1 text-xs text-amber-900/80">
                      Смена даты спишет {DEADLINE_RESCHEDULE_COST} 🪙
                      {!canAffordReschedule && " — мало золота"}
                    </p>
                  )}
                </Field>
                <Field label="Будильник">
                  <input
                    className="journal-input"
                    type="datetime-local"
                    value={form.reminderLocal}
                    onChange={(e) =>
                      setForm((prev) => prev ? { ...prev, reminderLocal: e.target.value } : prev)
                    }
                  />
                </Field>
              </div>
            )}

            <Field label="Локация на карте">
              <LocationPickerMiniMap
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(latitude, longitude) =>
                  setForm((prev) => prev ? { ...prev, latitude, longitude } : prev)
                }
              />
            </Field>

            {error && (
              <p className="rounded border border-rose-300/50 bg-rose-50/80 px-3 py-1.5 text-sm text-rose-900">
                {error}
              </p>
            )}
          </div>

          {/* ── Footer buttons ── */}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="rpg-game-button"
              onClick={onClose}
              disabled={submitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rpg-game-button"
              disabled={submitting}
            >
              {submitting ? "Сохраняем..." : "⚔ Сохранить"}
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
