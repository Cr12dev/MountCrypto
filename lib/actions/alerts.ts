"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAlert(
  symbol: string,
  assetType: string,
  targetPrice: number,
  direction: "above" | "below"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("price_alerts")
    .insert({ user_id: user.id, symbol: symbol.toUpperCase(), asset_type: assetType, target_price: targetPrice, direction })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/alerts");
  return data;
}

export async function deleteAlert(alertId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("price_alerts")
    .delete()
    .eq("id", alertId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/alerts");
}

export async function toggleAlertTriggered(alertId: string, triggered: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("price_alerts")
    .update({ triggered })
    .eq("id", alertId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/alerts");
}
