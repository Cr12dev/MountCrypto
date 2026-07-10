import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="bg-linear-to-r from-accent to-accent-gold bg-clip-text text-lg font-bold tracking-tight text-transparent">
        MountCrypto
      </Link>
      <div className="mt-8 w-full max-w-xs">
        <h1 className="text-base font-semibold">Sign in</h1>
        <p className="mt-1 text-xs text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Register
          </Link>
        </p>
        <div className="mt-5">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
