"use client";

import { useEffect, useState } from "react";

import type { QuestScheduleUpdatePayload } from "@/lib/api";
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
import { resolveFactionIcon } from "@/lib/faction-utils";
import { getReputationLevel } from "@/lib/faction-reputation";
import { BARGAIN_COST, type Faction, type Quest } from "@/lib/types";

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
  onUpdateSchedule?: (
    questId: number,
    payload: QuestScheduleUpdatePayload,
  ) => Promise<void>;
  onBargain?: (questId: number) => Promise<string | null>;
  onRetireDaily?: (questId: number) => Promise<void>;
  onShowOnMap?: (quest: Quest) => void;
  onEdit?: (quest: Quest) => void;
  faction?: Faction | null;
  adventurerGold?: number;
  focus?: boolean;
  onFocused?: () => void;
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
  onUpdateSchedule,
  onBargain,
  onRetireDaily,
  onShowOnMap,
  onEdit,
  faction = null,
  adventurerGold = 0,
  focus = false,
  onFocused,
}: QuestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFailForm, setShowFailForm] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [bargainNotice, setBargainNotice] = useState<string | null>(null);

  const isActive = quest.status === "active";
  const isDaily = quest.quest_type === "daily";
  const isRegular = quest.quest_type === "main" || quest.quest_type === "side";
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
  const hasActiveDeadline = isActive && isRegular && Boolean(quest.deadline);
  const hasActiveReminder = isActive && Boolean(quest.reminder_time);
  const isOverdue =
    hasActiveDeadline &&
    quest.deadline &&
    isDeadlineOverdue(quest.deadline, quest.status, now.getTime());
  const canBargain =
    isActive &&
    !quest.bargained &&
    quest.gold_reward > 0 &&
    Boolean(onBargain);
  const canAffordBargain = adventurerGold >= BARGAIN_COST;
  const canRetireDaily =
    isDailyTab && isDaily && isActive && Boolean(onRetireDaily);
  const hasMapLocation = quest.latitude != null && quest.longitude != null;
  const canShowOnMap = hasMapLocation && Boolean(onShowOnMap);
  const canEdit = isActive && Boolean(onEdit);
  const factionIcon = faction ? resolveFactionIcon(faction) : null;

  useEffect(() => {
    if (!focus) {
      return;
    }

    setExpanded(true);
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`quest-card-${quest.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      onFocused?.();
    });

    return () => cancelAnimationFrame(frame);
  }, [focus, onFocused, quest.id]);

  function toggleExpanded() {
    setExpanded((prev) => !prev);
  }

  async function handleComplete(event: React.MouseEvent) {
    event.stopPropagation();
    if (!onComplete || isUpdating) return;
    setLocalError(null);
    await onComplete(quest.id);
  }

  async function handleRetireDaily(event: React.MouseEvent) {
    event.stopPropagation();
    if (!onRetireDaily || isUpdating) {
      return;
    }

    const confirmed = window.confirm(
      "Прекратить выполнять этот ежедневный квест? Он исчезнет из пула дейликов.",
    );
    if (!confirmed) {
      return;
    }

    setLocalError(null);
    try {
      await onRetireDaily(quest.id);
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "Не удалось убрать дейлик",
      );
    }
  }

  async function handleBargain(event: React.MouseEvent) {
    event.stopPropagation();
    if (!onBargain || isUpdating || !canAffordBargain) {
      return;
    }

    setLocalError(null);
    setBargainNotice(null);
    try {
      const message = await onBargain(quest.id);
      if (message) {
        setBargainNotice(message);
      }
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "Не удалось провести торги",
      );
    }
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
      id={`quest-card-${quest.id}`}
      className={`journal-panel quest-card transition ${
        isUpdating ? "opacity-70" : ""
      } ${showDailyDoneState ? "quest-card-daily-done" : ""} ${
        isOverdue ? "quest-card-overdue" : ""
      } ${expanded ? "shadow-journal-hover" : "hover:shadow-journal-hover"}`}
    >
      <button
        type="button"
        className="quest-card-summary flex w-full min-w-0 items-start gap-3 px-4 py-3 text-left"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-controls={`quest-body-${quest.id}`}
      >
        <span
          className={`quest-card-chevron mt-0.5 shrink-0 text-ink-muted transition-transform duration-300 ${
            expanded ? "rotate-90" : ""
          }`}
          aria-hidden
        >
          ▸
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="flex min-w-0 items-start gap-1.5 font-display text-base leading-snug text-ink transition-all duration-300 sm:text-lg">
            {factionIcon && (
              <span className="quest-faction-emoji shrink-0" aria-hidden>
                {factionIcon}
              </span>
            )}
            <span
              className={`min-w-0 flex-1 ${
                expanded
                  ? "whitespace-normal break-words"
                  : "truncate"
              }`}
            >
              {quest.title}
            </span>
          </h3>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
        {hasActiveDeadline && quest.deadline && onUpdateSchedule && (
          <QuestDeadlineEditor
            questId={quest.id}
            datetime={quest.deadline}
            status={quest.status}
            questType={quest.quest_type}
            field="deadline"
            adventurerGold={adventurerGold}
            compact
            onSave={onUpdateSchedule}
          />
        )}
        {hasActiveDeadline && quest.deadline && !onUpdateSchedule && (
          <QuestDeadlineCountdown
            datetime={quest.deadline}
            status={quest.status}
            field="deadline"
            questType={quest.quest_type}
            compact
          />
        )}

        {!hasActiveDeadline &&
          hasActiveReminder &&
          quest.reminder_time &&
          onUpdateSchedule && (
            <QuestDeadlineEditor
              questId={quest.id}
              datetime={quest.reminder_time}
              status={quest.status}
              questType={quest.quest_type}
              field="reminder"
              adventurerGold={adventurerGold}
              compact
              onSave={onUpdateSchedule}
            />
          )}
        {!hasActiveDeadline &&
          hasActiveReminder &&
          quest.reminder_time &&
          !onUpdateSchedule && (
            <QuestDeadlineCountdown
              datetime={quest.reminder_time}
              status={quest.status}
              field="reminder"
              questType={quest.quest_type}
              compact
            />
          )}

        {showDailyDoneState ? (
          <span className="daily-done-badge shrink-0">Выполнено сегодня</span>
        ) : (
          <QuestDifficultyBadge difficulty={quest.difficulty} />
        )}
        </div>
      </button>

      {expanded && (
        <div
          id={`quest-body-${quest.id}`}
          className="quest-card-body-inner border-t border-ink/10 px-4 pb-4 pt-3"
        >
          {faction && (
            <p className="text-xs text-ink-muted">
              {faction.icon ? `${faction.icon} ` : ""}
              {faction.name} · {getReputationLevel(faction.reputation_points)} (
              {faction.reputation_points} очков)
            </p>
          )}

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

            {hasActiveDeadline && quest.deadline && onUpdateSchedule ? (
              <QuestDeadlineEditor
                questId={quest.id}
                datetime={quest.deadline}
                status={quest.status}
                questType={quest.quest_type}
                field="deadline"
                adventurerGold={adventurerGold}
                onSave={onUpdateSchedule}
              />
            ) : hasActiveDeadline && quest.deadline ? (
              <QuestDeadlineCountdown
                datetime={quest.deadline}
                status={quest.status}
                field="deadline"
                questType={quest.quest_type}
              />
            ) : (
              quest.deadline && (
                <RewardBadge
                  label="Дедлайн"
                  value={formatDeadlineDateTime(quest.deadline)}
                />
              )
            )}

            {hasActiveReminder && quest.reminder_time && onUpdateSchedule ? (
              <QuestDeadlineEditor
                questId={quest.id}
                datetime={quest.reminder_time}
                status={quest.status}
                questType={quest.quest_type}
                field="reminder"
                adventurerGold={adventurerGold}
                onSave={onUpdateSchedule}
              />
            ) : hasActiveReminder && quest.reminder_time ? (
              <QuestDeadlineCountdown
                datetime={quest.reminder_time}
                status={quest.status}
                field="reminder"
                questType={quest.quest_type}
              />
            ) : (
              quest.reminder_time && (
                <RewardBadge
                  label={isDaily ? "Оповещение" : "Будильник"}
                  value={
                    isDaily
                      ? formatReminderTime(quest.reminder_time)
                      : formatDeadlineDateTime(quest.reminder_time)
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

          {bargainNotice && (
            <p
              className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                bargainNotice.includes("провалились")
                  ? "border-amber-200 bg-amber-50/90 text-amber-950"
                  : "border-emerald-200 bg-emerald-50/90 text-emerald-950"
              }`}
            >
              {bargainNotice}
            </p>
          )}

          {canBargain && (
            <div
              className="mt-4 border-t border-ink/10 pt-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="journal-button-bargain"
                onClick={handleBargain}
                disabled={isUpdating || !canAffordBargain}
                title={
                  !canAffordBargain
                    ? `Нужно ${BARGAIN_COST} золота`
                    : "Один раз за квест: проверка удачи d20"
                }
              >
                <span aria-hidden>🎲</span>
                {isUpdating
                  ? "Бросаем кости..."
                  : `Сторговаться (-${BARGAIN_COST} 💰)`}
              </button>
              {!canAffordBargain && (
                <p className="mt-2 text-xs text-amber-900/80">
                  Недостаточно золота для торгов ({adventurerGold} 🪙)
                </p>
              )}
            </div>
          )}

          {quest.bargained && isActive && (
            <p className="mt-3 text-xs text-ink-muted">
              Торги по этому контракту уже проведены.
            </p>
          )}

          {canRetireDaily && (
            <div
              className="mt-4 border-t border-ink/10 pt-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="journal-button-retire-daily"
                onClick={handleRetireDaily}
                disabled={isUpdating}
              >
                <span aria-hidden>🗑️</span>
                {isUpdating ? "Убираем..." : "Прекратить выполнять"}
              </button>
            </div>
          )}

          {(canEdit || canShowOnMap) && (
            <div
              className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-4"
              onClick={(e) => e.stopPropagation()}
            >
              {canEdit && (
                <button
                  type="button"
                  className="journal-button-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(quest);
                  }}
                >
                  <span aria-hidden>✏️</span>
                  Редактировать
                </button>
              )}
              {canShowOnMap && (
                <button
                  type="button"
                  className="journal-button-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowOnMap?.(quest);
                  }}
                >
                  <span aria-hidden>🗺️</span>
                  Показать на карте
                </button>
              )}
            </div>
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
      )}
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
