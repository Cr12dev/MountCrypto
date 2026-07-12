import YahooFinance from "yahoo-finance2";
import type { NewsArticle } from "@/lib/types/news";

let _yahooFinance: typeof YahooFinance | null = null;
function getYahooFinance() {
  if (!_yahooFinance) _yahooFinance = new YahooFinance();
  return _yahooFinance;
}

const NEWS_QUERIES = [
  "stock market today",
  "cryptocurrency news",
  "forex market",
  "commodities market",
  "economy",
];

export async function fetchNews(category?: string): Promise<NewsArticle[]> {
  const seen = new Set<string>();
  const articles: NewsArticle[] = [];

  const queries = category ? [category] : NEWS_QUERIES;

  const results = await Promise.allSettled(
    queries.map((q) =>
      getYahooFinance().search(q, {
        quotesCount: 0,
        newsCount: 15,
      } as any),
    ),
  );

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const searchResult = result.value as any;
    const news: any[] = searchResult?.news ?? [];
    for (const item of news) {
      if (!item.uuid || seen.has(item.uuid)) continue;
      seen.add(item.uuid);
      articles.push({
        uuid: item.uuid,
        title: item.title ?? "",
        publisher: item.publisher ?? "",
        link: item.link ?? "",
        providerPublishTime:
          item.providerPublishTime instanceof Date
            ? item.providerPublishTime.toISOString()
            : new Date().toISOString(),
        type: item.type ?? "STORY",
        thumbnail: item.thumbnail?.resolutions?.[0]
          ? {
              url: item.thumbnail.resolutions[0].url,
              width: item.thumbnail.resolutions[0].width,
              height: item.thumbnail.resolutions[0].height,
              tag: item.thumbnail.resolutions[0].tag,
            }
          : null,
        relatedTickers: item.relatedTickers ?? [],
      });
    }
  }

  return articles.sort(
    (a, b) =>
      new Date(b.providerPublishTime).getTime() -
      new Date(a.providerPublishTime).getTime(),
  );
}
