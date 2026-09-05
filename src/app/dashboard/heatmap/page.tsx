import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import HeatmapClient from "./HeatmapClient";

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  map: {
    summary_polyline: string | null;
  };
};

async function getActivities(accessToken: string): Promise<StravaActivity[]> {
  const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
  const allActivities: StravaActivity[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${oneYearAgo}&per_page=200&page=${page}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );

    if (!res.ok) throw new Error(`Strava API-kall feilet: ${res.status}`);

    const batch: StravaActivity[] = await res.json();
    allActivities.push(...batch);

    if (batch.length < 200) break;
    page++;
  }

  return allActivities;
}

export default async function HeatmapPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("strava_access_token")?.value;

  if (!accessToken) {
    redirect("/");
  }

  const activities = await getActivities(accessToken);

  // Plukker ut kun rutedataen (summary_polyline), og filtrerer bort
  // aktiviteter som mangler GPS-data (f.eks. styrketrening innendørs)
  const polylines = activities
    .filter((a) => a.map?.summary_polyline)
    .map((a) => a.map.summary_polyline as string);

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link
            href="/dashboard"
            className="text-orange-100 text-sm hover:text-white mb-2 inline-block"
          >
            ← Tilbake til dashboard
          </Link>
          <h1 className="text-3xl font-bold">Mine ruter</h1>
          <p className="text-orange-100 mt-1">
            {polylines.length} aktiviteter med GPS-data, siste år
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-6 pb-16">
        <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-2">
          <HeatmapClient polylines={polylines} />
        </div>
      </div>
    </main>
  );
}