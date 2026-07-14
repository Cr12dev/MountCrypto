"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { NewsArticle } from "@/lib/types/news";

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

export function RelatedNews({ symbol }: { symbol: string }) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) setArticles(data.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Related News
        </h3>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse space-y-1">
            <div className="h-2 w-16 rounded bg-bg-card" />
            <div className="h-3 w-full rounded bg-bg-card" />
            <div className="h-3 w-3/4 rounded bg-bg-card" />
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Related News
        </h3>
        <Link href="/news" className="text-[10px] text-accent hover:underline">
          All news →
        </Link>
      </div>
      <div className="divide-y divide-border/40">
        {articles.map((article) => (
          <a
            key={article.uuid}
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block py-2.5 first:pt-0 last:pb-0"
          >
            <div className="mb-0.5 flex items-center gap-2">
              <span className="text-[10px] text-text-secondary">
                {article.publisher}
              </span>
              <span className="text-[10px] text-text-secondary">·</span>
              <span className="text-[10px] text-text-secondary">
                {timeAgo(article.providerPublishTime)}
              </span>
            </div>
            <p className="text-sm leading-snug text-text-primary transition-colors group-hover:text-accent">
              {article.title}
            </p>
            {article.relatedTickers.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {article.relatedTickers.slice(0, 4).map((ticker) => (
                  <span
                    key={ticker}
                    className="rounded bg-bg-surface px-1.5 py-0.5 text-[10px] font-mono font-medium text-text-secondary"
                  >
                    {ticker}
                  </span>
                ))}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
