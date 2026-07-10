"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, updateCurrency } from "@/lib/actions/profile";

const CURRENCIES = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
];

export function SettingsPage({ userId }: { userId: string }) {
  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("display_name, currency")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name ?? "");
          setCurrency(data.currency ?? "USD");
        }
      });
  }, [userId]);

  async function handleSaveProfile() {
    setSaving("profile");
    setMessage(null);
    try {
      await updateProfile(displayName);
      setMessage({ type: "success", text: "Profile updated" });
    } catch {
      setMessage({ type: "error", text: "Failed to save profile" });
    }
    setSaving(null);
  }

  async function handleSaveCurrency() {
    setSaving("currency");
    setMessage(null);
    try {
      await updateCurrency(currency);
      setMessage({ type: "success", text: "Currency preference saved" });
    } catch {
      setMessage({ type: "error", text: "Failed to save currency" });
    }
    setSaving(null);
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="title-sm mb-6">Settings</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-bg-card/30 p-4">
          <h2 className="mb-3 text-xs font-medium text-text-primary">Profile</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-text-secondary">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded border border-border bg-bg-surface px-2.5 py-1.5 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving === "profile"}
              className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              {saving === "profile" ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg-card/30 p-4">
          <h2 className="mb-3 text-xs font-medium text-text-primary">Display Currency</h2>
          <p className="mb-3 text-xs text-text-secondary">Used for portfolio values and prices across the app</p>
          <div className="space-y-3">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded border border-border bg-bg-surface px-2.5 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <button
              onClick={handleSaveCurrency}
              disabled={saving === "currency"}
              className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              {saving === "currency" ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <p className={`mt-4 text-xs ${message.type === "success" ? "text-green" : "text-red"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
