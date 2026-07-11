"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { NewsArticle, NewsThumbnail } from "@/lib/types/news";

const SOURCE_LABELS: Record<string, string> = {
  bbc: "BBC News",
  wsj: "Wall Street Journal",
  nytimes: "The New York Times",
  antena3: "Antena 3",
  bild: "Bild",
  economist: "The Economist",
  ft: "Financial Times",
};

const SCRAPING_API = process.env.NEXT_PUBLIC_SCRAPING_API_URL;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const CATEGORIES = [
  "All",
  "stock market today",
  "cryptocurrency news",
  "forex market",
  "commodities market",
  "economy",
];

type Tab = "all" | "yahoo" | "scraped";

export default function NewsPage() {
  const [yahooArticles, setYahooArticles] = useState<NewsArticle[]>([]);
  const [scrapedArticles, setScrapedArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    const fetchYahoo = fetch("/api/news")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setYahooArticles(data);
      })
      .catch(() => {});

    const fetchScraped = SCRAPING_API
      ? fetch(`${SCRAPING_API}/scrape?sources=bbc,nytimes&timeout=45`, { signal: AbortSignal.timeout(55000) })
          .then((r) => r.json())
          .then((data: any) => {
            const list: any[] = data?.articles ?? data;
            if (Array.isArray(list)) {
              setScrapedArticles(
                list.map((a) => ({
                  uuid: a.id,
                  title: a.title,
                  publisher: SOURCE_LABELS[a.source] ?? a.source,
                  link: a.link,
                  providerPublishTime: a.published,
                  type: "STORY" as const,
                  thumbnail: a.image_url
                    ? ({ url: a.image_url, width: 1200, height: 630, tag: "scraped" } as NewsThumbnail)
                    : null,
                  relatedTickers: [] as string[],
                })),
              );
            }
          })
          .catch(() => {})
      : Promise.resolve();

    Promise.allSettled([fetchYahoo, fetchScraped]).finally(() => setLoading(false));
  }, []);

  const articles = useMemo(() => {
    let pool: NewsArticle[];
    if (tab === "yahoo") pool = yahooArticles;
    else if (tab === "scraped") pool = scrapedArticles;
    else pool = [...yahooArticles, ...scrapedArticles];

    if (category !== "All") {
      pool = pool.filter(
        (a) =>
          a.title.toLowerCase().includes(category) ||
          a.relatedTickers.some((t) =>
            category.toLowerCase().includes(t.toLowerCase()),
          ),
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      pool = pool.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.publisher.toLowerCase().includes(q) ||
          a.relatedTickers.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return pool.sort(
      (a, b) =>
        new Date(b.providerPublishTime).getTime() -
        new Date(a.providerPublishTime).getTime(),
    );
  }, [tab, category, search, yahooArticles, scrapedArticles]);

  const scrapedUuids = useMemo(() => new Set(scrapedArticles.map((a) => a.uuid)), [scrapedArticles]);
  const isScraped = (uuid: string) => scrapedUuids.has(uuid);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8">
        <h1 className="title-sm mb-1">Market News</h1>
        <p className="text-sm text-text-secondary">
          Latest financial news from around the world
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
                category === cat
                  ? "bg-accent text-white"
                  : "bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              {cat === "All" ? "All" : cat.replace(/\b\w/g, (c) => c.toUpperCase()).replace(" news", "")}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search news..."
          className="w-full rounded border border-border bg-bg-card px-3 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-secondary focus:border-accent sm:w-60 font-mono"
        />
      </div>

      <div className="mb-6 flex gap-2 border-b border-border">
        {([
          ["all", `All (${yahooArticles.length + scrapedArticles.length})`],
          ["yahoo", `Yahoo Finance (${yahooArticles.length})`],
          ["scraped", `Scraped (${scrapedArticles.length})`],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              tab === key
                ? "border-b-2 border-accent text-accent"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-bg-card p-4">
              <div className="mb-3 h-40 w-full rounded bg-bg-hover" />
              <div className="mb-2 h-3 w-20 rounded bg-bg-hover" />
              <div className="mb-1 h-4 w-full rounded bg-bg-hover" />
              <div className="h-4 w-3/4 rounded bg-bg-hover" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-secondary">No articles found.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => {
            const scraped = isScraped(article.uuid);
            const Wrapper = scraped ? "a" : Link;
            const wrapperProps = scraped
              ? { href: article.link, target: "_blank", rel: "noopener noreferrer" }
              : { href: `/news/${article.uuid}` };
            return (
              <Wrapper
                key={article.uuid}
                {...wrapperProps}
                className="group flex flex-col rounded-lg border border-border bg-bg-card transition-colors hover:border-accent/30 hover:bg-bg-hover"
              >
                <div className="relative h-40 w-full overflow-hidden rounded-t-lg bg-bg-hover">
                  {article.thumbnail ? (
                    <Image
                      src={article.thumbnail.url}
                      alt={article.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                        <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-4 0V6" />
                        <path d="M10 6h6" />
                        <path d="M10 10h6" />
                        <path d="M10 14h4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs text-text-secondary">
                    <span>{article.publisher}</span>
                    <span>·</span>
                    <span>{timeAgo(article.providerPublishTime)}</span>
                    {scraped && (
                      <span className="ml-auto rounded bg-bg-surface px-1.5 py-0.5 text-[9px] font-mono font-medium uppercase tracking-wider text-text-secondary">
                        Scraped
                      </span>
                    )}
                  </div>
                  <h2 className="mb-2 line-clamp-2 text-sm font-medium leading-snug text-text-primary transition-colors group-hover:text-accent">
                    {article.title}
                  </h2>
                  {article.relatedTickers.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-1">
                      {article.relatedTickers.slice(0, 4).map((ticker) => (
                        <span
                          key={ticker}
                          className="rounded bg-bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-secondary font-mono"
                        >
                          {ticker}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}
