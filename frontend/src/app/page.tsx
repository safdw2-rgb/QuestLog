import { HeroPanel } from "@/components/adventurer/HeroPanel";
import { QuestList } from "@/components/quest/QuestList";
import { getAdventurer, getQuests } from "@/lib/api";

const DEFAULT_ADVENTURER_ID = 1;

export default async function HomePage() {
  let adventurer = null;
  let quests: Awaited<ReturnType<typeof getQuests>> = [];
  let error: string | null = null;

  try {
    [adventurer, quests] = await Promise.all([
      getAdventurer(DEFAULT_ADVENTURER_ID),
      getQuests({ adventurer_id: DEFAULT_ADVENTURER_ID }),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось загрузить данные";
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-8 text-center md:mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-ink-muted">
          Квестовый дневник
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink md:text-5xl">
          QuestLog
        </h1>
      </header>

      {error ? (
        <div className="journal-panel border-rose-300/50 bg-rose-50/80 p-6 text-center text-rose-900">
          <p className="font-medium">Бэкенд недоступен</p>
          <p className="mt-2 text-sm">{error}</p>
          <p className="mt-3 text-xs text-rose-800">
            Запусти FastAPI на порту 8000 и перезагрузи страницу.
          </p>
        </div>
      ) : (
        adventurer && (
          <div className="grid gap-6 lg:grid-cols-[minmax(260px,300px)_1fr] lg:gap-8">
            <HeroPanel adventurer={adventurer} />
            <section>
              <h2 className="mb-4 font-display text-2xl text-ink">
                Журнал заданий
              </h2>
              <QuestList quests={quests} />
            </section>
          </div>
        )
      )}
    </main>
  );
}
