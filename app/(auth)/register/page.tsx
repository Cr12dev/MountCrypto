import { RegisterForm } from "@/components/auth/RegisterForm";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="bg-linear-to-r from-accent to-accent-gold bg-clip-text text-lg font-bold tracking-tight text-transparent">
        MountCrypto
      </Link>
      <div className="mt-8 w-full max-w-xs">
        <h1 className="text-base font-semibold">Create account</h1>
        <p className="mt-1 text-xs text-text-secondary">
          Already have one?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
        <div className="mt-5">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
