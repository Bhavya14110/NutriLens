"use client";

import { motion } from "framer-motion";
import { Apple, Leaf, PackagePlus } from "lucide-react";
import Link from "next/link";
import { ErrorBox } from "@/components/common/states";
import { AddToPantrySheet } from "@/components/pantry/add-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFruit } from "@/hooks/data";

const rows = [
  { key: "sugar", label: "Sugar", max: 25, unit: "g" },
  { key: "carbs", label: "Carbohydrates", max: 30, unit: "g" },
  { key: "protein", label: "Protein", max: 5, unit: "g" },
  { key: "fat", label: "Fat", max: 5, unit: "g" },
] as const;

export function FruitView({ name }: { name: string }) {
  const { data, isLoading, error, refetch } = useFruit(name);

  if (isLoading)
    return (
      <div className="mx-auto max-w-xl space-y-3" aria-busy="true">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  if (error)
    return (
      <div className="mx-auto max-w-xl space-y-3">
        <ErrorBox error={error} retry={() => refetch()} />
        <Button asChild variant="outline" className="w-full">
          <Link href="/scan">Search for another fruit</Link>
        </Button>
      </div>
    );
  if (!data) return null;
  const { fruit, canon } = data;

  return (
    <motion.article initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl overflow-hidden rounded-3xl border bg-card shadow-sm" aria-labelledby="fruit-title">
      <div className="relative flex items-end gap-4 bg-gradient-to-br from-accent to-secondary p-6">
        <span className="grid size-20 place-items-center rounded-3xl bg-card shadow-sm">
          <Apple className="size-10 text-primary" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold tracking-widest text-accent-foreground/70 uppercase">Fresh fruit</p>
          <h1 id="fruit-title" className="text-3xl font-semibold">
            {fruit.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            <Leaf className="mr-1 inline size-3.5" aria-hidden="true" />
            {[fruit.family, fruit.genus].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
        <div className="rounded-2xl bg-muted/60 p-4">
          <p className="text-xs text-muted-foreground">Energy</p>
          <p className="font-display text-3xl font-semibold tabular-nums">{fruit.nutr.calories}</p>
          <p className="text-xs text-muted-foreground">kcal / 100 g</p>
        </div>
        <div className="rounded-2xl bg-muted/60 p-4">
          <p className="text-xs text-muted-foreground">Natural sugar</p>
          <p className="font-display text-3xl font-semibold tabular-nums">{fruit.nutr.sugar}</p>
          <p className="text-xs text-muted-foreground">g / 100 g</p>
        </div>
        <div className="col-span-2 rounded-2xl bg-fresh/10 p-4 text-sm sm:col-span-1">
          <p className="font-medium text-fresh">Whole food</p>
          <p className="text-xs text-muted-foreground">No additives, NOVA group 1.</p>
        </div>
      </div>

      <section className="px-5 pb-5" aria-labelledby="fruit-nutr">
        <h2 id="fruit-nutr" className="mb-3 text-lg font-semibold">
          Per 100 g
        </h2>
        <ul className="space-y-3">
          {rows.map((r, i) => {
            const v = fruit.nutr[r.key];
            return (
              <li key={r.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{r.label}</span>
                  <span className="font-semibold tabular-nums">
                    {v} {r.unit}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="meter" aria-label={r.label} aria-valuemin={0} aria-valuemax={r.max} aria-valuenow={v}>
                  <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (v / r.max) * 100)}%` }} transition={{ duration: 0.6, delay: i * 0.07 }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="border-t p-5">
        <AddToPantrySheet
          seed={{ name: fruit.name, fruit: fruit.name, canon, askCanon: !canon }}
          trigger={
            <Button className="h-12 w-full text-base">
              <PackagePlus aria-hidden="true" /> Add to pantry
            </Button>
          }
        />
      </div>
    </motion.article>
  );
}
