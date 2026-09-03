import { NextRequest, NextResponse } from "next/server";

//api-routen kalles automatisk av strava etter at bruker har trykket "autoriser" på siden
//bruker blir sendt hit med engangkode ("code") i URLEn

//jobben her er å bytte engangskoden mot ordentlig access token som kan brukes til å hente treningsdata fra
//strava sitt api senere
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code"); //engangskode strava sender
  const error = searchParams.get("error");

  if (error) { //avbryte innlogging, tilbake til forsiden
    return NextResponse.redirect(
      new URL(`/?error=${error}`, request.url)
    );
  }

  if (!code) { 
    return NextResponse.json({ error: "Mangler code" }, { status: 400 });
  }

  try {
    //bytter engangskoden mot faktisk access token, kallet skjer på serveren
    // Sende med Client Secret (ALDRI eksponeres til brukeren)
    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
        //feil hos strava
      const errText = await tokenResponse.text();
      console.error("Strava token exchange feilet:", errText);
      return NextResponse.json(
        { error: "Token exchange feilet" },
        { status: 500 }
      );
    }

    const data = await tokenResponse.json();

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.set("strava_access_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: data.expires_at - Math.floor(Date.now() / 1000),
      path: "/",
    });
    response.cookies.set("strava_refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    //sender bruker videre til dashboard, med gyldige tokens lagret
    return response;
  } catch (err) {
    console.error("Uventet feil:", err);
    return NextResponse.json({ error: "Noe gikk galt" }, { status: 500 });
  }
}