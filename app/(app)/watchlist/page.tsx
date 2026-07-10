import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WatchlistPage } from "@/components/watchlist/WatchlistPage";

export default async function WatchlistRoute() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <WatchlistPage userId={user.id} />;
}
