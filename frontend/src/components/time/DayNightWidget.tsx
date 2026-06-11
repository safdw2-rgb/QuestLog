"use client";

import { useEffect, useMemo, useState } from "react";

import { useNow } from "@/hooks/useNow";
import {
  formatClockTime,
  getDayNightState,
  getDefaultCoordinates,
  pointOnUpperArc,
} from "@/lib/sun-times";

const WIDGET_WIDTH = 168;
const WIDGET_HEIGHT = 108;
const ARC_PADDING = 18;

export function DayNightWidget() {
  const now = useNow(1000);
  const [coords, setCoords] = useState(getDefaultCoordinates);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // остаёмся на координатах по умолчанию
      },
      { maximumAge: 3_600_000, timeout: 5000 },
    );
  }, []);

  const state = useMemo(
    () => getDayNightState(now, coords.lat, coords.lng),
    [now, coords.lat, coords.lng],
  );

  const iconProgress = state.isDay
    ? state.progress
    : 1 - Math.min(Math.max(state.progress, 0), 1);
  const iconPoint = pointOnUpperArc(
    iconProgress,
    WIDGET_WIDTH,
    WIDGET_HEIGHT,
    ARC_PADDING,
  );

  const arcPath = describeUpperArc(WIDGET_WIDTH, WIDGET_HEIGHT, ARC_PADDING);
  const nextEventLabel = state.isDay ? "Закат" : "Восход";
  const nextEventTime = state.isDay
    ? state.times.sunset
    : now.getTime() > state.times.sunset.getTime()
      ? state.times.nextSunrise
      : state.times.sunrise;

  return (
    <div
      className={`day-night-widget ${state.isDay ? "day-night-widget-day" : "day-night-widget-night"}`}
      aria-label={`Время суток: ${state.isDay ? "день" : "ночь"}`}
    >
      <svg
        viewBox={`0 0 ${WIDGET_WIDTH} ${WIDGET_HEIGHT}`}
        className="day-night-widget-svg"
        role="img"
        aria-hidden
      >
        <defs>
          <linearGradient id="dayNightSky" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor={state.isDay ? "#7ec8f8" : "#1a2744"}
            />
            <stop
              offset="100%"
              stopColor={state.isDay ? "#d4ecff" : "#0d1320"}
            />
          </linearGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width={WIDGET_WIDTH}
          height={WIDGET_HEIGHT}
          rx="16"
          fill="url(#dayNightSky)"
        />

        <path
          d={arcPath}
          className="day-night-widget-arc"
          fill="none"
          strokeWidth="2"
        />

        <line
          x1={ARC_PADDING}
          y1={WIDGET_HEIGHT - ARC_PADDING}
          x2={WIDGET_WIDTH - ARC_PADDING}
          y2={WIDGET_HEIGHT - ARC_PADDING}
          className="day-night-widget-horizon"
          strokeWidth="1.5"
        />

        <circle
          cx={iconPoint.x}
          cy={iconPoint.y}
          r="11"
          className={
            state.isDay
              ? "day-night-widget-sun-glow"
              : "day-night-widget-moon-glow"
          }
        />

        <text
          x={iconPoint.x}
          y={iconPoint.y + 4}
          textAnchor="middle"
          className="day-night-widget-icon"
        >
          {state.isDay ? "☀️" : "🌙"}
        </text>
      </svg>

      <div className="day-night-widget-info">
        <p className="day-night-widget-clock">{formatClockTime(now)}</p>
        <p className="day-night-widget-meta">
          {nextEventLabel} {formatClockTime(nextEventTime)}
        </p>
      </div>
    </div>
  );
}

function describeUpperArc(
  width: number,
  height: number,
  padding: number,
): string {
  const startX = padding;
  const endX = width - padding;
  const baseY = height - padding;
  const radius = (endX - startX) / 2;

  return `M ${startX} ${baseY} A ${radius} ${radius} 0 0 1 ${endX} ${baseY}`;
}
