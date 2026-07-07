"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface FlexibleRpgLayoutProps {
  left: ReactNode;
  right: ReactNode;
  /**
   * Опциональная строка вкладок над правой панелью.
   * Рендерится между сеткой и панелью — создаёт эффект «закладок на книге».
   */
  rightTabs?: ReactNode;
}

/**
 * Модульная RPG-сетка на двух независимых эластичных панелях.
 * Каждая панель использует 9-slice border-image (UI_Pane_TextArea.png),
 * благодаря чему тянется под любой контент без искажения углов.
 *
 * На мобильных (< lg) — одна колонка, панели идут друг под другом.
 * На десктопе (lg+) — 12-колонная сетка: 4 + 8.
 * Высота правой колонки ограничена естественной высотой левой (окно Героя).
 */
export function FlexibleRpgLayout({ left, right, rightTabs }: FlexibleRpgLayoutProps) {
  const leftColRef = useRef<HTMLDivElement>(null);
  const [rightMaxHeight, setRightMaxHeight] = useState<number | undefined>();

  useEffect(() => {
    const leftCol = leftColRef.current;
    if (!leftCol) {
      return;
    }

    const syncHeight = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      if (!isDesktop) {
        setRightMaxHeight(undefined);
        return;
      }
      setRightMaxHeight(leftCol.offsetHeight);
    };

    syncHeight();

    const observer = new ResizeObserver(syncHeight);
    observer.observe(leftCol);

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    mediaQuery.addEventListener("change", syncHeight);
    window.addEventListener("resize", syncHeight);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", syncHeight);
      window.removeEventListener("resize", syncHeight);
    };
  }, []);

  return (
    <div className="grid w-full min-w-0 max-w-7xl grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-6">
      {/* ── Левая панель: профиль героя ───────────────────────────── */}
      {/* overflow-visible is required so the wallet side-tab can hang left */}
      <div
        ref={leftColRef}
        className="relative flex w-full min-w-0 flex-col overflow-visible lg:col-span-4"
      >
        <div className="rpg-elastic-panel rpg-parchment-inner flex flex-col overflow-visible">
          <div className="rpg-hero-content p-1">
            {left}
          </div>
        </div>
      </div>

      {/* ── Правая панель: журнал / магазин / карта ───────────────── */}
      <div
        className="rpg-dashboard-right-col flex w-full min-w-0 flex-col overflow-hidden lg:col-span-8 lg:min-h-0"
        style={
          rightMaxHeight != null ? { maxHeight: rightMaxHeight } : undefined
        }
      >
        {/* Вкладки-закладки над панелью */}
        {rightTabs && (
          <div
            className="rpg-game-tab-nav shrink-0 flex-nowrap overflow-x-auto px-1 md:flex-wrap"
            style={{ scrollbarWidth: "none" }}
          >
            {rightTabs}
          </div>
        )}
        <div className="rpg-elastic-panel rpg-parchment-inner flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="rpg-scrollable-content flex min-h-0 flex-1 flex-col overflow-hidden p-1">
            {right}
          </div>
        </div>
      </div>
    </div>
  );
}
