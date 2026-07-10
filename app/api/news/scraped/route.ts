import { NextResponse } from "next/server";
import type { NewsArticle } from "@/lib/types/news";

const SOURCE_LABELS: Record<string, string> = {
  bbc: "BBC News",
  wsj: "Wall Street Journal",
  nytimes: "The New York Times",
  antena3: "Antena 3",
  bild: "Bild",
  economist: "The Economist",
  ft: "Financial Times",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sources = searchParams.get("sources") ?? undefined;
  const limit = searchParams.get("limit") ?? "20";

  const apiUrl = process.env.SCRAPING_API_URL;
  if (!apiUrl) {
    return NextResponse.json({ error: "SCRAPING_API_URL not configured" }, { status: 500 });
  }

  try {
    const params = new URLSearchParams({ limit });
    if (sources) params.set("sources", sources);

    const res = await fetch(`${apiUrl}/articles?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Scraping API returned ${res.status}`);

    const raw: Array<{
      source: string;
      title: string;
      url: string;
      summary: string;
      published: string;
      thumbnail: string | null;
    }> = await res.json();

    const articles: NewsArticle[] = raw.map((a) => ({
      uuid: a.url,
      title: a.title,
      publisher: SOURCE_LABELS[a.source] ?? a.source,
      link: a.url,
      providerPublishTime: a.published,
      type: "STORY",
      thumbnail: a.thumbnail
        ? { url: a.thumbnail, width: 1200, height: 630, tag: "scraped" }
        : null,
      relatedTickers: [],
    }));

    return NextResponse.json(articles);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, articles: [] });
  }
}
