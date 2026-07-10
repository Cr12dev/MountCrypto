import { fetchCoinChart } from "@/lib/api/coingecko";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ coinId: string }> },
) {
  const { coinId } = await params;
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days")) || 1;

  try {
    const chart = await fetchCoinChart(coinId, days);
    return NextResponse.json(chart);
  } catch {
    return NextResponse.json({ error: "Coin not found" }, { status: 404 });
  }
}
