"use client";

import type { Faction } from "@/lib/types";

interface RewardFormFieldsProps {
  title: string;
  description: string;
  cost: string;
  factionId: string;
  factions: Faction[];
  generating: boolean;
  aiSource: string | null;
  disabled?: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCostChange: (value: string) => void;
  onFactionChange: (value: string) => void;
  onGenerateAi: () => void;
}

export function RewardFormFields({
  title,
  description,
  cost,
  factionId,
  factions,
  generating,
  aiSource,
  disabled = false,
  onTitleChange,
  onDescriptionChange,
  onCostChange,
  onFactionChange,
  onGenerateAi,
}: RewardFormFieldsProps) {
  return (
    <>
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wide text-ink-muted">
          Название
        </span>
        <input
          className="journal-input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
          maxLength={200}
          disabled={disabled}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wide text-ink-muted">
          Описание
        </span>
        <div className="flex gap-2">
          <textarea
            className="journal-input min-h-20 min-w-0 flex-1 resize-y"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            disabled={disabled}
          />
          <button
            type="button"
            className="journal-button-magic h-[42px] shrink-0"
            onClick={onGenerateAi}
            disabled={disabled || generating || !title.trim()}
            title="Сгенерировать описание через ИИ"
          >
            {generating ? (
              <span className="text-xs">…</span>
            ) : (
              <span aria-hidden>✨</span>
            )}
            <span className="sr-only">Сгенерировать описание через ИИ</span>
          </button>
        </div>
        {aiSource && (
          <p className="mt-1.5 text-xs text-ink-muted">
            Описание сгенерировано ({aiSource === "gemini" ? "Gemini Pro" : "шаблон"})
          </p>
        )}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-ink-muted">
            Базовая цена (золото)
          </span>
          <input
            className="journal-input"
            type="number"
            min={0}
            value={cost}
            onChange={(e) => onCostChange(e.target.value)}
            required
            disabled={disabled}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-ink-muted">
            Фракция-поставщик
          </span>
          <select
            className="journal-input"
            value={factionId}
            onChange={(e) => onFactionChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">Без фракции</option>
            {factions.map((faction) => (
              <option key={faction.id} value={faction.id}>
                {faction.icon ? `${faction.icon} ` : ""}
                {faction.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
