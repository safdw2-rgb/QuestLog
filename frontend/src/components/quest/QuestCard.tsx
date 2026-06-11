import type { Quest } from "@/lib/types";
import {
  QUEST_DIFFICULTY_LABELS,
  QUEST_STATUS_LABELS,
  QUEST_TYPE_LABELS,
} from "@/lib/quest-labels";

interface QuestCardProps {
  quest: Quest;
}

const STATUS_STYLES: Record<Quest["status"], string> = {
  active: "border-amber-700/30 bg-amber-50/50 text-amber-900",
  completed: "border-emerald-700/30 bg-emerald-50/60 text-emerald-900",
  failed: "border-rose-700/30 bg-rose-50/60 text-rose-900",
  deferred: "border-slate-500/30 bg-slate-50/60 text-slate-700",
  abandoned: "border-stone-500/30 bg-stone-100/60 text-stone-600",
};

export function QuestCard({ quest }: QuestCardProps) {
  return (
    <article className="journal-panel group p-5 transition hover:shadow-journal-hover">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">
            {QUEST_TYPE_LABELS[quest.quest_type]}
          </p>
          <h3 className="mt-1 font-display text-xl text-ink">{quest.title}</h3>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${STATUS_STYLES[quest.status]}`}
        >
          {QUEST_STATUS_LABELS[quest.status]}
        </span>
      </header>

      {quest.description && (
        <p className="mt-3 text-sm leading-relaxed text-ink/80">
          {quest.description}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <MetaItem label="Сложность" value={QUEST_DIFFICULTY_LABELS[quest.difficulty]} />
        <MetaItem label="Награда" value={`${quest.xp_reward} XP`} />
        <MetaItem label="Золото" value={`${quest.gold_reward} 🪙`} />
        {quest.deadline && (
          <MetaItem
            label="Дедлайн"
            value={new Date(quest.deadline).toLocaleDateString("ru-RU")}
          />
        )}
      </dl>

      {quest.status === "completed" && (
        <p className="mt-3 text-xs text-emerald-800">
          Заработано: +{quest.xp_earned} XP, +{quest.gold_earned} золота
        </p>
      )}

      {quest.status === "failed" && quest.fail_reason && (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-900">
          Причина провала: {quest.fail_reason}
        </p>
      )}
    </article>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}
