"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useNews } from "./NewsContext";
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

export function NewsRightSidebar() {
  const { isNewsOpen, closeNews, toggleNews } = useNews();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isNewsOpen) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    fetch("/api/news", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setArticles(data.slice(0, 8));
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [isNewsOpen]);

  if (!isNewsOpen) {
    return (
      <button
        onClick={toggleNews}
        className="group flex w-7 shrink-0 cursor-pointer flex-col items-center border-l border-border bg-bg-surface transition-colors hover:bg-bg-hover"
        title="Open news"
      >
        <span className="mt-4 rotate-90 whitespace-nowrap text-[10px] font-medium tracking-[0.15em] text-text-secondary uppercase transition-colors group-hover:text-text-primary">
          News
        </span>
      </button>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-display text-sm font-semibold text-text-primary">News</h2>
        <button
          onClick={closeNews}
          className="text-xs text-text-secondary transition-colors hover:text-text-primary"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-1.5">
                <div className="h-2.5 w-12 rounded bg-bg-card" />
                <div className="h-3.5 w-full rounded bg-bg-card" />
                <div className="h-3.5 w-3/4 rounded bg-bg-card" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {articles.map((article) => (
              <Link
                key={article.uuid}
                href={`/news/${article.uuid}`}
                className="group block px-4 py-3 transition-colors hover:bg-bg-hover"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green" />
                  <span className="text-[11px] text-text-secondary">
                    {article.publisher}
                  </span>
                  <span className="text-[11px] text-text-secondary">·</span>
                  <span className="text-[11px] text-text-secondary">
                    {timeAgo(article.providerPublishTime)}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm leading-snug text-text-primary transition-colors group-hover:text-accent">
                  {article.title}
                </p>
                {article.relatedTickers.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {article.relatedTickers.slice(0, 3).map((ticker) => (
                      <span
                        key={ticker}
                        className="rounded bg-bg-card px-1.5 py-0.5 text-[10px] font-medium text-text-secondary font-mono"
                      >
                        {ticker}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/news"
        onClick={closeNews}
        className="block border-t border-border px-4 py-2.5 text-center text-xs font-medium text-accent transition-colors hover:bg-bg-hover"
      >
        View all news →
      </Link>
    </aside>
  );
}
