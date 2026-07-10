import { NextResponse } from "next/server";
import { fetchIndexQuotes, fetchStockQuotes } from "@/lib/api/yahoo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "indices";

  try {
    const data = type === "stocks" ? await fetchStockQuotes() : await fetchIndexQuotes();
    return NextResponse.json(data);
  } catch (e) {
    console.error("Stocks API error:", e);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
