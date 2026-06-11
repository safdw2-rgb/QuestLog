import { DayNightWidget } from "@/components/time/DayNightWidget";

export function AppHeader() {
  return (
    <header className="site-header mb-8 md:mb-10">
      <p className="text-center text-xs uppercase tracking-[0.35em] text-ink-muted">
        Квестовый дневник
      </p>
      <div className="site-header-row mt-2 flex items-center justify-center gap-4 sm:gap-6">
        <h1 className="font-display text-4xl text-ink md:text-5xl">QuestLog</h1>
        <DayNightWidget />
      </div>
    </header>
  );
}
