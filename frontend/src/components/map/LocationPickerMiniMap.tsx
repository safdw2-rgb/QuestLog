"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useMapEvents({
    click(event) {
      onPickRef.current(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

/** Moves the map only when `token` changes (Find me / Clear / initial). */
function MapViewController({
  center,
  zoom,
  token,
}: {
  center: [number, number];
  zoom: number;
  token: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (token < 0) {
      return;
    }
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom, token]);

  return null;
}

export function LocationPickerMiniMap({
  latitude,
  longitude,
  onChange,
}: LocationPickerMiniMapProps) {
  const hasPosition = latitude != null && longitude != null;
  const initialCenter: [number, number] =
    hasPosition ? [latitude!, longitude!] : DEFAULT_CENTER;

  const [viewCenter, setViewCenter] = useState<[number, number]>(initialCenter);
  const [viewZoom, setViewZoom] = useState(DEFAULT_ZOOM);
  const [viewToken, setViewToken] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const placeMarker = useCallback((lat: number, lng: number) => {
    onChangeRef.current(lat, lng);
  }, []);

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
        setViewToken((token) => token + 1);
        onChangeRef.current(nextCenter[0], nextCenter[1]);
        setLocating(false);
      },
      () => {
        setLocateError("Не удалось определить местоположение");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  function handleClearLocation() {
    onChangeRef.current(null, null);
    setViewCenter(DEFAULT_CENTER);
    setViewZoom(DEFAULT_ZOOM);
    setViewToken((token) => token + 1);
  }

  return (
    <div className="location-picker-mini w-full max-w-full overflow-hidden">
      <div className="location-picker-map-wrap relative w-full max-w-full overflow-hidden">
        <MapContainer
          center={initialCenter}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className="location-picker-mini-map"
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapViewController
            center={viewCenter}
            zoom={viewZoom}
            token={viewToken}
          />
          <MapClickHandler onPick={placeMarker} />
          {hasPosition && (
            <Marker
              position={[latitude!, longitude!]}
              icon={pickerIcon}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const next = event.target.getLatLng();
                  placeMarker(next.lat, next.lng);
                },
              }}
            />
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
