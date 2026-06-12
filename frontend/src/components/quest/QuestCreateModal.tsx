"use client";

import { FormEvent, useEffect, useState } from "react";

import { LocationPickerMiniMap } from "@/components/map/LocationPickerMiniMap";
import {
  createQuest,
  generateQuestAiDetails,
  type CreateQuestPayload,
} from "@/lib/api";
import { dailyTimeToIso, localDatetimeToIso } from "@/lib/deadline";
import { DIFFICULTY_LEVELS, formatDifficultyLabel } from "@/lib/difficulty";
import type { Faction, Quest, QuestDifficulty, QuestType } from "@/lib/types";

interface QuestCreateModalProps {
  open: boolean;
  factions: Faction[];
  onClose: () => void;
  onCreated: (quest: Quest) => void;
}

const QUEST_TYPE_OPTIONS: { value: QuestType; label: string }[] = [
  { value: "main", label: "Главный сюжет" },
  { value: "side", label: "Побочное" },
  { value: "daily", label: "Ежедневное" },
];

const DIFFICULTY_OPTIONS = DIFFICULTY_LEVELS.map((level) => ({
  value: level.value,
  label: formatDifficultyLabel(level.value),
}));

interface QuestFormState extends CreateQuestPayload {
  deadlineLocal: string;
  reminderLocal: string;
  reminderTime: string;
  factionId: string;
}

const INITIAL_FORM: QuestFormState = {
  title: "",
  description: "",
  quest_type: "side",
  difficulty: "normal",
  xp_reward: 0,
  gold_reward: 0,
  deadlineLocal: "",
  reminderLocal: "",
  reminderTime: "",
  latitude: null,
  longitude: null,
  factionId: "",
};

export function QuestCreateModal({
  open,
  factions,
  onClose,
  onCreated,
}: QuestCreateModalProps) {
  const [form, setForm] = useState<QuestFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(timer);
  }, [open]);

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

  if (!mounted) {
    return null;
  }

  const isDaily = form.quest_type === "daily";

  function handleQuestTypeChange(nextType: QuestType) {
    setForm((prev) => ({ ...prev, quest_type: nextType }));
  }

  async function handleGenerateAi() {
    const title = form.title.trim();
    if (!title) {
      setError("Сначала введите название квеста");
      return;
    }

    setError(null);
    setGenerating(true);
    setAiSource(null);

    try {
      const details = await generateQuestAiDetails({
        title,
        latitude: form.latitude,
        longitude: form.longitude,
      });
      setForm((prev) => ({
        ...prev,
        description: details.description,
        quest_type: details.quest_type,
        difficulty: details.difficulty,
        xp_reward: details.xp_reward,
        gold_reward: details.gold_reward,
      }));
      setAiSource(details.source);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось сгенерировать детали",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const title = form.title.trim();
    if (!title) {
      setError("Название квеста обязательно");
      return;
    }

    setSubmitting(true);
    try {
      const quest = await createQuest({
        title,
        description: form.description,
        quest_type: form.quest_type,
        difficulty: form.difficulty,
        xp_reward: form.xp_reward,
        gold_reward: form.gold_reward,
        deadline: isDaily ? null : localDatetimeToIso(form.deadlineLocal),
        reminder_time: isDaily
          ? dailyTimeToIso(form.reminderTime)
          : localDatetimeToIso(form.reminderLocal),
        latitude: form.latitude,
        longitude: form.longitude,
        faction_id: form.factionId ? Number(form.factionId) : null,
      });
      setForm(INITIAL_FORM);
      onCreated(quest);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать квест");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="quest-create-overlay fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quest-create-title"
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
            Новая запись в дневнике
          </p>
          <h2
            id="quest-create-title"
            className="mt-0.5 font-display text-xl text-ink md:mt-1 md:text-2xl"
          >
            Добавить квест
          </h2>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="quest-create-body min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto px-4 py-3 md:space-y-4 md:px-8 md:py-5">
          <Field label="Название" required>
            <div className="flex gap-2">
              <input
                className="journal-input min-w-0 flex-1"
                type="text"
                value={form.title}
                onChange={(e) => {
                  setAiSource(null);
                  setForm((prev) => ({ ...prev, title: e.target.value }));
                }}
                placeholder="Починить ворота деревни"
                maxLength={200}
                required
              />
              <button
                type="button"
                className="journal-button-magic shrink-0"
                onClick={handleGenerateAi}
                disabled={generating || submitting}
                title="Сгенерировать детали через ИИ"
              >
                {generating ? (
                  <span className="text-xs">…</span>
                ) : (
                  <span aria-hidden>✨</span>
                )}
                <span className="sr-only">Сгенерировать детали через ИИ</span>
              </button>
            </div>
            {aiSource && (
              <p className="mt-1.5 text-xs text-ink-muted">
                Детали сгенерированы ({aiSource === "gemini" ? "Gemini" : "шаблон"})
              </p>
            )}
          </Field>

          <Field label="Описание">
            <textarea
              className="journal-input min-h-[4.5rem] resize-y md:min-h-24"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Контекст, лор, детали задания..."
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <Field label="Тип квеста">
              <select
                className="journal-input"
                value={form.quest_type}
                onChange={(e) =>
                  handleQuestTypeChange(e.target.value as QuestType)
                }
              >
                {QUEST_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Сложность">
              <select
                className="journal-input"
                value={form.difficulty}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    difficulty: e.target.value as QuestDifficulty,
                  }))
                }
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <Field label="Награда XP">
              <input
                className="journal-input"
                type="number"
                min={0}
                value={form.xp_reward}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    xp_reward: Number(e.target.value) || 0,
                  }))
                }
              />
            </Field>

            <Field label="Награда золотом">
              <input
                className="journal-input"
                type="number"
                min={0}
                value={form.gold_reward}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gold_reward: Number(e.target.value) || 0,
                  }))
                }
              />
            </Field>
          </div>

          <Field label="Фракция">
            <select
              className="journal-input"
              value={form.factionId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, factionId: e.target.value }))
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
              latitude={form.latitude ?? null}
              longitude={form.longitude ?? null}
              onChange={(latitude, longitude) =>
                setForm((prev) => ({ ...prev, latitude, longitude }))
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
                  setForm((prev) => ({ ...prev, reminderTime: e.target.value }))
                }
              />
              <p className="mt-1.5 text-xs text-ink-muted">
                Необязательно. В это время придёт напоминание о ежедневном квесте.
              </p>
            </Field>
          ) : (
            <>
              <Field label="Дедлайн">
                <input
                  className="journal-input"
                  type="datetime-local"
                  value={form.deadlineLocal}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      deadlineLocal: e.target.value,
                    }))
                  }
                />
                <p className="mt-1.5 text-xs text-ink-muted">
                  Необязательно. Когда квест сгорает — запустится обратный отсчёт
                  и предупреждение за 15 минут.
                </p>
              </Field>

              <Field label="Поставить будильник (приступить к задаче)">
                <input
                  className="journal-input"
                  type="datetime-local"
                  value={form.reminderLocal}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      reminderLocal: e.target.value,
                    }))
                  }
                />
                <p className="mt-1.5 text-xs text-ink-muted">
                  Необязательно. Напоминание, когда пора начать выполнение.
                </p>
              </Field>
            </>
          )}

          {error && (
            <p className="rounded-lg border border-rose-300/50 bg-rose-50/80 px-3 py-2 text-sm text-rose-900">
              {error}
            </p>
          )}
          </div>

          <div className="quest-create-footer shrink-0 flex flex-wrap justify-end gap-2 border-t border-ink/10 bg-parchment/95 px-4 py-3 backdrop-blur-sm sm:bg-parchment md:px-8">
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
              {submitting ? "Создаём..." : "Создать квест"}
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
