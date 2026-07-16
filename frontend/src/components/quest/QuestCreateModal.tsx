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
import {
  createQuest,
  generateQuestAiDetails,
  type CreateQuestPayload,
} from "@/lib/api";
import { SYS_ICON } from "@/lib/rpg-assets";
import { dailyTimeToIso, localDatetimeToIso } from "@/lib/deadline";
import {
  DIFFICULTY_LEVELS,
  formatDifficultyLabel,
  getDifficultyLevel,
} from "@/lib/difficulty";
import type {
  Faction,
  MentorStudent,
  Quest,
  QuestDifficulty,
  QuestFrequency,
  QuestType,
} from "@/lib/types";
import {
  DEFAULT_QUEST_FREQUENCY,
  QUEST_FREQUENCY_OPTIONS,
} from "@/lib/quest-frequency";

interface QuestCreateModalProps {
  open: boolean;
  factions: Faction[];
  students?: MentorStudent[];
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

function rewardForDifficulty(difficulty: QuestDifficulty): { xp: number; gold: number } {
  const level = getDifficultyLevel(difficulty);
  return { xp: level.baseXp, gold: level.baseGold };
}

interface QuestFormState extends CreateQuestPayload {
  deadlineLocal: string;
  reminderLocal: string;
  reminderTime: string;
  factionId: string;
  assigneeId: string;
}

const INITIAL_FORM: QuestFormState = {
  title: "",
  description: "",
  quest_type: "side",
  difficulty: "normal",
  frequency: DEFAULT_QUEST_FREQUENCY,
  xp_reward: rewardForDifficulty("normal").xp,
  gold_reward: rewardForDifficulty("normal").gold,
  deadlineLocal: "",
  reminderLocal: "",
  reminderTime: "",
  latitude: null,
  longitude: null,
  factionId: "",
  assigneeId: "",
};

export function QuestCreateModal({
  open,
  factions,
  students = [],
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
  const isSelfAssigned = form.assigneeId === "";
  const activeDifficultyLevel = getDifficultyLevel(form.difficulty);

  function handleQuestTypeChange(nextType: QuestType) {
    setForm((prev) => ({
      ...prev,
      quest_type: nextType,
      frequency:
        nextType === "daily" ? prev.frequency ?? DEFAULT_QUEST_FREQUENCY : DEFAULT_QUEST_FREQUENCY,
    }));
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
        faction_id: form.factionId ? Number(form.factionId) : null,
      });
      setForm((prev) => ({
        ...prev,
        description: details.description,
        quest_type: details.quest_type,
        difficulty: details.difficulty,
        xp_reward: rewardForDifficulty(details.difficulty).xp,
        gold_reward: rewardForDifficulty(details.difficulty).gold,
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
        assigned_to_id: form.assigneeId ? Number(form.assigneeId) : null,
        frequency: isDaily ? form.frequency : DEFAULT_QUEST_FREQUENCY,
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
      className="quest-create-overlay fixed inset-0 z-50 flex items-end justify-center overflow-hidden p-0 sm:items-center sm:p-4"
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

      {/* ─── Elastic parchment panel — narrow scroll-like column, stretches cleanly to any height ─── */}
      <div
        className={`quest-create-panel rpg-elastic-panel box-border relative z-10 mx-auto w-full max-w-xl overflow-x-hidden overflow-y-auto p-6 transition-transform duration-300 sm:transition-none ${
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

        {/* Title on parchment — dark ink color */}
        <div className="mb-3 pr-8">
          <p className="text-xs uppercase tracking-[0.25em] text-[#4a3224]/60">
            Новая запись в дневнике
          </p>
          <h2
            id="quest-create-title"
            className="font-display text-xl tracking-wide text-[#3a2214]"
          >
            Добавить квест
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Scrollable form body — never leaves parchment zone ── */}
          <div
            className="box-border w-full overflow-x-hidden overflow-y-auto space-y-3 bg-transparent pr-1"
            style={{ maxHeight: '50vh' }}
          >
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
                    <img src={SYS_ICON.sparkles} alt="" width={18} height={18} style={{ imageRendering: 'pixelated' }} aria-hidden />
                  )}
                  <span className="sr-only">Сгенерировать детали через ИИ</span>
                </button>
              </div>
              {aiSource && (
                <p className="mt-1 text-xs text-ink-muted">
                  Детали сгенерированы ({aiSource === "gemini" ? "Gemini" : "шаблон"})
                </p>
              )}
            </Field>

            <Field label="Описание">
              <textarea
                className="journal-input resize-y"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Контекст, лор, детали задания..."
                rows={2}
              />
            </Field>

            {/* Тип + Сложность */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="Тип квеста">
                <select
                  className="journal-input"
                  value={form.quest_type}
                  onChange={(e) => handleQuestTypeChange(e.target.value as QuestType)}
                >
                  {QUEST_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Сложность">
                <select
                  className="journal-input"
                  value={form.difficulty}
                  onChange={(e) => {
                    const difficulty = e.target.value as QuestDifficulty;
                    const reward = rewardForDifficulty(difficulty);
                    setForm((prev) => ({
                      ...prev,
                      difficulty,
                      xp_reward: reward.xp,
                      gold_reward: reward.gold,
                    }));
                  }}
                >
                  {DIFFICULTY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="font-display mt-1 text-[11px] italic leading-snug text-ink-muted/70">
                  {activeDifficultyLevel.hint}
                </p>
              </Field>
            </div>

            {/* Награда XP + Золото */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="Награда XP">
                <input
                  className={`journal-input ${isSelfAssigned ? "bg-ink/5" : ""}`}
                  type="number"
                  min={0}
                  value={form.xp_reward}
                  disabled={isSelfAssigned}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, xp_reward: Number(e.target.value) || 0 }))
                  }
                />
              </Field>
              <Field label="Золото">
                <input
                  className={`journal-input ${isSelfAssigned ? "bg-ink/5" : ""}`}
                  type="number"
                  min={0}
                  value={form.gold_reward}
                  disabled={isSelfAssigned}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, gold_reward: Number(e.target.value) || 0 }))
                  }
                />
              </Field>
            </div>

            {/* Кому назначить + Фракция */}
            {students.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Назначить">
                  <select
                    className="journal-input"
                    value={form.assigneeId}
                    onChange={(e) => {
                      const assigneeId = e.target.value;
                      setForm((prev) => {
                        if (assigneeId !== "") {
                          return { ...prev, assigneeId };
                        }
                        const reward = rewardForDifficulty(prev.difficulty);
                        return { ...prev, assigneeId, xp_reward: reward.xp, gold_reward: reward.gold };
                      });
                    }}
                  >
                    <option value="">Себе</option>
                    {students.map((s) => (
                      <option key={s.adventurer_id} value={String(s.adventurer_id)}>{s.display_name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Фракция">
                  <select
                    className="journal-input"
                    value={form.factionId}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, factionId: e.target.value }))
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
              </div>
            ) : (
              <Field label="Фракция">
                <select
                  className="journal-input"
                  value={form.factionId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, factionId: e.target.value }))
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
            )}

            {/* Ежедневный: периодичность + время / Обычный: дедлайн + будильник */}
            {isDaily ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Периодичность">
                  <select
                    className="journal-input"
                    value={form.frequency ?? DEFAULT_QUEST_FREQUENCY}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, frequency: e.target.value as QuestFrequency }))
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
                      setForm((prev) => ({ ...prev, reminderTime: e.target.value }))
                    }
                  />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Дедлайн">
                  <input
                    className="journal-input"
                    type="datetime-local"
                    value={form.deadlineLocal}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, deadlineLocal: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Будильник">
                  <input
                    className="journal-input"
                    type="datetime-local"
                    value={form.reminderLocal}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, reminderLocal: e.target.value }))
                    }
                  />
                </Field>
              </div>
            )}

            {/* as="div": label must not wrap the map — clicks would activate 📍 Find me */}
            <Field label="Локация на карте" as="div">
              <LocationPickerMiniMap
                latitude={form.latitude ?? null}
                longitude={form.longitude ?? null}
                onChange={(latitude, longitude) =>
                  setForm((prev) => ({ ...prev, latitude, longitude }))
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
              {submitting ? "Создаём..." : "⚔ Создать квест"}
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
  as = "label",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  as?: "label" | "div";
}) {
  const Wrapper = as;
  return (
    <Wrapper className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wide text-ink-muted">
        {label}
        {required && <span className="text-gold"> *</span>}
      </span>
      {children}
    </Wrapper>
  );
}
