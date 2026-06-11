import SunCalc from "suncalc";

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  nextSunrise: Date;
  previousSunset: Date;
}

export interface DayNightState {
  isDay: boolean;
  progress: number;
  times: SunTimes;
}

const DEFAULT_LATITUDE = Number(
  process.env.NEXT_PUBLIC_SUN_LATITUDE ?? "55.7558",
);
const DEFAULT_LONGITUDE = Number(
  process.env.NEXT_PUBLIC_SUN_LONGITUDE ?? "37.6173",
);

export function getDefaultCoordinates(): { lat: number; lng: number } {
  return { lat: DEFAULT_LATITUDE, lng: DEFAULT_LONGITUDE };
}

export function getSunTimes(date: Date, lat: number, lng: number): SunTimes {
  const today = SunCalc.getTimes(date, lat, lng);
  const yesterday = SunCalc.getTimes(
    new Date(date.getTime() - 86_400_000),
    lat,
    lng,
  );
  const tomorrow = SunCalc.getTimes(
    new Date(date.getTime() + 86_400_000),
    lat,
    lng,
  );

  return {
    sunrise: today.sunrise,
    sunset: today.sunset,
    nextSunrise: tomorrow.sunrise,
    previousSunset: yesterday.sunset,
  };
}

export function getDayNightState(
  now: Date,
  lat: number,
  lng: number,
): DayNightState {
  const times = getSunTimes(now, lat, lng);
  const nowMs = now.getTime();
  const sunriseMs = times.sunrise.getTime();
  const sunsetMs = times.sunset.getTime();

  if (nowMs >= sunriseMs && nowMs <= sunsetMs) {
    const span = Math.max(sunsetMs - sunriseMs, 1);
    return {
      isDay: true,
      progress: (nowMs - sunriseMs) / span,
      times,
    };
  }

  const nightStart = nowMs > sunsetMs ? sunsetMs : times.previousSunset.getTime();
  const nightEnd = nowMs > sunsetMs ? times.nextSunrise.getTime() : sunriseMs;
  const span = Math.max(nightEnd - nightStart, 1);

  return {
    isDay: false,
    progress: (nowMs - nightStart) / span,
    times,
  };
}

export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function pointOnUpperArc(
  progress: number,
  width: number,
  height: number,
  padding: number,
): { x: number; y: number } {
  const cx = width / 2;
  const cy = height - padding;
  const radius = width / 2 - padding;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const angle = Math.PI * (1 - clamped);
  return {
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  };
}
