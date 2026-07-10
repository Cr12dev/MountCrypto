"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { NewsArticle } from "@/lib/types/news";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NewsArticlePage() {
  const params = useParams();
  const router = useRouter();
  const uuid = params.uuid as string;
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/news?uuid=${encodeURIComponent(uuid)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.uuid) setArticle(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [uuid]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-24 rounded bg-bg-card" />
          <div className="h-64 w-full rounded-lg bg-bg-card" />
          <div className="h-4 w-3/4 rounded bg-bg-card" />
          <div className="h-4 w-full rounded bg-bg-card" />
          <div className="h-4 w-full rounded bg-bg-card" />
          <div className="h-4 w-2/3 rounded bg-bg-card" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <button
          onClick={() => router.back()}
          className="mb-6 text-xs text-text-secondary transition-colors hover:text-text-primary"
        >
          ← Back
        </button>
        <p className="text-sm text-text-secondary">Article not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <button
        onClick={() => router.back()}
        className="mb-6 text-xs text-text-secondary transition-colors hover:text-text-primary"
      >
        ← Back to news
      </button>

      <article>
        <div className="mb-6 flex items-center gap-3 text-xs text-text-secondary">
          <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase text-accent">
            {article.type}
          </span>
          <span>{article.publisher}</span>
          <span>·</span>
          <span>{formatDate(article.providerPublishTime)}</span>
        </div>

        <h1 className="mb-6 text-2xl font-semibold leading-tight text-text-primary font-display">
          {article.title}
        </h1>

        {article.thumbnail && (
          <div className="relative mb-8 h-72 w-full overflow-hidden rounded-xl bg-bg-hover">
            <Image
              src={article.thumbnail.url}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>
        )}

        {article.relatedTickers.length > 0 && (
          <div className="mb-8">
            <p className="mb-2 text-xs font-medium tracking-wide uppercase text-text-secondary">
              Related Assets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {article.relatedTickers.map((ticker) => (
                <span
                  key={ticker}
                  className="rounded border border-border bg-bg-card px-2 py-1 text-xs font-medium text-text-secondary font-mono transition-colors hover:border-accent/30 hover:text-text-primary"
                >
                  {ticker}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 rounded-lg border border-border bg-bg-card p-5">
          <p className="mb-3 text-xs font-medium tracking-wide uppercase text-text-secondary">
            Article Summary
          </p>
          <p className="text-sm leading-relaxed text-text-primary">
            This article was published by <strong>{article.publisher}</strong>.
            Click the button below to read the full story on their website.
          </p>
        </div>

        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Read full article on {article.publisher}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </article>
    </div>
  );
}
