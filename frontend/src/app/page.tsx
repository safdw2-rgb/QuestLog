import { AppHeader } from "@/components/layout/AppHeader";
import { QuestDashboard } from "@/components/quest/QuestDashboard";
import { getAdventurer, getFactions, getQuests } from "@/lib/api";

const DEFAULT_ADVENTURER_ID = 1;

export default async function HomePage() {
  let adventurer = null;
  let quests: Awaited<ReturnType<typeof getQuests>> = [];
  let factions: Awaited<ReturnType<typeof getFactions>> = [];
  let error: string | null = null;

  try {
    [adventurer, quests, factions] = await Promise.all([
      getAdventurer(DEFAULT_ADVENTURER_ID),
      getQuests({ adventurer_id: DEFAULT_ADVENTURER_ID }),
      getFactions(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Не удалось загрузить данные";
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl overflow-x-hidden px-4 py-6 md:px-8 md:py-10">
      <AppHeader />

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
          <QuestDashboard
            initialAdventurer={adventurer}
            initialQuests={quests}
            initialFactions={factions}
            adventurerId={DEFAULT_ADVENTURER_ID}
          />
        )
      )}
    </main>
  );
}
