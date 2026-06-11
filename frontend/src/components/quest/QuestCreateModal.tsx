"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  createQuest,
  generateQuestAiDetails,
  type CreateQuestPayload,
} from "@/lib/api";
import { dailyTimeToIso, localDatetimeToIso } from "@/lib/deadline";
import type { Quest, QuestDifficulty, QuestType } from "@/lib/types";

interface QuestCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (quest: Quest) => void;
}

const QUEST_TYPE_OPTIONS: { value: QuestType; label: string }[] = [
  { value: "main", label: "Главный сюжет" },
  { value: "side", label: "Побочное" },
  { value: "daily", label: "Ежедневное" },
];

const DIFFICULTY_OPTIONS: { value: QuestDifficulty; label: string }[] = [
  { value: "trivial", label: "Пустяк" },
  { value: "normal", label: "Обычный" },
  { value: "hard", label: "Сложный" },
  { value: "legendary", label: "Эпический" },
];

interface QuestFormState extends CreateQuestPayload {
  deadlineLocal: string;
  reminderTime: string;
}

const INITIAL_FORM: QuestFormState = {
  title: "",
  description: "",
  quest_type: "side",
  difficulty: "normal",
  xp_reward: 0,
  gold_reward: 0,
  deadlineLocal: "",
  reminderTime: "",
};

export function QuestCreateModal({
  open,
  onClose,
  onCreated,
}: QuestCreateModalProps) {
  const [form, setForm] = useState<QuestFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const isDaily = form.quest_type === "daily";

  function handleQuestTypeChange(nextType: QuestType) {
    setForm((prev) => {
      if (nextType === "daily" && prev.deadlineLocal) {
        const timePart = prev.deadlineLocal.includes("T")
          ? prev.deadlineLocal.split("T")[1]?.slice(0, 5) ?? ""
          : "";
        return {
          ...prev,
          quest_type: nextType,
          deadlineLocal: "",
          reminderTime: timePart || prev.reminderTime,
        };
      }

      if (nextType !== "daily" && prev.reminderTime) {
        const today = new Date().toISOString().slice(0, 10);
        return {
          ...prev,
          quest_type: nextType,
          deadlineLocal: `${today}T${prev.reminderTime}`,
          reminderTime: "",
        };
      }

      return { ...prev, quest_type: nextType };
    });
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
      const details = await generateQuestAiDetails(title);
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
        deadline:
          form.quest_type === "daily"
            ? dailyTimeToIso(form.reminderTime)
            : localDatetimeToIso(form.deadlineLocal),
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quest-create-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Закрыть"
      />

      <div className="journal-panel relative z-10 w-full max-w-lg p-6 md:p-8">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
            Новая запись в дневнике
          </p>
          <h2
            id="quest-create-title"
            className="mt-1 font-display text-2xl text-ink"
          >
            Добавить квест
          </h2>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                Детали сгенерированы ({aiSource === "openrouter" ? "ИИ" : "шаблон"})
              </p>
            )}
          </Field>

          <Field label="Описание">
            <textarea
              className="journal-input min-h-24 resize-y"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Контекст, лор, детали задания..."
              rows={3}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="grid gap-4 sm:grid-cols-2">
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

          <Field label={isDaily ? "Время оповещения" : "Дедлайн"}>
            {isDaily ? (
              <input
                className="journal-input"
                type="time"
                value={form.reminderTime}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reminderTime: e.target.value }))
                }
              />
            ) : (
              <input
                className="journal-input"
                type="datetime-local"
                value={form.deadlineLocal}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, deadlineLocal: e.target.value }))
                }
              />
            )}
            <p className="mt-1.5 text-xs text-ink-muted">
              {isDaily
                ? "Необязательно. В это время придёт напоминание о ежедневном квесте."
                : "Необязательно. Запустится обратный отсчёт и напоминание за 15 минут до срока."}
            </p>
          </Field>

          {error && (
            <p className="rounded-lg border border-rose-300/50 bg-rose-50/80 px-3 py-2 text-sm text-rose-900">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
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
