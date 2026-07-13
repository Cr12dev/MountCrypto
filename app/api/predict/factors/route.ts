import { NextResponse } from "next/server";

let SCRAPING_API = process.env.SCRAPING_API_URL || "http://localhost:8000";
if (!/^https?:\/\//i.test(SCRAPING_API)) SCRAPING_API = `https://${SCRAPING_API}`;

export async function GET() {
  try {
    const res = await fetch(`${SCRAPING_API}/predict/factors`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Prediction service unavailable" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
