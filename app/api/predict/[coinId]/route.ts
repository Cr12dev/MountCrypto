import { NextResponse } from "next/server";

const SCRAPING_API = process.env.SCRAPING_API_URL || "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ coinId: string }> },
) {
  const { coinId } = await params;
  const { searchParams } = new URL(_request.url);
  const days = searchParams.get("days") || "30";

  try {
    const res = await fetch(`${SCRAPING_API}/predict/${coinId}?days=${days}`, {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(body, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
