import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getCtx } from "@/lib/session";

export const metadata: Metadata = { title: "Set up your kitchen" };

export default async function OnboardingPage() {
  const ctx = await getCtx();
  if (!ctx) redirect("/login?next=/onboarding");
  if (ctx.hh && ctx.profile?.onboarded) redirect("/home");

  return (
    <div className="grain min-h-dvh px-4 py-8">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <OnboardingForm
          email={ctx.email}
          hhName={ctx.hh?.name ?? null}
          init={{
            name: ctx.profile?.name ?? "",
            allergens: ctx.profile?.allergens ?? [],
            diet: ctx.profile?.diet ?? "none",
            alcohol_ok: ctx.profile?.alcohol_ok ?? false,
          }}
        />
      </div>
    </div>
  );
}
