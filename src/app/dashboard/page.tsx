import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ActivityChart  from "./ActivityChart";
import Link from "next/link";
import WeeklySummary from "./WeeklySummary";

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  start_date: string;
  average_speed: number;
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

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

// Gir hver aktivitetstype et lite emoji-ikon, gjør listen lettere å skanne
function activityIcon(type: string): string {
  const icons: Record<string, string> = {
    Run: "🏃",
    Ride: "🚴",
    Swim: "🏊",
    Walk: "🚶",
    Hike: "🥾",
    WeightTraining: "🏋️",
    Yoga: "🧘",
  };
  return icons[type] ?? "⚡️";
}

// Henter ALLE aktiviteter fra det siste året. Strava returnerer maks 200
// aktiviteter per kall, så vi må "bla gjennom sidene" (paginering) for å
// være sikre på å få med alt dersom man har trent mye det siste året.
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

    if (!res.ok) {
      throw new Error(`Strava API-kall feilet: ${res.status}`);
    }

    const batch: StravaActivity[] = await res.json();
    allActivities.push(...batch);

    // Strava returnerer en tom liste når det ikke er flere sider igjen
    if (batch.length < 200) break;
    page++;
  }
  // Sorter med nyeste aktivitet først
  allActivities.sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );
  return allActivities;
}


export default async function Dashboard() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("strava_access_token")?.value;

  if (!accessToken) {
    redirect("/");
  }

  const activities = await getActivities(accessToken);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const lastWeekActivities = activities.filter(
    (a) => new Date(a.start_date) >= sevenDaysAgo
  );

  const totalDistanceThisWeek = lastWeekActivities.reduce(
    (sum, a) => sum + a.distance,
    0
  );

  const totalTimeThisWeek = lastWeekActivities.reduce(
    (sum, a) => sum + a.moving_time,
    0
  );

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* --- Header med Strava-oransje aksent --- */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <p className="text-orange-100 text-sm font-medium uppercase tracking-wide mb-1">
            Treningsoversikten min
          </p>
          <h1 className="text-3xl font-bold">Mitt treningsdashboard</h1>

          <Link
            href="/dashboard/status"
            className="inline-block mt-3 text-sm bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Årets løpestatus →
          </Link>

          <Link
            href="/dashboard/heatmap"
            className="inline-block mt-3 ml-2 text-sm bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Mine ruter →
          </Link>

          <Link
            href="/dashboard/route_finder"
            className="inline-block mt-3 ml-2 text-sm bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Finn en rute →
          </Link>
                  </div>
                </div>

  
      <div className="max-w-3xl mx-auto px-6 -mt-6">
        {/* --- Nøkkeltall-kort, hevet opp over headeren med skygge --- */}
        <section className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-5 text-center">
            <p className="text-3xl font-bold text-neutral-900">
              {lastWeekActivities.length}
            </p>
            <p className="text-sm text-neutral-500 mt-1">Økter</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-5 text-center">
            <p className="text-3xl font-bold text-orange-600">
              {metersToKm(totalDistanceThisWeek)}
            </p>
            <p className="text-sm text-neutral-500 mt-1">km denne uken</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-5 text-center">
            <p className="text-3xl font-bold text-neutral-900">
              {secondsToMinutes(totalTimeThisWeek)}
            </p>
            <p className="text-sm text-neutral-500 mt-1">minutter</p>
          </div>
               </section>

          <WeeklySummary
          activityCount={lastWeekActivities.length}
          totalKm={metersToKm(totalDistanceThisWeek)}
          totalMinutes={secondsToMinutes(totalTimeThisWeek)}
          activities={lastWeekActivities.map((a) => ({
            name: a.name,
            type: a.type,
            distanceKm: metersToKm(a.distance),
          }))}
        />
        {/* --- Graf over løpedistanse --- */}
        <ActivityChart activities={activities} />

        {/* --- Aktivitetsliste --- */}
        <section className="pb-16">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">
            Siste aktiviteter
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-neutral-100 divide-y divide-neutral-100">
            {activities.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {activityIcon(activity.type)}
                  </span>
                  <div>
                    <p className="font-medium text-neutral-900">
                      {activity.name}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {formatDate(activity.start_date)}
                    </p>
                  </div>
                </div>
                              <div className="text-right">
                {activity.distance > 0 ? (
                  <>
                    <p className="font-semibold text-neutral-900">
                      {metersToKm(activity.distance)} km
                    </p>
                    <p className="text-sm text-neutral-500">
                      {paceMinPerKm(activity.average_speed)}
                    </p>
                  </>
                ) : (
                  <p className="font-semibold text-neutral-900">
                    {secondsToMinutes(activity.moving_time)} min
                  </p>
                )}
              </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}