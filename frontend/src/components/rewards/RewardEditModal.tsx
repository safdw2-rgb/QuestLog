"use client";

import { FormEvent, useEffect, useState } from "react";

import { RewardFormFields } from "@/components/rewards/RewardFormFields";
import { generateRewardAiDescription, updateReward } from "@/lib/api";
import type { Faction, Reward } from "@/lib/types";

interface RewardEditModalProps {
  open: boolean;
  reward: Reward | null;
  factions: Faction[];
  onClose: () => void;
  onUpdated: (reward: Reward) => void;
}

export function RewardEditModal({
  open,
  reward,
  factions,
  onClose,
  onUpdated,
}: RewardEditModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("0");
  const [factionId, setFactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open && reward) {
      setTitle(reward.title);
      setDescription(reward.description ?? "");
      setCost(String(reward.cost));
      setFactionId(reward.faction_id ? String(reward.faction_id) : "");
      setAiSource(null);
      setError(null);
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(timer);
  }, [open, reward]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  async function handleGenerateAi() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Сначала введите название товара");
      return;
    }

    setGenerating(true);
    setError(null);
    setAiSource(null);

    try {
      const result = await generateRewardAiDescription({
        title: trimmedTitle,
        faction_id: factionId ? Number(factionId) : null,
      });
      setDescription(result.description);
      setAiSource(result.source);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось сгенерировать описание",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reward) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const updated = await updateReward(reward.id, {
        title: title.trim(),
        description: description.trim() || null,
        cost: Number(cost),
        faction_id: factionId ? Number(factionId) : null,
      });
      onUpdated(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить товар");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || !reward) {
    return null;
  }

  return (
    <div
      className="quest-create-overlay fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`quest-create-panel journal-panel relative z-10 w-full max-w-lg rounded-t-2xl p-5 transition-transform duration-300 sm:rounded-xl ${
          visible ? "translate-y-0" : "translate-y-full sm:translate-y-4 sm:opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-edit-title"
      >
        <h2 id="reward-edit-title" className="font-display text-xl text-ink">
          Редактировать товар
        </h2>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <RewardFormFields
            title={title}
            description={description}
            cost={cost}
            factionId={factionId}
            factions={factions}
            generating={generating}
            aiSource={aiSource}
            disabled={submitting}
            onTitleChange={(value) => {
              setAiSource(null);
              setTitle(value);
            }}
            onDescriptionChange={setDescription}
            onCostChange={setCost}
            onFactionChange={setFactionId}
            onGenerateAi={handleGenerateAi}
          />

          {error && <p className="text-sm text-rose-800">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              className="journal-button-primary"
              disabled={submitting}
            >
              {submitting ? "Сохраняем..." : "Сохранить"}
            </button>
            <button
              type="button"
              className="journal-button-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
