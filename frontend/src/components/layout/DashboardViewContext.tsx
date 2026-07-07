"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardView = "journal" | "shop" | "map";

interface DashboardViewContextValue {
  view: DashboardView;
  setView: (view: DashboardView) => void;
}

const DashboardViewContext = createContext<DashboardViewContextValue | null>(
  null,
);

export function DashboardViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<DashboardView>("journal");

  const value = useMemo(() => ({ view, setView }), [view]);

  return (
    <DashboardViewContext.Provider value={value}>
      {children}
    </DashboardViewContext.Provider>
  );
}

export function useDashboardView(): DashboardViewContextValue {
  const context = useContext(DashboardViewContext);
  if (!context) {
    throw new Error("useDashboardView must be used within DashboardViewProvider");
  }
  return context;
}
