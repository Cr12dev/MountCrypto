"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getOrCreateAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  let { data: account } = await supabase
    .from("sandbox_accounts")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!account) {
    const { data, error } = await supabase
      .from("sandbox_accounts")
      .insert({ user_id: user.id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    account = data;
  }

  return account;
}

export async function getAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data } = await supabase
    .from("sandbox_accounts")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
}

export async function buy(symbol: string, assetType: string, quantity: number, price: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const totalCost = quantity * price;

  const { data: account } = await supabase
    .from("sandbox_accounts")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  if (!account || account.balance < totalCost) {
    throw new Error("Insufficient balance");
  }

  const { data: existing } = await supabase
    .from("sandbox_holdings")
    .select("*")
    .eq("user_id", user.id)
    .eq("symbol", symbol.toUpperCase())
    .eq("asset_type", assetType)
    .single();

  if (existing) {
    const newQty = existing.quantity + quantity;
    const newAvg = ((existing.avg_price * existing.quantity) + (price * quantity)) / newQty;
    await supabase
      .from("sandbox_holdings")
      .update({ quantity: newQty, avg_price: newAvg })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("sandbox_holdings")
      .insert({ user_id: user.id, symbol: symbol.toUpperCase(), asset_type: assetType, quantity, avg_price: price });
  }

  await supabase
    .from("sandbox_accounts")
    .update({ balance: account.balance - totalCost })
    .eq("user_id", user.id);

  await supabase
    .from("sandbox_transactions")
    .insert({ user_id: user.id, symbol: symbol.toUpperCase(), asset_type: assetType, type: "buy", quantity, price });

  revalidatePath("/dashboard/sandbox");
}

export async function sell(symbol: string, assetType: string, quantity: number, price: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: holding } = await supabase
    .from("sandbox_holdings")
    .select("*")
    .eq("user_id", user.id)
    .eq("symbol", symbol.toUpperCase())
    .eq("asset_type", assetType)
    .single();

  if (!holding || holding.quantity < quantity) {
    throw new Error("Insufficient holdings");
  }

  const totalValue = quantity * price;

  if (holding.quantity === quantity) {
    await supabase.from("sandbox_holdings").delete().eq("id", holding.id);
  } else {
    await supabase
      .from("sandbox_holdings")
      .update({ quantity: holding.quantity - quantity })
      .eq("id", holding.id);
  }

  const { data: account } = await supabase
    .from("sandbox_accounts")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  await supabase
    .from("sandbox_accounts")
    .update({ balance: (account?.balance ?? 0) + totalValue })
    .eq("user_id", user.id);

  await supabase
    .from("sandbox_transactions")
    .insert({ user_id: user.id, symbol: symbol.toUpperCase(), asset_type: assetType, type: "sell", quantity, price });

  revalidatePath("/dashboard/sandbox");
}

export async function resetAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase.from("sandbox_transactions").delete().eq("user_id", user.id);
  await supabase.from("sandbox_holdings").delete().eq("user_id", user.id);
  await supabase.from("sandbox_accounts").update({ balance: 100000 }).eq("user_id", user.id);

  revalidatePath("/dashboard/sandbox");
}
