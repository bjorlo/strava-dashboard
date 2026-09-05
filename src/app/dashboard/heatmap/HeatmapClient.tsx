"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import polyline from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";

type Props = {
  polylines: string[];
};

export default function HeatmapClient({ polylines }: Props) {
  // Dekoder hver Strava-polyline (en komprimert tekststreng) til en
  // liste med faktiske [lat, lng]-koordinater kartet kan tegne
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

  // Finner et fornuftig senterpunkt for kartet: midten av den første ruten,
  // eller Bergen som fallback hvis det ikke finnes noen ruter
  const center: [number, number] =
    decodedRoutes.length > 0
      ? decodedRoutes[0][Math.floor(decodedRoutes[0].length / 2)]
      : [60.39, 5.32];

  if (decodedRoutes.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center text-neutral-400">
        Ingen ruter med GPS-data funnet
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "600px", width: "100%", borderRadius: "0.75rem" }}
    >
      <TileLayer
        // OpenStreetMap sine gratis kartfliser -- ingen API-nøkkel nødvendig
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsytere'
      />

      {/* Hver rute tegnes som en oransje linje. Lav opacity gjør at
          områder du har løpt MANGE ganger blir visuelt "varmere" ---
          jo flere overlappende linjer, jo mer solid oransje blir det. */}
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
  );
}