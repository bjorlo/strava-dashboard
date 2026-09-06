"use client";

import { useState } from "react";
import Link from "next/link";

type Match = {
  id: number;
  name: string;
  km: string;
  elevationGain: number;
  category: string;
  date: string;
};

export default function RouteFinder() {
  const [distance, setDistance] = useState(5);
  const [steepness, setSteepness] = useState<"flatt" | "middels" | "bratt">(
    "middels"
  );
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function findRoute() {
    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const res = await fetch("/api/route_suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desiredDistanceKm: distance,
          desiredSteepness: steepness,
        }),
      });

      if (!res.ok) throw new Error("Noe gikk galt");

      const data = await res.json();
      setRecommendation(data.recommendation);
      setMatches(data.matches || []);
    } catch {
      setError("Klarte ikke å finne en anbefaling. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <Link
            href="/dashboard"
            className="text-orange-100 text-sm hover:text-white mb-2 inline-block"
          >
            ← Tilbake til dashboard
          </Link>
          <h1 className="text-3xl font-bold">Finn en løperute</h1>
          <p className="text-orange-100 mt-1">
            Basert på dine tidligere løpeturer
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-6 pb-16">
        {/* --- Skjema --- */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6 mb-6">
          <div className="mb-5">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Ønsket distanse: {distance} km
            </label>
            <input
              type="range"
              min={1}
              max={30}
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Bratthet
            </label>
            <div className="flex gap-2">
              {(["flatt", "middels", "bratt"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSteepness(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    steepness === s
                      ? "bg-orange-500 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={findRoute}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? "Ser gjennom rutene dine..." : "Finn en rute"}
          </button>
        </div>

        {/* --- Resultat --- */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {recommendation && (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-2">
              Anbefaling
            </h2>
            <p className="text-neutral-700 leading-relaxed">
              {recommendation}
            </p>
          </div>
        )}

        {matches.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-100 divide-y divide-neutral-100">
            {matches.map((m, i) => (
                <Link
                 key={m.id}
                 href={`/dashboard/activity/${m.id}`}
                 className="block p-4 hover:bg-neutral-50 transition-colors"
                >

                <p className="font-medium text-neutral-900">{m.name}</p>
                <p className="text-sm text-neutral-500">
                  {m.km} km · {m.elevationGain} høydemeter · {m.category} ·{" "}
                  {new Date(m.date).toLocaleDateString("nb-NO")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}