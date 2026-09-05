"use client";

// "use client" er nødvendig fordi denne komponenten bruker useState
// (interaktivitet som må kjøre i nettleseren, ikke på serveren)

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type StravaActivity = {
  id: number;
  type: string;
  distance: number; // meter
  start_date: string;
};

type Period = "week" | "month" | "year";

// Grupperer aktiviteter i "bøtter" (dag/uke/måned) avhengig av valgt periode,
// og summerer distansen for hver bøtte
function buildChartData(activities: StravaActivity[], period: Period) {
  const runs = activities.filter((a) => a.type === "Run");

  if (period === "week") {
    // Siste 7 dager, én bøtte per dag
    const days = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { label: days[d.getDay()], date: d, km: 0 };
    });

    runs.forEach((run) => {
      const runDate = new Date(run.start_date);
      const bucket = buckets.find(
        (b) => b.date.toDateString() === runDate.toDateString()
      );
      if (bucket) bucket.km += run.distance / 1000;
    });

    return buckets.map((b) => ({ label: b.label, km: Math.round(b.km * 10) / 10 }));
  }

  if (period === "month") {
    // Siste 4 uker, én bøtte per uke
    const buckets = Array.from({ length: 4 }, (_, i) => ({
      label: `Uke ${4 - i}`,
      weeksAgo: 3 - i,
      km: 0,
    }));

    const now = new Date();
    runs.forEach((run) => {
      const runDate = new Date(run.start_date);
      const daysAgo = Math.floor(
        (now.getTime() - runDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const weeksAgo = Math.floor(daysAgo / 7);
      const bucket = buckets.find((b) => b.weeksAgo === weeksAgo);
      if (bucket) bucket.km += run.distance / 1000;
    });

    return buckets.map((b) => ({ label: b.label, km: Math.round(b.km * 10) / 10 }));
  }

  // period === "year": siste 12 måneder, én bøtte per måned
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
    "Jul", "Aug", "Sep", "Okt", "Nov", "Des",
  ];
  const now = new Date();
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { label: monthNames[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), km: 0 };
  });

  runs.forEach((run) => {
    const runDate = new Date(run.start_date);
    const bucket = buckets.find(
      (b) => b.year === runDate.getFullYear() && b.month === runDate.getMonth()
    );
    if (bucket) bucket.km += run.distance / 1000;
  });

  return buckets.map((b) => ({ label: b.label, km: Math.round(b.km * 10) / 10 }));
}

export default function ActivityChart({
  activities,
}: {
  activities: StravaActivity[];
}) {
  const [period, setPeriod] = useState<Period>("week");
  const data = buildChartData(activities, period);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-neutral-100 p-5 mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-800">
          Løpedistanse
        </h2>

        {/* Knapper for å bytte mellom uke/måned/år */}
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
          {(["week", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                period === p
                  ? "bg-orange-500 text-white font-medium"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {p === "week" ? "Uke" : p === "month" ? "Måned" : "År"}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#737373" }}
            axisLine={{ stroke: "#e5e5e5" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#737373" }}
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Tooltip
            formatter={(value: number) => [`${value} km`, "Distanse"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5" }}
          />
          <Bar dataKey="km" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}