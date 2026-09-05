"use client";

import { useState } from "react";

type Props = {
  activityCount: number;
  totalKm: string;
  totalMinutes: number;
  activities: { name: string; type: string; distanceKm: string }[];
};

export default function WeeklySummary({
  activityCount,
  totalKm,
  totalMinutes,
  activities,
}: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateSummary() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/weekly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityCount,
          totalKm,
          totalMinutes,
          activities,
        }),
      });

      if (!res.ok) throw new Error("Noe gikk galt");

      const data = await res.json();
      setSummary(data.summary);
    } catch {
      setError("Klarte ikke å generere oppsummering. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white rounded-xl shadow-sm border border-neutral-100 p-5 mb-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-800">
          Ukens oppsummering
        </h2>
        <button
          onClick={generateSummary}
          disabled={loading}
          className="text-sm bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Genererer..." : "Generer oppsummering"}
        </button>
      </div>

      {summary && (
        <p className="text-neutral-700 leading-relaxed">{summary}</p>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!summary && !loading && !error && (
        <p className="text-neutral-400 text-sm">
          Trykk på knappen for å få en AI-generert oppsummering av ukens
          trening.
        </p>
      )}
    </section>
  );
}