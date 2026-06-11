"use client";

import { useState } from "react";

import { QuestDeadlineCountdown } from "@/components/quest/QuestDeadlineCountdown";
import { QuestDeadlineEditor } from "@/components/quest/QuestDeadlineEditor";
import { QuestDifficultyBadge } from "@/components/quest/QuestDifficultyBadge";
import { QuestSubquests } from "@/components/quest/QuestSubquests";
import { useNow } from "@/hooks/useNow";
import {
  formatDeadlineDateTime,
  formatReminderTime,
  isDeadlineOverdue,
} from "@/lib/deadline";
import type { Quest } from "@/lib/types";
import { QUEST_STATUS_LABELS, QUEST_TYPE_LABELS } from "@/lib/quest-labels";

interface QuestCardProps {
  quest: Quest;
  isDailyTab?: boolean;
  subquests?: Quest[];
  isUpdating?: boolean;
  updatingSubquestId?: number | null;
  onComplete?: (questId: number) => Promise<void>;
  onFail?: (questId: number, failReason: string) => Promise<void>;
  onAddSubquest?: (title: string) => Promise<void>;
  onToggleSubquest?: (subquestId: number) => Promise<void>;
  onUpdateDeadline?: (questId: number, deadline: string | null) => Promise<void>;
  adventurerGold?: number;
}

export function QuestCard({
  quest,
  isDailyTab = false,
  subquests = [],
  isUpdating = false,
  updatingSubquestId = null,
  onComplete,
  onFail,
  onAddSubquest,
  onToggleSubquest,
  onUpdateDeadline,
  adventurerGold = 0,
}: QuestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFailForm, setShowFailForm] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const isActive = quest.status === "active";
  const isDailyCompletedToday =
    quest.quest_type === "daily" && quest.status === "completed";
  const showDailyDoneState = isDailyTab && isDailyCompletedToday;
  const canComplete = isActive && Boolean(onComplete);
  const canFail =
    isActive &&
    Boolean(onFail) &&
    !(isDailyTab && quest.quest_type === "daily");
  const hasSubquests = subquests.length > 0;
  const incompleteSubquests = subquests.filter((s) => s.status === "active");
  const allSubquestsDone =
    !hasSubquests || incompleteSubquests.length === 0;

  const now = useNow(1000);
  const hasActiveDeadline = isActive && Boolean(quest.deadline);
  const isOverdue =
    hasActiveDeadline &&
    quest.deadline &&
    isDeadlineOverdue(quest.deadline, quest.status, now.getTime());

  function toggleExpanded() {
    setExpanded((prev) => !prev);
  }

  async function handleComplete(event: React.MouseEvent) {
    event.stopPropagation();
    if (!onComplete || isUpdating) return;
    setLocalError(null);
    await onComplete(quest.id);
  }

  async function handleFailSubmit(event: React.MouseEvent) {
    event.stopPropagation();
    if (!onFail || isUpdating) return;
    const reason = failReason.trim();
    if (!reason) {
      setLocalError("Укажите причину провала");
      return;
    }
    setLocalError(null);
    await onFail(quest.id, reason);
    setShowFailForm(false);
    setFailReason("");
  }

  return (
    <article
      className={`journal-panel quest-card transition ${
        isUpdating ? "opacity-70" : ""
      } ${showDailyDoneState ? "quest-card-daily-done" : ""} ${
        isOverdue ? "quest-card-overdue" : ""
      } ${expanded ? "shadow-journal-hover" : "hover:shadow-journal-hover"}`}
    >
      <button
        type="button"
        className="quest-card-summary flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-controls={`quest-body-${quest.id}`}
      >
        <span
          className={`quest-card-chevron shrink-0 text-ink-muted transition-transform duration-300 ${
            expanded ? "rotate-90" : ""
          }`}
          aria-hidden
        >
          ▸
        </span>

        <h3 className="min-w-0 flex-1 truncate font-display text-base text-ink sm:text-lg">
          {quest.title}
        </h3>

        {hasActiveDeadline && quest.deadline && onUpdateDeadline && (
          <QuestDeadlineEditor
            questId={quest.id}
            deadline={quest.deadline}
            status={quest.status}
            questType={quest.quest_type}
            adventurerGold={adventurerGold}
            compact
            onSave={onUpdateDeadline}
          />
        )}
        {hasActiveDeadline && quest.deadline && !onUpdateDeadline && (
          <QuestDeadlineCountdown
            deadline={quest.deadline}
            status={quest.status}
            questType={quest.quest_type}
            compact
          />
        )}

        {showDailyDoneState ? (
          <span className="daily-done-badge shrink-0">Выполнено сегодня</span>
        ) : (
          <QuestDifficultyBadge difficulty={quest.difficulty} />
        )}
      </button>

      <div
        id={`quest-body-${quest.id}`}
        className={`quest-card-body ${expanded ? "quest-card-body-open" : ""}`}
      >
        <div className="quest-card-body-inner border-t border-ink/10 px-4 pb-4 pt-3">
          <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">
            {QUEST_TYPE_LABELS[quest.quest_type]}
            <span className="mx-2 text-ink/20">·</span>
            {QUEST_STATUS_LABELS[quest.status]}
          </p>

          {quest.description ? (
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              {quest.description}
            </p>
          ) : (
            <p className="mt-3 text-sm italic text-ink-muted">
              Описание не указано.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <RewardBadge label="Награда XP" value={`+${quest.xp_reward}`} />
            <RewardBadge label="Золото" value={`+${quest.gold_reward} 🪙`} />
            {hasActiveDeadline && quest.deadline && onUpdateDeadline ? (
              <QuestDeadlineEditor
                questId={quest.id}
                deadline={quest.deadline}
                status={quest.status}
                questType={quest.quest_type}
                adventurerGold={adventurerGold}
                onSave={onUpdateDeadline}
              />
            ) : hasActiveDeadline && quest.deadline ? (
              <QuestDeadlineCountdown
                deadline={quest.deadline}
                status={quest.status}
                questType={quest.quest_type}
              />
            ) : (
              quest.deadline && (
                <RewardBadge
                  label={
                    quest.quest_type === "daily" ? "Оповещение" : "Дедлайн"
                  }
                  value={
                    quest.quest_type === "daily"
                      ? formatReminderTime(quest.deadline)
                      : formatDeadlineDateTime(quest.deadline)
                  }
                />
              )
            )}
          </div>

          {quest.status === "completed" && (
            <p className="mt-3 rounded-lg border border-emerald-200/60 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-900">
              Заработано: +{quest.xp_earned} XP, +{quest.gold_earned} золота
            </p>
          )}

          {quest.status === "failed" && quest.fail_reason && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-sm text-rose-900">
              <span className="text-xs font-medium uppercase tracking-wide text-rose-800">
                Причина провала
              </span>
              <br />
              {quest.fail_reason}
            </p>
          )}

          {(canComplete || subquests.length > 0) && (
            <QuestSubquests
              subquests={subquests}
              isUpdating={isUpdating}
              updatingSubquestId={updatingSubquestId}
              canEdit={canComplete}
              onAdd={onAddSubquest}
              onToggle={onToggleSubquest}
            />
          )}

          {(canComplete || canFail) && !showFailForm && (
            <div
              className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4"
              onClick={(e) => e.stopPropagation()}
            >
              {canComplete && !allSubquestsDone && (
                <p className="w-full text-xs text-amber-900/80">
                  Осталось этапов: {incompleteSubquests.length}
                </p>
              )}
              {canComplete && (
                <button
                  type="button"
                  className="journal-button-complete"
                  onClick={handleComplete}
                  disabled={isUpdating || !allSubquestsDone}
                  title={
                    !allSubquestsDone
                      ? `Выполните все этапы (${incompleteSubquests.length} осталось)`
                      : undefined
                  }
                >
                  <span aria-hidden>⚔️</span>
                  {isUpdating ? "Сохраняем..." : "Завершить"}
                </button>
              )}
              {canFail && (
                <button
                  type="button"
                  className="journal-button-fail"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocalError(null);
                    setShowFailForm(true);
                  }}
                  disabled={isUpdating}
                >
                  <span aria-hidden>☠️</span>
                  Провалить
                </button>
              )}
            </div>
          )}

          {canFail && showFailForm && (
            <div
              className="mt-4 space-y-3 border-t border-ink/10 pt-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs uppercase tracking-wide text-ink-muted">
                Запись о провале в дневнике
              </p>
              <textarea
                className="journal-input min-h-20 resize-y"
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                placeholder="Что пошло не так? (обязательно)"
                disabled={isUpdating}
              />
              {localError && (
                <p className="text-xs text-rose-800">{localError}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="journal-button-fail"
                  onClick={handleFailSubmit}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Сохраняем..." : "Подтвердить провал"}
                </button>
                <button
                  type="button"
                  className="journal-button-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFailForm(false);
                    setFailReason("");
                    setLocalError(null);
                  }}
                  disabled={isUpdating}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function RewardBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gold/25 bg-gold/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
