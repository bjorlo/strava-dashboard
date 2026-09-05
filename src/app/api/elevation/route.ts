import { NextRequest, NextResponse } from "next/server";

// Open Topo Data er en gratis, nøkkelfri tjeneste for høydedata.
// Vi bruker den som en "mellommann" her (i stedet for å kalle den
// direkte fra nettleseren) for å unngå CORS-problemer.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Mangler lat/lng" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api.opentopodata.org/v1/aster30m?locations=${lat},${lng}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error(`Elevation API feilet: ${res.status}`);
    }

    const data = await res.json();
    const elevation = data.results?.[0]?.elevation ?? null;

    return NextResponse.json({ elevation });
  } catch (err) {
    console.error("Feil ved henting av høydedata:", err);
    return NextResponse.json({ elevation: null }, { status: 500 });
  }
}