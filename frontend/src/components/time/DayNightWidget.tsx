"use client";

import { useEffect, useMemo, useState } from "react";

import { useNow } from "@/hooks/useNow";
import {
  formatClockTime,
  getDayNightState,
  getDefaultCoordinates,
} from "@/lib/sun-times";

export function DayNightWidget() {
  const now = useNow(1000);
  const [coords, setCoords] = useState(getDefaultCoordinates);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { maximumAge: 3_600_000, timeout: 5000 },
    );
  }, []);

  const state = useMemo(
    () => getDayNightState(now, coords.lat, coords.lng),
    [now, coords.lat, coords.lng],
  );

  const nextEventLabel = state.isDay ? "Закат" : "Восход";
  const nextEventTime = state.isDay
    ? state.times.sunset
    : now.getTime() > state.times.sunset.getTime()
      ? state.times.nextSunrise
      : state.times.sunrise;

  return (
    <span
      className="day-night-strip"
      aria-label={`Сейчас ${formatClockTime(now)}, ${nextEventLabel} в ${formatClockTime(nextEventTime)}`}
    >
      {!state.isDay && (
        <img
          src="/rpg-ui/System/Icon_moon.png"
          alt=""
          aria-hidden
          width={16}
          height={16}
          style={{ imageRendering: 'pixelated', display: 'inline-block', verticalAlign: 'middle' }}
        />
      )}
      <span>{formatClockTime(now)}</span>
      <span style={{ opacity: 0.6 }}>|</span>
      <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.06em' }}>
        {nextEventLabel} {formatClockTime(nextEventTime)}
      </span>
    </span>
  );
}
