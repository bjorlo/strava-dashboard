import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import ActivityMap from "./ActivityMap";

type DetailedActivity = {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  average_speed: number;
  average_heartrate?: number;
  average_cadence?: number;
  average_watts?: number;
  start_date: string;
  map: {
    polyline: string | null; // detaljert rute (mer presis enn summary_polyline)
  };
};

function metersToKm(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

function paceMinPerKm(metersPerSecond: number): string {
  if (metersPerSecond === 0) return "-";
  const secPerKm = 1000 / metersPerSecond;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")} /km`;
}

async function getActivity(
  accessToken: string,
  id: string
): Promise<DetailedActivity> {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Strava API-kall feilet: ${res.status}`);
  }

  return res.json();
}

export default async function ActivityDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("strava_access_token")?.value;

  if (!accessToken) {
    redirect("/");
  }

  const activity = await getActivity(accessToken, id);

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <Link
            href="/dashboard"
            className="text-orange-100 text-sm hover:text-white mb-2 inline-block"
          >
            ← Tilbake til dashboard
          </Link>
          <h1 className="text-3xl font-bold">{activity.name}</h1>
          <p className="text-orange-100 mt-1">
            {new Date(activity.start_date).toLocaleDateString("nb-NO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-6 pb-16">
        {/* --- Nøkkeltall --- */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatBox label="Distanse" value={`${metersToKm(activity.distance)} km`} />
          <StatBox label="Tid" value={`${secondsToMinutes(activity.moving_time)} min`} />
          <StatBox label="Høydemeter" value={`${Math.round(activity.total_elevation_gain)} m`} />
          <StatBox
            label="Snittfart"
            value={activity.distance > 0 ? paceMinPerKm(activity.average_speed) : "-"}
          />
          {activity.average_heartrate && (
            <StatBox label="Snittpuls" value={`${Math.round(activity.average_heartrate)} bpm`} />
          )}
          {activity.average_cadence && (
            <StatBox label="Kadens" value={`${Math.round(activity.average_cadence * 2)} spm`} />
          )}
          {activity.average_watts && (
            <StatBox label="Snittwatt" value={`${Math.round(activity.average_watts)} W`} />
          )}
        </section>

        {/* --- Kart over ruten --- */}
        {activity.map?.polyline && (
          <section className="bg-white rounded-xl shadow-sm border border-neutral-100 p-2">
            <ActivityMap encodedPolyline={activity.map.polyline} />
          </section>
        )}
      </div>
    </main>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-4 text-center">
      <p className="text-xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500 mt-1">{label}</p>
    </div>
  );
}