import { fetchCoinMarkets } from "@/lib/api/coingecko";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const perPage = Number(searchParams.get("per_page")) || 50;

  try {
    const coins = await fetchCoinMarkets(page, perPage);
    return NextResponse.json(coins);
  } catch {
    return NextResponse.json({ error: "Failed to fetch coins" }, { status: 502 });
  }
}
