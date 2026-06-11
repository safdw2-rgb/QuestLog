import type { Adventurer } from "@/lib/types";

interface HeroPanelProps {
  adventurer: Adventurer;
}

export function HeroPanel({ adventurer }: HeroPanelProps) {
  const nextLevelXp =
    adventurer.experience_points + adventurer.xp_to_next_level;
  const progress =
    nextLevelXp === 0
      ? 0
      : Math.min(
          100,
          (adventurer.experience_points / nextLevelXp) * 100,
        );

  return (
    <aside className="journal-panel p-5 md:p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
        Искатель приключений
      </p>
      <h2 className="mt-1 font-display text-2xl text-ink md:text-3xl">
        {adventurer.display_name}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">@{adventurer.username}</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatBadge label="Уровень" value={String(adventurer.level)} accent />
        <StatBadge label="Золото" value={String(adventurer.gold)} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-sm text-ink-muted">
          <span>Опыт</span>
          <span>
            {adventurer.experience_points} / {nextLevelXp} XP
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-parchment-dark/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {adventurer.xp_to_next_level > 0 && (
          <p className="mt-2 text-xs text-ink-muted">
            До следующего уровня: {adventurer.xp_to_next_level} XP
          </p>
        )}
      </div>
    </aside>
  );
}

function StatBadge({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${
        accent
          ? "border-gold/40 bg-gold/10"
          : "border-ink/10 bg-parchment-dark/40"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="font-display text-xl text-ink">{value}</p>
    </div>
  );
}
