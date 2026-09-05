"use client";

import { useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, useMapEvents } from "react-leaflet";
import polyline from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";

type Props = {
  polylines: string[];
};

// Egen liten komponent som "lytter" på kartet og rapporterer
// museposisjon oppover til foreldrekomponenten
function MouseTracker({
  onMove,
}: {
  onMove: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    mousemove: (e) => {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function HeatmapClient({ polylines }: Props) {
  const [elevation, setElevation] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [loadingElevation, setLoadingElevation] = useState(false);

  // Holder styr på "forsinkelsen" (debounce) slik at vi ikke sender
  // en ny forespørsel for hver eneste pikselbevegelse av musen
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const decodedRoutes = useMemo(() => {
    return polylines
      .map((p) => {
        try {
          return polyline.decode(p) as [number, number][];
        } catch {
          return null;
        }
      })
      .filter((r): r is [number, number][] => r !== null && r.length > 0);
  }, [polylines]);

  const center: [number, number] =
    decodedRoutes.length > 0
      ? decodedRoutes[0][Math.floor(decodedRoutes[0].length / 2)]
      : [60.39, 5.32];

  function handleMouseMove(lat: number, lng: number) {
    setCoords({ lat, lng });

    // Nullstill forrige "venting" hvis musen fortsatt beveger seg
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    // Vent 300ms etter siste musebevegelse før vi faktisk henter høyden
    debounceTimer.current = setTimeout(async () => {
      setLoadingElevation(true);
      try {
        const res = await fetch(
          `/api/elevation?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}`
        );
        const data = await res.json();
        setElevation(data.elevation);
      } catch {
        setElevation(null);
      } finally {
        setLoadingElevation(false);
      }
    }, 900);
  }

  if (decodedRoutes.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center text-neutral-400">
        Ingen ruter med GPS-data funnet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Høydeboks -- flyter over kartet, oppe til høyre */}
      <div className="absolute top-3 right-3 z-[1000] bg-white rounded-lg shadow-md px-4 py-2 text-sm">
        {coords ? (
          <>
            <p className="font-semibold text-neutral-900">
              {loadingElevation
                ? "Henter høyde..."
                : elevation !== null
                ? `${Math.round(elevation)} moh`
                : "Ingen høydedata"}
            </p>
            <p className="text-neutral-400 text-xs">
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </p>
          </>
        ) : (
          <p className="text-neutral-400">Beveg musen over kartet</p>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "600px", width: "100%", borderRadius: "0.75rem" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsytere'
        />

        <MouseTracker onMove={handleMouseMove} />

        {decodedRoutes.map((route, i) => (
          <Polyline
            key={i}
            positions={route}
            pathOptions={{
              color: "#f97316",
              weight: 3,
              opacity: 0.35,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}