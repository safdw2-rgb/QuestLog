"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import { isRootQuest } from "@/lib/quest-utils";
import type { Quest } from "@/lib/types";

import "leaflet/dist/leaflet.css";

const questIcon = L.divIcon({
  className: "world-map-marker",
  html: '<span aria-hidden="true">⚔️</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -12],
});

const DEFAULT_CENTER: [number, number] = [49.423, 26.9871];

interface WorldMapProps {
  quests: Quest[];
  focusQuestId?: number | null;
  onFocusConsumed?: () => void;
  onNavigateToQuest: (quest: Quest) => void;
}

function hasMapCoordinates(quest: Quest): quest is Quest & {
  latitude: number;
  longitude: number;
} {
  return quest.latitude != null && quest.longitude != null;
}

function MapRecenter({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1 });
  }, [map, center, zoom]);

  return null;
}

function FocusQuestPopup({
  focusQuestId,
  markerRefs,
  onFocusConsumed,
}: {
  focusQuestId: number | null | undefined;
  markerRefs: MutableRefObject<Record<number, L.Marker | null>>;
  onFocusConsumed?: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusQuestId) {
      return;
    }

    const marker = markerRefs.current[focusQuestId];
    if (!marker) {
      onFocusConsumed?.();
      return;
    }

    const { lat, lng } = marker.getLatLng();
    map.flyTo([lat, lng], 15, { duration: 1 });

    const timer = window.setTimeout(() => {
      marker.openPopup();
      onFocusConsumed?.();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [focusQuestId, map, markerRefs, onFocusConsumed]);

  return null;
}

export function WorldMap({
  quests,
  focusQuestId = null,
  onFocusConsumed,
  onNavigateToQuest,
}: WorldMapProps) {
  const markerRefs = useRef<Record<number, L.Marker | null>>({});
  const [userCenter, setUserCenter] = useState<[number, number] | null>(null);

  const mapQuests = useMemo(
    () =>
      quests.filter(
        (quest) =>
          quest.status === "active" &&
          isRootQuest(quest) &&
          hasMapCoordinates(quest),
      ),
    [quests],
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCenter([
          position.coords.latitude,
          position.coords.longitude,
        ]);
      },
      () => {
        setUserCenter(null);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (focusQuestId) {
      const focused = mapQuests.find((quest) => quest.id === focusQuestId);
      if (focused) {
        return [focused.latitude!, focused.longitude!];
      }
    }

    if (userCenter) {
      return userCenter;
    }

    if (mapQuests.length > 0) {
      const latSum = mapQuests.reduce((sum, quest) => sum + quest.latitude!, 0);
      const lngSum = mapQuests.reduce((sum, quest) => sum + quest.longitude!, 0);
      return [latSum / mapQuests.length, lngSum / mapQuests.length];
    }

    return DEFAULT_CENTER;
  }, [focusQuestId, userCenter, mapQuests]);

  const zoom = focusQuestId
    ? 15
    : userCenter
      ? 13
      : mapQuests.length === 1
        ? 12
        : mapQuests.length > 1
          ? 8
          : 11;

  return (
    <div className="world-map-panel journal-panel overflow-hidden">
      <header className="border-b border-ink/10 px-4 py-4 md:px-6">
        <h2 className="font-display text-2xl text-ink">Карта мира</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {userCenter
            ? "Карта центрирована на вашей геолокации."
            : "Активные квесты с координатами отмечены на карте OpenStreetMap."}
        </p>
      </header>

      <div className="world-map-container">
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom
          className="world-map-leaflet"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {!focusQuestId && <MapRecenter center={center} zoom={zoom} />}
          <FocusQuestPopup
            focusQuestId={focusQuestId}
            markerRefs={markerRefs}
            onFocusConsumed={onFocusConsumed}
          />
          {mapQuests.map((quest) => (
            <Marker
              key={quest.id}
              position={[quest.latitude!, quest.longitude!]}
              icon={questIcon}
              ref={(instance) => {
                markerRefs.current[quest.id] = instance;
              }}
            >
              <Popup>
                <div className="world-map-popup">
                  <p className="world-map-popup-title">{quest.title}</p>
                  <button
                    type="button"
                    className="world-map-popup-button"
                    onClick={() => onNavigateToQuest(quest)}
                  >
                    Перейти к квесту
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {mapQuests.length === 0 && (
        <p className="border-t border-ink/10 px-4 py-3 text-center text-sm text-ink-muted md:px-6">
          Меток квестов пока нет — укажите локацию при создании задания.
        </p>
      )}
    </div>
  );
}
