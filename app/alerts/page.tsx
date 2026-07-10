import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AlertsPage } from "@/components/alerts/AlertsPage";

export default async function Alerts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <AlertsPage userId={user.id} />;
}
