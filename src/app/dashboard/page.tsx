import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Definerer hvordan én treningsøkt fra Strava ser ut (kun feltene vi bruker).
// TypeScript bruker dette til å hjelpe oss unngå skrivefeil senere i koden.
type StravaActivity = {
  id: number;
  name: string;
  type: string;          // f.eks. "Run", "Ride", "Swim"
  distance: number;      // meter
  moving_time: number;   // sekunder
  start_date: string;    // ISO-dato, f.eks. "2026-09-01T07:30:00Z"
  average_speed: number; // meter per sekund
};

// --- Hjelpefunksjoner for å gjøre tall lesbare ---

function metersToKm(meters: number): string {
  return (meters / 1000).toFixed(1);
}

function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

// Regner om m/s til minutter per km (vanlig måte å vise løpetempo på)
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

// --- Henter data fra Strava sitt API ---

async function getActivities(accessToken: string): Promise<StravaActivity[]> {
  const res = await fetch(
    "https://www.strava.com/api/v3/athlete/activities?per_page=30",
    {
      headers: {
        // Access-tokenet sendes med som en "Bearer token" -- dette er
        // hvordan vi beviser overfor Strava at vi har lov til å hente data
        Authorization: `Bearer ${accessToken}`,
      },
      // Ikke cache dette kallet -- vi vil alltid ha ferske data
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`Strava API-kall feilet: ${res.status}`);
  }

  return res.json();
}

// Dette er en "Server Component" -- funksjonen kjører på SERVEREN før
// siden noen gang sendes til nettleseren. Det er derfor vi kan lese
// httpOnly-cookien direkte her, og hvorfor Client Secret aldri eksponeres.
export default async function Dashboard() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("strava_access_token")?.value;

  // Ingen token = ikke logget inn -> send tilbake til forsiden
  if (!accessToken) {
    redirect("/");
  }

  const activities = await getActivities(accessToken);

  // --- Regner ut enkle statistikker fra de siste 7 dagene ---
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
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Mitt treningsdashboard</h1>

      {/* --- Nøkkeltall-bokser for siste 7 dager --- */}
      <section className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{lastWeekActivities.length}</p>
          <p className="text-sm text-gray-500">Økter siste 7 dager</p>
        </div>
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">
            {metersToKm(totalDistanceThisWeek)} km
          </p>
          <p className="text-sm text-gray-500">Distanse siste 7 dager</p>
        </div>
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">
            {secondsToMinutes(totalTimeThisWeek)} min
          </p>
          <p className="text-sm text-gray-500">Tid siste 7 dager</p>
        </div>
      </section>

      {/* --- Liste over siste aktiviteter --- */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Siste aktiviteter</h2>
        <ul className="space-y-3">
          {activities.slice(0, 10).map((activity) => (
            <li
              key={activity.id}
              className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{activity.name}</p>
                <p className="text-sm text-gray-500">
                  {activity.type} · {formatDate(activity.start_date)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {metersToKm(activity.distance)} km
                </p>
                <p className="text-sm text-gray-500">
                  {paceMinPerKm(activity.average_speed)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}