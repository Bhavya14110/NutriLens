import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grain flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center" aria-label="NutriLens home">
          <Logo />
        </Link>
        <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold">Welcome to your kitchen</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to scan, track your pantry and waste less.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">No passwords. We&apos;ll email you a one-tap sign-in link.</p>
      </div>
    </div>
  );
}
