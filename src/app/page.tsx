export default function Home() {
  //bygger URL-en som sender brukeren til stravas godkjenningsside
  //client_ID: identifiserer hvilken app som ber om tilgang
  //response_type=code: vi ber om authorization code tilbake
  //redirect_uri: hvor strava skal sende brukeren tilbake etter godkjenning
  //scope=activity:read_all: ber spesifikt om lesetilgang til aktiviteter
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI}&approval_prompt=force&scope=activity:read_all`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Mitt Strava-dashboard</h1>
      {/* Knappen sender brukeren til Strava for godkjenning.
          Selve innloggingen skjer ikke i min app, men
          videresender til Strava, som håndterer selve autentiseringen. */}
      <a
        href={stravaAuthUrl}
        className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600"
      >
        Logg inn med Strava
      </a>
    </main>
  );
}