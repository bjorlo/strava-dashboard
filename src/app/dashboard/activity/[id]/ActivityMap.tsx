"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import polylineUtil from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";

type Props = {
  encodedPolyline: string;
};

export default function ActivityMap({ encodedPolyline }: Props) {
  const route = useMemo(() => {
    try {
      return polylineUtil.decode(encodedPolyline) as [number, number][];
    } catch {
      return [];
    }
  }, [encodedPolyline]);

  if (route.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-neutral-400">
        Kunne ikke laste rutedata
      </div>
    );
  }

  const center = route[Math.floor(route.length / 2)];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "400px", width: "100%", borderRadius: "0.75rem" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsytere'
      />
      <Polyline
        positions={route}
        pathOptions={{ color: "#f97316", weight: 4 }}
      />
    </MapContainer>
  );
}