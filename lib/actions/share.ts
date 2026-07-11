"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function generateWatchlistShareToken(watchlistId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const token = crypto.randomUUID();

  const { error } = await supabase
    .from("watchlists")
    .update({ share_token: token })
    .eq("id", watchlistId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/watchlist");
  return token;
}

export async function revokeWatchlistShareToken(watchlistId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("watchlists")
    .update({ share_token: null })
    .eq("id", watchlistId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/watchlist");
}

export async function generatePortfolioShareToken() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const token = crypto.randomUUID();

  const { data: existing } = await supabase
    .from("portfolio_shares")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("portfolio_shares")
      .update({ share_token: token, expires_at: null })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("portfolio_shares")
      .insert({ share_token: token, user_id: user.id });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/portfolio");
  return token;
}

export async function revokePortfolioShareToken() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("portfolio_shares")
    .delete()
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/portfolio");
}
