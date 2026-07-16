import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SandboxDashboard } from "@/components/sandbox/SandboxDashboard";

export default async function SandboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <SandboxDashboard userId={user.id} />;
}
