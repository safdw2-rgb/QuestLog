"use client";

import { useCallback, useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [49.423, 26.9871];
const DEFAULT_ZOOM = 14;

const pickerIcon = L.divIcon({
  className: "location-picker-marker",
  html: '<span aria-hidden="true">📍</span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface LocationPickerMiniMapProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number | null, longitude: number | null) => void;
}

function MapClickHandler({
  onPick,
}: {
  onPick: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function MapViewController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);

  return null;
}

export function LocationPickerMiniMap({
  latitude,
  longitude,
  onChange,
}: LocationPickerMiniMapProps) {
  const hasPosition = latitude != null && longitude != null;
  const [viewCenter, setViewCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [viewZoom, setViewZoom] = useState(DEFAULT_ZOOM);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const handleFindMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocateError("Геолокация недоступна в этом браузере");
      return;
    }

    setLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setViewCenter(nextCenter);
        setViewZoom(DEFAULT_ZOOM);
        onChange(nextCenter[0], nextCenter[1]);
        setLocating(false);
      },
      () => {
        setLocateError("Не удалось определить местоположение");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [onChange]);

  function handleClearLocation() {
    onChange(null, null);
    setViewCenter(DEFAULT_CENTER);
    setViewZoom(DEFAULT_ZOOM);
  }

  return (
    <div className="location-picker-mini w-full max-w-full overflow-hidden">
      <div className="location-picker-map-wrap relative w-full max-w-full overflow-hidden">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className="location-picker-mini-map"
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapViewController center={viewCenter} zoom={viewZoom} />
          <MapClickHandler
            onPick={(lat, lng) => onChange(lat, lng)}
          />
          {hasPosition && (
            <Marker position={[latitude!, longitude!]} icon={pickerIcon} />
          )}
        </MapContainer>

        <button
          type="button"
          className="location-picker-find-me"
          onClick={handleFindMe}
          disabled={locating}
          title="Найти меня"
          aria-label="Найти меня"
        >
          {locating ? "…" : "📍"}
        </button>
      </div>

      <div className="location-picker-actions">
        <p className="location-picker-hint flex-1">
          {hasPosition
            ? `Выбрано: ${latitude!.toFixed(5)}, ${longitude!.toFixed(5)}`
            : "Кликните по карте или нажмите 📍, чтобы отметить локацию"}
        </p>
        {hasPosition && (
          <button
            type="button"
            className="location-picker-clear"
            onClick={handleClearLocation}
          >
            ❌ Сбросить
          </button>
        )}
      </div>
      {locateError && (
        <p className="location-picker-error">{locateError}</p>
      )}
    </div>
  );
}
