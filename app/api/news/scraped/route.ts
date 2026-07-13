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
  const _limit = searchParams.get("limit") ?? "20";

  let apiUrl = process.env.SCRAPING_API_URL;
  if (!apiUrl) {
    return NextResponse.json({ error: "SCRAPING_API_URL not configured" }, { status: 500 });
  }
  if (!/^https?:\/\//i.test(apiUrl)) apiUrl = `https://${apiUrl}`;

  try {
    const params = new URLSearchParams({ timeout: "45" });
    params.set("sources", sources ?? "bbc,nytimes,bild,economist");

    const res = await fetch(`${apiUrl}/scrape?${params}`, {
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) throw new Error(`Scraping API returned ${res.status}`);

    const body = await res.json();
    const raw = body?.articles ?? body;
    if (!Array.isArray(raw)) throw new Error("Invalid response from scraping API");

    const articles: NewsArticle[] = raw.map((a: any) => ({
      uuid: a.id,
      title: a.title,
      publisher: SOURCE_LABELS[a.source] ?? a.source,
      link: a.link,
      providerPublishTime: a.published,
      type: "STORY",
      thumbnail: a.image_url
        ? { url: a.image_url, width: 1200, height: 630, tag: "scraped" }
        : null,
      relatedTickers: [],
    }));

    return NextResponse.json(articles);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, articles: [] });
  }
}
