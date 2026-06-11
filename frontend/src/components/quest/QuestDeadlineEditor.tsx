"use client";

import { useEffect, useRef, useState } from "react";

import { QuestDeadlineCountdown } from "@/components/quest/QuestDeadlineCountdown";
import {
  dailyTimeToIso,
  isoToDailyTime,
  isoToDatetimeLocal,
  localDatetimeToIso,
} from "@/lib/deadline";
import { DEADLINE_RESCHEDULE_COST } from "@/lib/types";
import type { QuestType } from "@/lib/types";

interface QuestDeadlineEditorProps {
  questId: number;
  deadline: string;
  status: string;
  questType: QuestType;
  adventurerGold: number;
  compact?: boolean;
  onSave: (questId: number, deadline: string | null) => Promise<void>;
}

export function QuestDeadlineEditor({
  questId,
  deadline,
  status,
  questType,
  adventurerGold,
  compact = false,
  onSave,
}: QuestDeadlineEditorProps) {
  const isDaily = questType === "daily";
  const isPaidReschedule = questType === "main" || questType === "side";
  const canAffordReschedule = adventurerGold >= DEADLINE_RESCHEDULE_COST;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(
    isDaily ? isoToDailyTime(deadline) : isoToDatetimeLocal(deadline),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(
      isDaily ? isoToDailyTime(deadline) : isoToDatetimeLocal(deadline),
    );
  }, [deadline, isDaily]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setError(null);
        setValue(
          isDaily ? isoToDailyTime(deadline) : isoToDatetimeLocal(deadline),
        );
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, deadline, isDaily]);

  function handleOpen(event: React.MouseEvent) {
    event.stopPropagation();
    setError(null);
    setValue(
      isDaily ? isoToDailyTime(deadline) : isoToDatetimeLocal(deadline),
    );
    setOpen(true);
  }

  function handleCancel(event: React.MouseEvent) {
    event.stopPropagation();
    setOpen(false);
    setError(null);
    setValue(
      isDaily ? isoToDailyTime(deadline) : isoToDatetimeLocal(deadline),
    );
  }

  async function handleSave(event: React.MouseEvent) {
    event.stopPropagation();
    setError(null);

    const iso = isDaily ? dailyTimeToIso(value) : localDatetimeToIso(value);
    if (!iso) {
      setError(isDaily ? "Укажите время оповещения" : "Укажите дату и время");
      return;
    }

    setSaving(true);
    try {
      await onSave(questId, iso);
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось сохранить время",
      );
    } finally {
      setSaving(false);
    }
  }

  const saveDisabled =
    saving || (isPaidReschedule && !canAffordReschedule);

  return (
    <div
      ref={rootRef}
      className={`quest-deadline-editor ${compact ? "shrink-0" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="quest-deadline-trigger"
        onClick={handleOpen}
        title={isDaily ? "Изменить время оповещения" : "Изменить дедлайн"}
        aria-expanded={open}
      >
        <QuestDeadlineCountdown
          deadline={deadline}
          status={status}
          questType={questType}
          compact={compact}
          editable
        />
      </button>

      {open && (
        <div
          className={`deadline-edit-popover ${compact ? "deadline-edit-popover-compact" : ""}`}
          role="dialog"
          aria-label={isDaily ? "Время оповещения" : "Дедлайн квеста"}
        >
          <p className="deadline-edit-popover-title">
            {isDaily ? "Время оповещения" : "Дедлайн"}
          </p>

          {isPaidReschedule && (
            <p
              className={`deadline-edit-popover-fee ${
                !canAffordReschedule ? "deadline-edit-popover-fee-insufficient" : ""
              }`}
            >
              Перенос дедлайна: -{DEADLINE_RESCHEDULE_COST} 💰
              {!canAffordReschedule && (
                <span className="block text-[10px] font-normal normal-case tracking-normal">
                  Недостаточно золота ({adventurerGold} 🪙)
                </span>
              )}
            </p>
          )}

          {isDaily ? (
            <input
              className="journal-input"
              type="time"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={saving}
            />
          ) : (
            <input
              className="journal-input"
              type="datetime-local"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={saving}
            />
          )}

          {error && <p className="deadline-edit-popover-error">{error}</p>}

          <div className="deadline-edit-popover-actions">
            <button
              type="button"
              className="deadline-edit-popover-btn"
              onClick={handleSave}
              disabled={saveDisabled}
              title={
                isPaidReschedule && !canAffordReschedule
                  ? `Нужно ${DEADLINE_RESCHEDULE_COST} золота`
                  : "Сохранить"
              }
              aria-label="Сохранить"
            >
              💾
            </button>
            <button
              type="button"
              className="deadline-edit-popover-btn"
              onClick={handleCancel}
              disabled={saving}
              title="Отмена"
              aria-label="Отмена"
            >
              ❌
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
