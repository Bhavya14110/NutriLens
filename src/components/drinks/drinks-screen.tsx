"use client";

import { motion } from "framer-motion";
import { CupSoda, GlassWater, Wine } from "lucide-react";
import { useState } from "react";
import { FoodImage } from "@/components/common/food-image";
import { Empty, ErrorBox, PageHeader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useDrink, useDrinks } from "@/hooks/data";
import { cn } from "@/lib/utils";
import type { DrinkCard } from "@/types/food";

export function DrinksScreen() {
  const { data, isLoading, error, refetch } = useDrinks();
  const [open, setOpen] = useState<DrinkCard | null>(null);

  return (
    <div>
      <PageHeader
        title="Drinks"
        sub={
          data
            ? data.have.length
              ? `From your leftovers: ${data.have.slice(0, 5).join(", ")}${data.have.length > 5 ? "…" : ""}`
              : "Add juice, fruit, milk or soda to get ideas."
            : "Mocktails and coolers from what's left over."
        }
        action={
          data && (
            <Badge variant="secondary" className="gap-1">
              {data.alcohol ? <Wine className="size-3" aria-hidden="true" /> : <GlassWater className="size-3" aria-hidden="true" />}
              {data.alcohol ? "Alcohol allowed" : "Non-alcoholic only"}
            </Badge>
          )
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorBox error={error} retry={() => refetch()} />
      ) : !data?.have.length ? (
        <Empty icon={CupSoda} title="No drinkable leftovers yet" body="Juice, milk, fruit, soda or coffee in your pantry? Add them and we'll suggest drinks to finish them off." cta={{ href: "/scan", label: "Add something" }} />
      ) : !data.drinks.length ? (
        <Empty icon={CupSoda} title="No matches for this mix" body="We couldn't match a drink to what you have. Try adding a juice, fruit or milk." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.drinks.map((d, i) => (
            <motion.li key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.04 }}>
              <button type="button" onClick={() => setOpen(d)} className="group block w-full overflow-hidden rounded-2xl border bg-card text-left transition-shadow hover:shadow-md">
                <FoodImage src={d.image} alt="" kind="drink" className="aspect-square w-full" sizes="(min-width: 768px) 25vw, 50vw" />
                <div className="p-3">
                  <p className="line-clamp-1 font-medium group-hover:underline">{d.name}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-fresh">Uses {d.matches.join(", ").toLowerCase()}</p>
                </div>
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      <DrinkSheet card={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function DrinkSheet({ card, onClose }: { card: DrinkCard | null; onClose: () => void }) {
  const { data, isLoading, error } = useDrink(card?.id ?? null);
  const d = data?.drink;
  const matches = new Set(card?.matches.map((m) => m.toLowerCase()));
  return (
    <Sheet open={Boolean(card)} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-h-[90dvh] max-w-lg overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{card?.name}</SheetTitle>
          <SheetDescription>{d ? [d.category, d.glass].filter(Boolean).join(" · ") : "Loading the recipe…"}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          <FoodImage src={card?.image} alt={card?.name ?? ""} kind="drink" className="aspect-[16/10] w-full rounded-2xl" sizes="512px" />
          {isLoading && <Skeleton className="h-40 rounded-2xl" />}
          {error && <ErrorBox error={error} />}
          {d && (
            <>
              <section>
                <h3 className="mb-2 font-semibold">You&apos;ll need</h3>
                <ul className="divide-y rounded-2xl border">
                  {d.ings.map((i) => (
                    <li key={i.name} className="flex justify-between gap-3 px-4 py-2 text-sm">
                      <span className={cn(matches.has(i.name.toLowerCase()) && "font-semibold text-fresh")}>
                        {i.name}
                        {matches.has(i.name.toLowerCase()) && " ✓"}
                      </span>
                      <span className="text-muted-foreground">{i.measure}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="mb-1 font-semibold">How to make it</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{d.instructions || "Mix everything together and serve chilled."}</p>
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
