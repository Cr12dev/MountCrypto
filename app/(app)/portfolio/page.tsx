import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortfolioPage } from "@/components/portfolio/PortfolioPage";

export default async function Portfolio() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <PortfolioPage userId={user.id} />;
}
