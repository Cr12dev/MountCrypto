"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createHolding(symbol: string, assetType: string, quantity: number, avgPrice: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("portfolio_holdings")
    .insert({ user_id: user.id, symbol: symbol.toUpperCase(), asset_type: assetType, quantity, avg_price: avgPrice })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/portfolio");
  return data;
}

export async function deleteHolding(holdingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("portfolio_holdings")
    .delete()
    .eq("id", holdingId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/portfolio");
}

export async function updateHoldingQuantity(holdingId: string, quantity: number, avgPrice: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("portfolio_holdings")
    .update({ quantity, avg_price: avgPrice })
    .eq("id", holdingId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/portfolio");
}

export async function addTransaction(holdingId: string, type: "buy" | "sell", quantity: number, price: number, executedAt?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("portfolio_transactions")
    .insert({ holding_id: holdingId, type, quantity, price, executed_at: executedAt ?? new Date().toISOString() })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/portfolio");
  return data;
}

export async function deleteTransaction(transactionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("portfolio_transactions")
    .delete()
    .eq("id", transactionId);

  if (error) throw new Error(error.message);
  revalidatePath("/portfolio");
}
