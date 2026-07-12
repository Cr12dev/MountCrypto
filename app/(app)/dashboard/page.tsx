import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BentoOverview } from "@/components/dashboard/BentoOverview";
import {
  fetchIndexQuotes,
  fetchStockQuotes,
  fetchForexQuotes,
  fetchCommodityQuotes,
} from "@/lib/api/yahoo";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [indices, stocks, forex, commodities] = await Promise.allSettled([
    fetchIndexQuotes(),
    fetchStockQuotes(),
    fetchForexQuotes(),
    fetchCommodityQuotes(),
  ]);

  return (
    <BentoOverview
      initialIndices={indices.status === "fulfilled" ? indices.value : []}
      initialStocks={stocks.status === "fulfilled" ? stocks.value : []}
      initialForex={forex.status === "fulfilled" ? forex.value : []}
      initialCommodities={commodities.status === "fulfilled" ? commodities.value : []}
    />
  );
}
