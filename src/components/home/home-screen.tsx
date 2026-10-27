"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, CupSoda, Leaf, Refrigerator, ScanLine, ScanSearch, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { ExpiryChip } from "@/components/common/badges";
import { FoodImage } from "@/components/common/food-image";
import { ErrorBox } from "@/components/common/states";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDrinks, useHome, useUseItUp } from "@/hooks/data";
import { cn } from "@/lib/utils";

function hello() {
  // IST hour, the app's home timezone
  const h = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function HomeScreen() {
  const home = useHome();
  const recs = useUseItUp();
  const drinks = useDrinks();
  const d = home.data;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground md:p-8">
        <div className="grain pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            {/* greeting depends on the clock, server and browser can land either side of an hour */}
            <p className="text-sm opacity-80" suppressHydrationWarning>
              {hello()}
            </p>
            <h1 className="text-3xl font-semibold text-primary-foreground md:text-4xl">{d?.name ? `${d.name}, what's cooking?` : "What's cooking?"}</h1>
          </div>
          <Button asChild size="lg" variant="secondary" className="h-12 rounded-full px-6 text-base shadow-lg">
            <Link href="/scan">
              <ScanLine aria-hidden="true" /> Scan
            </Link>
          </Button>
        </div>
        <dl className="relative mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            { k: "In pantry", v: d?.stats.active, icon: Refrigerator },
            { k: "Use soon", v: (d?.stats.soon ?? 0) + (d?.stats.expired ?? 0), icon: TriangleAlert },
            { k: "Saved this month", v: d?.stats.savedMonth, icon: Leaf },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl bg-white/10 px-2 py-3 backdrop-blur-sm">
              <s.icon className="mx-auto mb-1 size-4 opacity-80" aria-hidden="true" />
              <dd className="font-display text-2xl font-semibold tabular-nums">{d ? s.v : "–"}</dd>
              <dt className="text-[11px] opacity-80">{s.k}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="first">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="first" className="text-2xl font-semibold">
            Use these first
          </h2>
          <Link href="/pantry" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Pantry <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        {home.isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-36 shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : home.error && !d ? (
          <ErrorBox error={home.error} retry={() => home.refetch()} />
        ) : !d?.soon.length ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed p-5 text-sm">
            <CheckCircle2 className="size-6 shrink-0 text-fresh" aria-hidden="true" />
            <p>
              Nothing expires in the next 3 days.{" "}
              {d?.stats.active ? (
                "Your kitchen's in good shape."
              ) : (
                <Link href="/scan" className="font-medium text-primary underline">
                  Scan your groceries to start tracking.
                </Link>
              )}
            </p>
          </div>
        ) : (
          <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {d.soon.map((it, i) => (
              <motion.li
                key={it.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 6) * 0.05 }}
                className="w-36 shrink-0 snap-start"
              >
                {/* the whole card opens the pantry's "use soon" view, where the used/wasted actions live */}
                <Link href="/pantry?filter=soon" className="block h-full overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md">
                  <FoodImage src={it.image} alt="" kind={it.fruit ? "fruit" : "product"} className="aspect-[4/3] w-full bg-white" sizes="144px" contain={Boolean(it.image)} />
                  <div className="p-2.5">
                    <p className="truncate text-sm font-medium" title={it.name}>
                      {it.name}
                    </p>
                    <ExpiryChip date={it.expires_at} className="mt-1" />
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="useup">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="useup" className="text-2xl font-semibold">
            Use it up
          </h2>
          <Link href="/recipes" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            All recipes <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        {recs.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-60 rounded-3xl" />
            ))}
          </div>
        ) : recs.error ? (
          <ErrorBox error={recs.error} retry={() => recs.refetch()} />
        ) : recs.data?.recs.length ? (
          <>
            <ul className="grid gap-4 sm:grid-cols-3">
              {recs.data.recs.slice(0, 3).map((r, i) => (
                <RecipeCard key={`${r.src}-${r.id}`} r={r} i={i} compact />
              ))}
            </ul>
            {recs.data.note && <p className="mt-2 text-xs text-muted-foreground italic">{recs.data.note}.</p>}
          </>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed p-5 text-sm">
            <ScanSearch className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p>Add a few ingredients and recipe ideas will show up here.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="drink">
        <h2 id="drink" className="mb-3 text-2xl font-semibold">
          Drink idea
        </h2>
        {drinks.isLoading ? (
          <Skeleton className="h-28 rounded-3xl" />
        ) : drinks.data?.drinks[0] ? (
          <Link href="/drinks" className="group flex items-center gap-4 rounded-3xl border bg-card p-3 pr-5 transition-shadow hover:shadow-md">
            <FoodImage src={drinks.data.drinks[0].image} alt="" kind="drink" className="size-24 shrink-0 rounded-2xl" sizes="96px" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">From your leftovers</p>
              <p className="truncate font-display text-xl font-semibold group-hover:underline">{drinks.data.drinks[0].name}</p>
              <p className="truncate text-sm text-fresh">Uses {drinks.data.drinks[0].matches.join(", ").toLowerCase()}</p>
            </div>
            <ArrowRight className="size-5 text-muted-foreground" aria-hidden="true" />
          </Link>
        ) : (
          <Link href="/drinks" className={cn("flex items-center gap-3 rounded-2xl border border-dashed p-5 text-sm hover:bg-muted")}>
            <CupSoda className="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Got juice, milk or fruit to finish? See drink ideas.</span>
          </Link>
        )}
      </section>
    </div>
  );
}
