import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activityCount, totalKm, totalMinutes, activities } = body;

    const activityList = activities
      .map(
        (a: { name: string; type: string; distanceKm: string }) =>
          `- ${a.name} (${a.type}, ${a.distanceKm} km)`
      )
      .join("\n");

    const prompt = `Du er en vennlig, motiverende treningscoach. Skriv en kort ukesoppsummering (maks 3-4 setninger) på norsk, basert på denne treningsdataen fra siste 7 dager:

Antall økter: ${activityCount}
Total distanse: ${totalKm} km
Total tid: ${totalMinutes} minutter

Aktiviteter:
${activityList || "Ingen aktiviteter denne uken"}

Vær personlig og oppmuntrende, men ikke overdrevent entusiastisk. Trekk gjerne fram noe konkret fra dataene, f.eks. en spesifikk økt eller en trend. Ikke bruk overskrifter eller punktlister, skriv som sammenhengende tekst.`;
//AI modellen
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Feil ved generering av oppsummering:", err);
    return NextResponse.json(
      { error: "Kunne ikke generere oppsummering" },
      { status: 500 }
    );
  }
}