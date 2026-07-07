"use client";

import dynamic from "next/dynamic";

import { MapTabIcon } from "@/components/icons/MapTabIcon";
import { useDashboardView } from "@/components/layout/DashboardViewContext";
import { useAuth } from "@/components/auth/AuthContext";
import { useEditMode } from "@/components/layout/EditModeContext";

const DayNightWidget = dynamic(
  () => import("@/components/time/DayNightWidget").then((m) => m.DayNightWidget),
  { ssr: false },
);

interface AppHeaderProps {
  effectsRefreshKey?: number;
}

export function AppHeader({ effectsRefreshKey: _effectsRefreshKey = 0 }: AppHeaderProps) {
  const { logout } = useAuth();
  const { editMode } = useEditMode();
  const { view, setView } = useDashboardView();

  return (
    <header className="site-header mb-6 w-full md:mb-5">
      <p className="site-header-kicker text-center text-xs uppercase tracking-[0.35em]">
        Квестовый дневник
      </p>
      <div className="site-header-row mt-2 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        <h1 className="site-header-title font-display text-4xl md:text-5xl">
          QuestLog
        </h1>
        <button
          type="button"
          className={`rpg-header-link ${
            view === "map" ? "rpg-header-link-active" : ""
          }`}
          onClick={() => setView("map")}
        >
          <MapTabIcon className="h-5 w-5" />
          <span>Карта</span>
        </button>
      </div>

      {/* Minimal time strip centred under the logo */}
      <div className="mt-1 flex justify-center">
        <DayNightWidget />
      </div>

      {editMode && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            className="rpg-header-link text-xs"
            onClick={logout}
          >
            Выйти
          </button>
        </div>
      )}
    </header>
  );
}
