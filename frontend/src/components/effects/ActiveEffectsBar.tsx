"use client";

import { useCallback, useEffect, useState } from "react";

import { getActiveEffects } from "@/lib/api";
import { useNow } from "@/hooks/useNow";
import { PotionIcon } from "@/components/rpg/RpgIcon";
import type { ActiveEffect } from "@/lib/types";

function formatRemaining(ms: number): string {
  if (ms <= 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getRemainingPercent(effect: ActiveEffect, nowMs: number): number {
  const expiresMs = new Date(effect.expires_at).getTime();
  const createdMs = new Date(effect.created_at).getTime();
  const total = expiresMs - createdMs;
  if (total <= 0) {
    return 0;
  }
  const remaining = Math.max(0, expiresMs - nowMs);
  return Math.min(100, Math.max(0, (remaining / total) * 100));
}

interface ActiveEffectsBarProps {
  refreshKey?: number;
  align?: "start" | "center" | "end";
}

export function ActiveEffectsBar({
  refreshKey = 0,
  align = "center",
}: ActiveEffectsBarProps) {
  const [effects, setEffects] = useState<ActiveEffect[]>([]);
  const now = useNow(1000);

  const loadEffects = useCallback(async () => {
    try {
      const response = await getActiveEffects();
      setEffects(response.items);
    } catch {
      setEffects([]);
    }
  }, []);

  useEffect(() => {
    void loadEffects();
  }, [loadEffects, refreshKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const interval = window.setInterval(() => {
      void loadEffects();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [loadEffects]);

  if (effects.length === 0) {
    return null;
  }

  const nowMs = now.getTime();

  return (
    <div
      className={`active-effects-bar flex flex-wrap items-center gap-2 ${
        align === "end" ? "justify-end" : align === "start" ? "justify-start" : "justify-center"
      }`}
    >
      <ul className="flex flex-wrap items-center gap-2">
        {effects.map((effect) => {
          const expiresMs = new Date(effect.expires_at).getTime();
          const remainingMs = Math.max(0, expiresMs - nowMs);
          const percent = getRemainingPercent(effect, nowMs);

          return (
            <li key={effect.id}>
              <div
                className="active-effect-tooltip group relative"
                title={`${effect.name} — ${formatRemaining(remainingMs)}`}
              >
                <div
                  className="active-effect-ring"
                  style={
                    {
                      "--effect-remaining": `${percent}`,
                    } as React.CSSProperties
                  }
                >
                  <span className="active-effect-icon" aria-hidden>
                    <PotionIcon
                      effectId={effect.id}
                      fallbackEmoji={effect.icon}
                      alt=""
                      className="inline-block h-6 w-6 shrink-0 object-contain"
                    />
                  </span>
                </div>
                <div
                  className="active-effect-popover pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-52 -translate-x-1/2 rounded-lg border border-emerald-400/40 bg-parchment px-3 py-2 text-left opacity-0 shadow-journal transition-opacity group-hover:opacity-100"
                  role="tooltip"
                >
                  <p className="font-display text-sm text-ink">{effect.name}</p>
                  {effect.description && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {effect.description}
                    </p>
                  )}
                  <p className="mt-2 font-mono text-xs text-emerald-800">
                    ⏳ {formatRemaining(remainingMs)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
