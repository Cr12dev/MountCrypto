"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <Input label="Email" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input label="Password" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="text-xs text-red">{error}</p>}
      <Button type="submit" className="w-full justify-center">
        Sign in
      </Button>
    </form>
  );
}
