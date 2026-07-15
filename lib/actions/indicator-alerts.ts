"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type IndicatorType =
  | "rsi"
  | "macd_cross"
  | "bollinger"
  | "sma_cross"
  | "ema_cross"
  | "volatility_spike"
  | "volume_spike"
  | "consecutive"
  | "bb_width";

export type IndicatorCondition =
  | "above"
  | "below"
  | "cross_above"
  | "cross_below";

export type IndicatorAlertRow = {
  id: string;
  symbol: string;
  asset_type: string;
  indicator_type: IndicatorType;
  condition: IndicatorCondition;
  value: number;
  timeframe: string;
  triggered: boolean;
  created_at: string;
  user_id: string;
};

export async function createIndicatorAlert(
  symbol: string,
  assetType: string,
  indicatorType: IndicatorType,
  condition: IndicatorCondition,
  value: number,
  timeframe: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("indicator_alerts")
    .insert({
      user_id: user.id,
      symbol: symbol.toUpperCase(),
      asset_type: assetType,
      indicator_type: indicatorType,
      condition,
      value,
      timeframe,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/alerts");
  return data;
}

export async function deleteIndicatorAlert(alertId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("indicator_alerts")
    .delete()
    .eq("id", alertId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/alerts");
}

export async function toggleIndicatorAlertTriggered(alertId: string, triggered: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("indicator_alerts")
    .update({ triggered })
    .eq("id", alertId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/alerts");
}
