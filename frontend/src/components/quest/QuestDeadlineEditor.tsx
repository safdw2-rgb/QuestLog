"use client";

import { useEffect, useRef, useState } from "react";

import { QuestDeadlineCountdown } from "@/components/quest/QuestDeadlineCountdown";
import type { QuestScheduleUpdatePayload } from "@/lib/api";
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
  datetime: string;
  status: string;
  questType: QuestType;
  field: "deadline" | "reminder";
  adventurerGold: number;
  compact?: boolean;
  onSave: (questId: number, payload: QuestScheduleUpdatePayload) => Promise<void>;
}

export function QuestDeadlineEditor({
  questId,
  datetime,
  status,
  questType,
  field,
  adventurerGold,
  compact = false,
  onSave,
}: QuestDeadlineEditorProps) {
  const isDaily = questType === "daily";
  const isPaidReschedule =
    field === "deadline" && (questType === "main" || questType === "side");
  const canAffordReschedule = adventurerGold >= DEADLINE_RESCHEDULE_COST;
  const usesTimeInput = isDaily;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(
    usesTimeInput ? isoToDailyTime(datetime) : isoToDatetimeLocal(datetime),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(
      usesTimeInput ? isoToDailyTime(datetime) : isoToDatetimeLocal(datetime),
    );
  }, [datetime, usesTimeInput]);

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
          usesTimeInput
            ? isoToDailyTime(datetime)
            : isoToDatetimeLocal(datetime),
        );
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, datetime, usesTimeInput]);

  function resetValue() {
    setValue(
      usesTimeInput ? isoToDailyTime(datetime) : isoToDatetimeLocal(datetime),
    );
  }

  function handleOpen(event: React.MouseEvent) {
    event.stopPropagation();
    setError(null);
    resetValue();
    setOpen(true);
  }

  function handleCancel(event: React.MouseEvent) {
    event.stopPropagation();
    setOpen(false);
    setError(null);
    resetValue();
  }

  async function handleSave(event: React.MouseEvent) {
    event.stopPropagation();
    setError(null);

    const iso = usesTimeInput
      ? dailyTimeToIso(value)
      : localDatetimeToIso(value);
    if (!iso) {
      setError(
        usesTimeInput
          ? "Укажите время оповещения"
          : field === "reminder"
            ? "Укажите дату и время будильника"
            : "Укажите дату и время дедлайна",
      );
      return;
    }

    const payload: QuestScheduleUpdatePayload =
      field === "deadline" ? { deadline: iso } : { reminder_time: iso };

    setSaving(true);
    try {
      await onSave(questId, payload);
      setOpen(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось сохранить время",
      );
    } finally {
      setSaving(false);
    }
  }

  const popoverTitle = isDaily
    ? "Время оповещения"
    : field === "reminder"
      ? "Будильник"
      : "Дедлайн";

  const saveDisabled =
    saving || (isPaidReschedule && !canAffordReschedule);

  return (
    <div
      ref={rootRef}
      className={`quest-deadline-editor ${compact ? "shrink-0" : ""} ${open ? "z-[100]" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="quest-deadline-trigger"
        onClick={handleOpen}
        title={
          isDaily
            ? "Изменить время оповещения"
            : field === "reminder"
              ? "Изменить будильник"
              : "Изменить дедлайн"
        }
        aria-expanded={open}
      >
        <QuestDeadlineCountdown
          datetime={datetime}
          status={status}
          field={field}
          questType={questType}
          compact={compact}
          editable
        />
      </button>

      {open && (
        <div
          className={`deadline-edit-popover ${compact ? "deadline-edit-popover-compact" : ""}`}
          role="dialog"
          aria-label={popoverTitle}
        >
          <p className="deadline-edit-popover-title">{popoverTitle}</p>

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

          {usesTimeInput ? (
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
