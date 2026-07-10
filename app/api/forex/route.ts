import { NextResponse } from "next/server";
import { fetchForexQuotes } from "@/lib/api/yahoo";

export async function GET() {
  try {
    return NextResponse.json(await fetchForexQuotes());
  } catch (e) {
    console.error("Forex API error:", e);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
