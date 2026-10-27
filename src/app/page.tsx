import { ArrowRight, BellRing, HeartPulse, ShieldAlert, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LoopAnimation } from "@/components/landing/loop";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: { absolute: "NutriLens — Scan it, know it, use it up" } };

const perks = [
  { icon: HeartPulse, title: "Know what you're eating", body: "Nutri-Score, NOVA processing level, sugar, salt and fat at a glance — plus better swaps from the same shelf." },
  { icon: ShieldAlert, title: "Allergy-safe households", body: "Set everyone's allergies once. Any scan that contains one turns red and names who should skip it." },
  { icon: BellRing, title: "Nothing forgotten at the back", body: "Smart expiry guesses and a 9am nudge when food is about to turn. Cook it, don't bin it." },
  { icon: Users, title: "One kitchen, shared", body: "Hostel room, flat or family — a shared pantry and shopping list with a ₹ estimate." },
];

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {/* AUTH DISABLED: was a "Sign in" link to /login */}
          <Button asChild variant="ghost">
            <Link href="/home">Open app</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-6 pb-16 md:grid-cols-2 md:pt-12">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Made for Indian kitchens · works anywhere</p>
            <h1 className="text-5xl leading-[1.02] font-semibold md:text-6xl">
              Scan it.
              <br />
              Know it.
              <br />
              <span className="text-primary italic">Use it up.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              NutriLens tells you what&apos;s really in your food, keeps track of your pantry and turns what&apos;s about to expire into tonight&apos;s dinner.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-6 text-base">
                <Link href="/home">
                  Get started free <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
            {/* AUTH DISABLED: <p className="mt-3 text-xs text-muted-foreground">No password needed. Sign in with an email link or Google.</p> */}
            <p className="mt-3 text-xs text-muted-foreground">No sign-up needed — jump straight in.</p>
          </div>
          <LoopAnimation />
        </section>

        <section className="border-y bg-card/60">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
            {perks.map((p) => (
              <div key={p.title}>
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <p.icon className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-xl font-semibold">{p.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-3xl font-semibold md:text-4xl">Less waste. Better choices. Same groceries.</h2>
          <p className="mt-3 text-muted-foreground">Powered by Open Food Facts, Fruityvice, Spoonacular, TheMealDB and TheCocktailDB.</p>
          <Button asChild size="lg" className="mt-8 h-12 rounded-full px-6 text-base">
            <Link href="/home">
              Start scanning <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">NutriLens · Product data © Open Food Facts contributors (ODbL)</footer>
    </div>
  );
}
