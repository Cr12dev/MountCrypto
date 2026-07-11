"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createWatchlist(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("watchlists")
    .insert({ name, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/watchlist");
  return data;
}

export async function renameWatchlist(id: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("watchlists")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/watchlist");
}

export async function deleteWatchlist(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("watchlists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/watchlist");
}

export async function addAsset(watchlistId: string, symbol: string, assetType: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("watchlist_assets")
    .insert({ watchlist_id: watchlistId, symbol: symbol.toUpperCase(), asset_type: assetType })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/watchlist");
  return data;
}

export async function removeAsset(assetId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: asset } = await supabase
    .from("watchlist_assets")
    .select("watchlist_id")
    .eq("id", assetId)
    .single();
  if (!asset) throw new Error("Asset not found");

  const { data: watchlist } = await supabase
    .from("watchlists")
    .select("id")
    .eq("id", asset.watchlist_id)
    .eq("user_id", user.id)
    .single();
  if (!watchlist) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("watchlist_assets")
    .delete()
    .eq("id", assetId);

  if (error) throw new Error(error.message);
  revalidatePath("/watchlist");
}

export async function reorderAsset(assetId: string, position: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: asset } = await supabase
    .from("watchlist_assets")
    .select("watchlist_id")
    .eq("id", assetId)
    .single();
  if (!asset) throw new Error("Asset not found");

  const { data: watchlist } = await supabase
    .from("watchlists")
    .select("id")
    .eq("id", asset.watchlist_id)
    .eq("user_id", user.id)
    .single();
  if (!watchlist) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("watchlist_assets")
    .update({ position })
    .eq("id", assetId);

  if (error) throw new Error(error.message);
  revalidatePath("/watchlist");
}
