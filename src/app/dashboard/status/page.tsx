import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

// Utvidet type som inkluderer feltene vi trenger for denne siden.
// Merk "?" -- disse feltene er valgfrie fordi Strava kun sender dem
// hvis brukeren faktisk brukte pulsmåler/power meter under økten.
type StravaActivity = {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
  average_speed: number;
  average_heartrate?: number;
  average_cadence?: number;
  average_watts?: number;
};

function metersToKm(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function paceMinPerKm(metersPerSecond: number): string {
  if (metersPerSecond === 0) return "-";
  const secPerKm = 1000 / metersPerSecond;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")} /km`;
}

// Regner ut gjennomsnittet av et gitt felt, men kun blant øktene som
// faktisk HAR det feltet (hopper over økter uten pulsmåler o.l.)
function average(
  activities: StravaActivity[],
  field: keyof StravaActivity
): number | null {
  const values = activities
    .map((a) => a[field])
    .filter((v): v is number => typeof v === "number");

  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

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

export default async function TreningsStatus() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("strava_access_token")?.value;

  if (!accessToken) {
    redirect("/");
  }

  const activities = await getActivities(accessToken);
  const runs = activities.filter((a) => a.type === "Run");
  const rides = activities.filter((a) => a.type === "Ride");

  const totalRunDistance = runs.reduce((sum, r) => sum + r.distance, 0);
  const avgRunDistance = runs.length > 0 ? totalRunDistance / runs.length : 0;
  const avgPace = average(runs, "average_speed");
  const avgHeartrateRun = average(runs, "average_heartrate");
  const avgCadence = average(runs, "average_cadence");
  const avgWatts = average(rides, "average_watts");
  const avgHeartrateRide = average(rides, "average_heartrate");

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
          <h1 className="text-3xl font-bold">Min treningsstatus</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-6 pb-16">
        {/* --- Løping --- */}
        <section className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">
            🏃 Løping (siste år)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <StatBox
              label="Total distanse"
              value={`${metersToKm(totalRunDistance)} km`}
            />
             <StatBox
              label="Antall løpeturer"
              value={runs.length.toString()}
            />
            <StatBox
              label="Snittdistanse"
              value={runs.length > 0 ? `${metersToKm(avgRunDistance)} km` : "Ingen data"}
            />
            <StatBox
              label="Snittfart"
              value={avgPace ? paceMinPerKm(avgPace) : "Ingen data"}
            />
            <StatBox
              label="Snittpuls"
              value={
                avgHeartrateRun
                  ? `${Math.round(avgHeartrateRun)} bpm`
                  : "Ingen pulsdata"
              }
            />
            <StatBox
              label="Snittkadens"
              value={
                avgCadence
                  ? `${Math.round(avgCadence * 2)} spm`
                  : "Ingen kadensdata"
              }
            />
          </div>
        </section>

        {/* --- Sykling --- */}
        {rides.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6">
            <h2 className="text-lg font-semibold text-neutral-800 mb-4">
              🚴 Sykling (siste år)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <StatBox
                label="Antall sykkeløkter"
                value={rides.length.toString()}
              />
              <StatBox
                label="Snittwatt"
                value={avgWatts ? `${Math.round(avgWatts)} W` : "Ingen wattdata"}
              />
              <StatBox
                label="Snittpuls"
                value={
                  avgHeartrateRide
                    ? `${Math.round(avgHeartrateRide)} bpm`
                    : "Ingen pulsdata"
                }
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// Liten gjenbrukbar komponent for hver statistikk-boks
function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-50 rounded-lg p-4">
      <p className="text-xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500 mt-1">{label}</p>
    </div>
  );
}