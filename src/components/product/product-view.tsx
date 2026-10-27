"use client";

import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertOctagon, ArrowRightLeft, Check, CircleHelp, Info, PackagePlus, ScanLine, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { NovaBadge, NutriScore } from "@/components/common/badges";
import { CanonPicker } from "@/components/common/canon-picker";
import { FoodImage } from "@/components/common/food-image";
import { Empty, ErrorBox } from "@/components/common/states";
import { AddToPantrySheet } from "@/components/pantry/add-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProduct, useSwaps } from "@/hooks/data";
import { allergenLabel } from "@/lib/allergens";
import { getCanon } from "@/lib/canon";
import { api, HttpError } from "@/lib/fetcher";
import { additiveLabel, bars, NOVA_TEXT } from "@/lib/health";
import { cn } from "@/lib/utils";
import { NutrientBars, SugarCompare } from "./nutrient-bars";

const rise = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

export function ProductView({ code }: { code: string }) {
  const { data, isLoading, error, refetch } = useProduct(code);
  const qc = useQueryClient();
  const swapsOn = Boolean(data?.prod.grade && data.prod.grade !== "a");
  const swaps = useSwaps(code, swapsOn);

  if (isLoading) return <ProductSkeleton />;
  if (error) {
    if (error instanceof HttpError && error.status === 404) {
      return (
        <div className="mx-auto max-w-lg space-y-3">
          <Empty
            icon={CircleHelp}
            title="We don't know this one yet"
            body={`Barcode ${code} isn't on Open Food Facts. You can still add it to your pantry by name.`}
            cta={{ href: "/scan", label: "Scan something else" }}
          />
          <AddToPantrySheet
            seed={{ name: "", barcode: code, canon: null, askCanon: true }}
            trigger={
              <Button variant="outline" className="h-11 w-full">
                <PackagePlus aria-hidden="true" /> Add it by name
              </Button>
            }
          />
        </div>
      );
    }
    return <ErrorBox error={error} retry={() => refetch()} />;
  }
  if (!data) return null;

  const { prod, alerts, missing, fruit, canon, inPantry } = data;
  const danger = alerts.length > 0;
  const title = prod.name ?? `Product ${code}`;

  async function saveCanon(c: string | null) {
    if (!c) return;
    try {
      await api(`/api/product/${code}`, { method: "PATCH", json: { canon: c } });
      qc.setQueryData(["product", code], { ...data, canon: c, canonVia: "saved" });
      toast.success(`Got it — we'll treat this as ${getCanon(c)?.label}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <motion.article
        {...rise}
        transition={{ duration: 0.3 }}
        className={cn("overflow-hidden rounded-3xl border bg-card shadow-sm", danger && "border-destructive ring-2 ring-destructive/60")}
        aria-labelledby="prod-title"
      >
        {danger && (
          <div role="alert" className="flex items-start gap-3 bg-destructive px-5 py-4 text-white">
            <AlertOctagon className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Allergen alert</p>
              <p className="text-sm text-white/90">
                {alerts.map((a, i) => (
                  <span key={a.name}>
                    {i > 0 && "; "}
                    Not safe for <strong>{a.name}</strong> ({a.allergens.map(allergenLabel).join(", ").toLowerCase()})
                  </span>
                ))}
                .
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-4 p-5">
          <FoodImage src={prod.image} alt={title} className="size-28 shrink-0 rounded-2xl bg-white sm:size-36" sizes="144px" priority contain />
          <div className="min-w-0 flex-1">
            <h1 id="prod-title" className="text-2xl leading-tight font-semibold">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{[prod.brand, prod.quantity].filter(Boolean).join(" · ") || "Brand unknown"}</p>
            {inPantry > 0 && (
              <Badge variant="secondary" className="mt-2">
                <Check className="size-3" aria-hidden="true" /> {inPantry} in your pantry
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-around gap-4 border-y bg-muted/40 px-5 py-6">
          <NutriScore grade={prod.grade} />
          <div className="flex items-end gap-3">
            <NovaBadge nova={prod.nova} />
            <p className="mb-1 max-w-32 text-xs text-muted-foreground">{prod.nova ? NOVA_TEXT[prod.nova] : "Processing level unknown"}</p>
          </div>
        </div>

        <section className="p-5" aria-labelledby="per100">
          <h2 id="per100" className="mb-4 text-lg font-semibold">
            Per 100 g
          </h2>
          <NutrientBars bars={bars(prod)} />
        </section>

        {fruit && (
          <section className="border-t p-5" aria-labelledby="fruitcheck">
            <h2 id="fruitcheck" className="mb-1 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="size-4 text-primary" aria-hidden="true" /> Real-fruit check
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">How this compares with a fresh {fruit.fruit.name.toLowerCase()}.</p>
            <SugarCompare productSugar={fruit.productSugar} fruit={fruit.fruit.name} fruitSugar={fruit.fruit.nutr.sugar} />
          </section>
        )}

        <section className="space-y-4 border-t p-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Allergens</h2>
            {prod.allergens.length ? (
              <div className="flex flex-wrap gap-1.5">
                {prod.allergens.map((a) => {
                  const hit = alerts.some((x) => x.allergens.includes(a.replace(/^[a-z]{2}:/, "")));
                  return (
                    <Badge key={a} variant={hit ? "destructive" : "outline"} className={cn(hit && "bg-destructive text-white")}>
                      {allergenLabel(a)}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None listed on the pack.</p>
            )}
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold">Additives</h2>
            {prod.additives.length ? (
              <div className="flex flex-wrap gap-1.5">
                {prod.additives.map((a) => (
                  <Badge key={a} variant="secondary" className="font-mono">
                    {additiveLabel(a)}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No additives listed.</p>
            )}
          </div>
          {prod.ingredients && (
            <details className="group text-sm">
              <summary className="cursor-pointer font-semibold">Ingredients</summary>
              <p className="mt-2 leading-relaxed text-muted-foreground">{prod.ingredients}</p>
            </details>
          )}
        </section>

        {missing.length > 0 && (
          <section className="flex gap-3 border-t bg-muted/40 p-5 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p>
              <span className="font-medium">Missing from Open Food Facts:</span> {missing.join(", ")}. We show what&apos;s known rather than guessing.
            </p>
          </section>
        )}

        <div className="space-y-3 border-t p-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium" id="canon-label">
              Counts as
            </p>
            <CanonPicker id="canon-pick" value={canon} onChange={saveCanon} />
          </div>
          <AddToPantrySheet
            seed={{ name: title, barcode: code, canon, askCanon: !canon }}
            trigger={
              <Button className="h-12 w-full text-base">
                <PackagePlus aria-hidden="true" /> Add to pantry
              </Button>
            }
          />
        </div>
      </motion.article>

      {swapsOn && (
        <motion.section {...rise} transition={{ duration: 0.3, delay: 0.1 }} aria-labelledby="swaps" className="rounded-3xl border bg-card p-5">
          <h2 id="swaps" className="mb-1 flex items-center gap-2 text-lg font-semibold">
            <ArrowRightLeft className="size-4 text-primary" aria-hidden="true" /> Better swaps
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Same kind of product, better Nutri-Score.</p>
          {swaps.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          ) : swaps.data?.swaps.length ? (
            <ul className="grid gap-3 sm:grid-cols-3">
              {swaps.data.swaps.map((s) => (
                <li key={s.barcode}>
                  <Link href={`/product/${s.barcode}`} className="group block h-full rounded-2xl border p-3 transition-shadow hover:shadow-md">
                    <FoodImage src={s.image} alt={s.name} className="mb-2 aspect-square w-full rounded-xl bg-white" sizes="200px" contain />
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium group-hover:underline">{s.name}</p>
                      <NutriScore grade={s.grade} size="sm" />
                    </div>
                    {s.brand && <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.brand}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No better-graded options found in this category yet.</p>
          )}
        </motion.section>
      )}

      <div className="flex justify-center pt-2">
        <Button asChild variant="outline">
          <Link href="/scan">
            <ScanLine aria-hidden="true" /> Scan another
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4" aria-busy="true" aria-label="Loading product">
      <div className="rounded-3xl border bg-card p-5">
        <div className="flex gap-4">
          <Skeleton className="size-28 rounded-2xl sm:size-36" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <Skeleton className="mt-5 h-24 w-full rounded-2xl" />
        <div className="mt-5 space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
