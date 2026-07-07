"use client";

import { useEffect, useState } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { DashboardViewProvider } from "@/components/layout/DashboardViewContext";
import { FlexibleRpgLayout } from "@/components/layout/FlexibleRpgLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthContext";
import { EditModeProvider } from "@/components/layout/EditModeContext";
import { QuestDashboard } from "@/components/quest/QuestDashboard";
import { getFactions, getQuests } from "@/lib/api";
import { RPG_UI_THEME } from "@/lib/rpg-assets";
import type { Faction, Quest } from "@/lib/types";

export default function HomePageClient() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { adventurer } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [effectsRefreshKey, setEffectsRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [questPage, factionList] = await Promise.all([
          getQuests({ fetch_all: true }),
          getFactions(),
        ]);

        if (!cancelled) {
          setQuests(questPage.items);
          setFactions(factionList);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Не удалось загрузить данные",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!adventurer) {
    return null;
  }

  return (
    <EditModeProvider>
      <DashboardViewProvider>
        {/*
          Фон библиотеки живёт в собственном изолированном слое, а не как
          background-attachment: fixed на скроллящемся контейнере — так Safari
          не перерисовывает тяжёлую текстуру при каждом кадре скролла.
        */}
        <div
          aria-hidden
          className="fixed inset-0 -z-50 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: `url('${RPG_UI_THEME.libraryBg}')`,
            transform: "translate3d(0,0,0)",
            willChange: "transform",
          }}
        />
        <main className="rpg-library-screen questlog-app min-h-screen overflow-x-hidden px-6 py-6 lg:px-8 lg:py-10">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center">
            <AppHeader effectsRefreshKey={effectsRefreshKey} />

            <div className="mt-4 w-full md:mt-6">
              {loading ? (
                <FlexibleRpgLayout
                  left={null}
                  right={
                    <div className="flex min-h-[10rem] items-center justify-center p-4 text-center">
                      <p className="font-display text-lg text-[#3a2214]">
                        Загружаем квесты…
                      </p>
                    </div>
                  }
                />
              ) : error ? (
                <FlexibleRpgLayout
                  left={null}
                  right={
                    <div className="p-4 text-center text-[#6b2a2a]">
                      <p className="font-medium">Не удалось загрузить дашборд</p>
                      <p className="mt-2 text-sm">{error}</p>
                      <p className="mt-3 text-xs opacity-80">
                        Проверьте, что бэкенд запущен на порту 8000.
                      </p>
                    </div>
                  }
                />
              ) : (
                <QuestDashboard
                  initialAdventurer={adventurer}
                  initialQuests={quests}
                  initialFactions={factions}
                  onEffectsRefresh={() => setEffectsRefreshKey((key) => key + 1)}
                />
              )}
            </div>
          </div>
        </main>
      </DashboardViewProvider>
    </EditModeProvider>
  );
}
