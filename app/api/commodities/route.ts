import { NextResponse } from "next/server";
import { fetchCommodityQuotes } from "@/lib/api/yahoo";

export async function GET() {
  try {
    return NextResponse.json(await fetchCommodityQuotes());
  } catch (e) {
    console.error("Commodities API error:", e);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
