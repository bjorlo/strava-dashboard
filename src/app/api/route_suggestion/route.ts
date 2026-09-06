import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  distance: number; // meter
  moving_time: number; // sekunder
  total_elevation_gain: number; // meter
  start_date: string;
};

async function getRuns(accessToken: string): Promise<StravaActivity[]> {
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

  // Kun løpeturer er relevante for denne funksjonen
  return allActivities.filter((a) => a.type === "Run");
}

// Regner ut høydemeter per kilometer, og plasserer ruten i en av tre
// bøtter -- dette er en forenklet, grov kategorisering
function steepnessCategory(gainPerKm: number): "flatt" | "middels" | "bratt" {
  if (gainPerKm < 10) return "flatt";
  if (gainPerKm < 25) return "middels";
  return "bratt";
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("strava_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Ikke logget inn" }, { status: 401 });
  }

  try {
    const { desiredDistanceKm, desiredSteepness } = await request.json();

    const runs = await getRuns(accessToken);

    // Regner ut ekstra felt for hver løpetur: km, høydemeter/km og kategori
    const enrichedRuns = runs.map((r) => {
      const km = r.distance / 1000;
      const gainPerKm = km > 0 ? r.total_elevation_gain / km : 0;
      return {
        ...r,
        km,
        gainPerKm,
        category: steepnessCategory(gainPerKm),
      };
    });

    // Filtrer: distanse innenfor +/- 25% av ønsket, og riktig bratthetskategori
    let matches = enrichedRuns.filter((r) => {
      const distanceOk =
        r.km >= desiredDistanceKm * 0.75 && r.km <= desiredDistanceKm * 1.25;
      const steepnessOk = r.category === desiredSteepness;
      return distanceOk && steepnessOk;
    });

    // Hvis ingen treff, myk opp kravet: bare se på distanse, ignorer bratthet
    let usedFallback = false;
    if (matches.length === 0) {
      usedFallback = true;
      matches = enrichedRuns.filter(
        (r) =>
          r.km >= desiredDistanceKm * 0.75 && r.km <= desiredDistanceKm * 1.25
      );
    }

    // Sorter etter hvor nærme de er ønsket distanse, ta de 3 beste
    matches.sort(
      (a, b) =>
        Math.abs(a.km - desiredDistanceKm) - Math.abs(b.km - desiredDistanceKm)
    );
    const topMatches = matches.slice(0, 3);

    if (topMatches.length === 0) {
      return NextResponse.json({
        recommendation:
          "Fant ingen tidligere løpeturer som matcher disse kriteriene. Prøv en annen distanse eller bratthetsgrad.",
        matches: [],
      });
    }

    // Bygg en beskrivelse av kandidatene til AI-prompten
    const candidateList = topMatches
      .map(
        (r) =>
          `- "${r.name}": ${r.km.toFixed(1)} km, ${Math.round(
            r.total_elevation_gain
          )} høydemeter (${r.category}), løpt ${new Date(
            r.start_date
          ).toLocaleDateString("nb-NO")}`
      )
      .join("\n");

    const prompt = `Du er en hjelpsom løpecoach. Brukeren vil ha en løpetur på ca ${desiredDistanceKm} km med bratthetsnivå "${desiredSteepness}". Her er de beste kandidatene blant tidligere løpeturer:

${candidateList}

${usedFallback ? "Merk: ingen av disse matcher ønsket bratthetsnivå nøyaktig, men de matcher distansen." : ""}

Skriv en kort, vennlig anbefaling (2-3 setninger) på norsk om hvilken av disse som passer best og hvorfor. Nevn navnet på ruten. Ikke bruk punktlister.`;

    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const result = await model.generateContent(prompt);
    const recommendation = result.response.text();

    return NextResponse.json({
      recommendation,
      usedFallback,
      matches: topMatches.map((r) => ({
        id: r.id,
        name: r.name,
        km: r.km.toFixed(1),
        elevationGain: Math.round(r.total_elevation_gain),
        category: r.category,
        date: r.start_date,
      })),
    });
  } catch (err) {
    console.error("Feil ved rute-anbefaling:", err);
    return NextResponse.json(
      { error: "Kunne ikke generere anbefaling" },
      { status: 500 }
    );
  }
}