import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { JoinButton } from "@/components/onboarding/join-button";
import { Button } from "@/components/ui/button";
import { getCtx } from "@/lib/session";

export const metadata: Metadata = { title: "Join a household" };

export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const clean = code.toLowerCase().trim();
  const ctx = await getCtx();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(`/join/${clean}`)}`);

  const valid = /^[a-f0-9]{8}$/.test(clean);
  const { data } = valid ? await ctx.sb.rpc("household_preview", { code: clean }) : { data: null };
  const house = data?.[0] ?? null;
  if (house && ctx.hh?.invite_code === clean) redirect("/home");

  return (
    <div className="grain flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-3xl border bg-card p-8 shadow-sm">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <Users className="size-7" aria-hidden="true" />
          </span>
          {house ? (
            <>
              <h1 className="mt-4 text-2xl font-semibold">Join {house.name}?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {Number(house.member_count)} member{Number(house.member_count) === 1 ? "" : "s"} · you&apos;ll share one pantry and shopping list.
                {ctx.hh && ` You'll switch over from ${ctx.hh.name}.`}
              </p>
              <JoinButton code={clean} onboarded={Boolean(ctx.profile?.onboarded)} />
            </>
          ) : (
            <>
              <h1 className="mt-4 text-2xl font-semibold">This invite doesn&apos;t work</h1>
              <p className="mt-1 text-sm text-muted-foreground">The link may be mistyped or the household no longer exists. Ask for a fresh invite.</p>
              <Button asChild className="mt-6 w-full">
                <Link href="/home">Go to my kitchen</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
