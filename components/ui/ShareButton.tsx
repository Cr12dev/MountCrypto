"use client";

import { useState } from "react";

interface ShareButtonProps {
  onGenerate: () => Promise<string>;
  onRevoke: () => Promise<void>;
  hasToken: boolean;
  currentToken?: string | null;
}

export function ShareButton({ onGenerate, onRevoke, hasToken, currentToken }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(currentToken ?? null);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const t = await onGenerate();
    setToken(t);
  }

  async function handleRevoke() {
    await onRevoke();
    setToken(null);
    setOpen(false);
  }

  function handleCopy() {
    if (!token) return;
    navigator.clipboard.writeText(`${window.location.origin}/shared/watchlist/${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const url = token ? `${window.location.origin}/shared/watchlist/${token}` : "";

  return (
    <div className="relative">
      {!hasToken ? (
        <button
          onClick={handleShare}
          className="rounded border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-text-secondary hover:text-text-primary"
        >
          Share
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(!open)}
            className="rounded border border-accent/50 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:border-accent"
          >
            Shared
          </button>
          {open && (
            <div className="absolute right-0 top-full z-10 mt-1 w-72 rounded-lg border border-border bg-bg-card p-3 shadow-lg">
              <p className="mb-1 text-xs text-text-secondary">Share link</p>
              <div className="flex items-center gap-1">
                <input
                  readOnly
                  value={url}
                  className="flex-1 rounded border border-border bg-bg-surface px-2 py-1 font-mono text-xs text-text-primary"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopy}
                  className="shrink-0 rounded bg-accent px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <button
                onClick={handleRevoke}
                className="mt-2 text-xs text-text-secondary transition-colors hover:text-red"
              >
                Revoke share link
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
