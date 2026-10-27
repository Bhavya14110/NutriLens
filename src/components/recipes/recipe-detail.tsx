"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check, ChefHat, Clock, ExternalLink, Globe2, ShoppingBasket, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FoodImage } from "@/components/common/food-image";
import { ErrorBox } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddShop, useRecipe } from "@/hooks/data";
import { DIETS } from "@/lib/diet";
import { cn } from "@/lib/utils";
import { CookMode } from "./cook-mode";

export function RecipeDetail({ src, id }: { src: "spoon" | "mealdb"; id: string }) {
  const { data, isLoading, error, refetch } = useRecipe(src, id);
  const addShop = useAddShop();
  const router = useRouter();
  const [cooking, setCooking] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (error)
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <ErrorBox error={error} retry={() => refetch()} />
        <Button asChild variant="outline" className="w-full">
          <Link href="/recipes?tab=explore">Browse other recipes</Link>
        </Button>
      </div>
    );
  if (!data) return null;
  const { recipe: r, ings, dietWarn } = data;
  const missing = ings.filter((i) => !i.have && !i.staple);
  const haveCount = ings.filter((i) => i.have).length;

  function addMissing() {
    addShop.mutate(
      missing.map((m) => ({ name: m.canonLabel?.replace(/\s*\(.*\)/, "") ?? m.name, canon_ing: m.canon })),
      { onSuccess: () => toast.success(`Added ${missing.length} item${missing.length === 1 ? "" : "s"} to your shopping list`, { action: { label: "View", onClick: () => router.push("/shop") } }) },
    );
  }

  return (
    <>
      <article className="mx-auto max-w-3xl" aria-labelledby="r-title">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative -mx-4 overflow-hidden md:mx-0 md:rounded-3xl">
          <FoodImage src={r.image} alt={r.title} kind="recipe" className="aspect-[16/10] w-full md:aspect-[21/9]" sizes="(min-width: 768px) 768px, 100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {r.area && <Badge className="bg-white/20 text-white backdrop-blur">{r.area}</Badge>}
              {r.category && <Badge className="bg-white/20 text-white capitalize backdrop-blur">{r.category}</Badge>}
              <Badge className="bg-white/20 text-white backdrop-blur">{src === "spoon" ? "Spoonacular" : "TheMealDB"}</Badge>
            </div>
            <h1 id="r-title" className="text-3xl leading-tight font-semibold text-white md:text-4xl">
              {r.title}
            </h1>
          </div>
        </motion.div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {r.minutes && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" /> {r.minutes} min
            </span>
          )}
          {r.servings && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden="true" /> Serves {r.servings}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-4 text-fresh" aria-hidden="true" /> {haveCount} of {ings.length} in your pantry
          </span>
        </div>

        {dietWarn.length > 0 && (
          <div role="alert" className="mt-4 flex gap-3 rounded-2xl border border-soon/50 bg-soon/10 p-4 text-sm">
            <AlertTriangle className="size-5 shrink-0 text-soon" aria-hidden="true" />
            <p>Heads up: this doesn&apos;t look {dietWarn.map((d) => DIETS.find((x) => x.id === d)?.label.toLowerCase() ?? d).join(" or ")} — someone in your household follows that diet.</p>
          </div>
        )}

        <div className="sticky top-14 z-20 -mx-4 mt-5 flex gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur md:top-0 md:mx-0 md:rounded-2xl md:border">
          <Button className="h-12 flex-1 text-base" onClick={() => setCooking(true)} disabled={!r.steps.length}>
            <ChefHat aria-hidden="true" /> Start cooking
          </Button>
          {missing.length > 0 && (
            <Button variant="outline" className="h-12" onClick={addMissing} disabled={addShop.isPending}>
              <ShoppingBasket aria-hidden="true" /> <span className="hidden sm:inline">Add</span> {missing.length} missing
            </Button>
          )}
        </div>

        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_1.4fr]">
          <section aria-labelledby="ings">
            <h2 id="ings" className="mb-3 text-xl font-semibold">
              Ingredients
            </h2>
            <ul className="divide-y rounded-2xl border">
              {ings.map((i, n) => (
                <li key={`${i.name}-${n}`} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", i.have ? "bg-fresh/15 text-fresh" : i.staple ? "bg-muted text-muted-foreground" : "bg-expired/10 text-expired")}>
                    {i.have ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium capitalize">{i.name}</span>
                    {i.measure && <span className="block text-xs text-muted-foreground">{i.measure}</span>}
                  </span>
                  <span className={cn("shrink-0 text-xs font-medium", i.have ? "text-fresh" : "text-muted-foreground")}>{i.have ? "In pantry" : i.staple ? "Staple" : "Missing"}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="steps">
            <h2 id="steps" className="mb-3 text-xl font-semibold">
              Method
            </h2>
            {r.steps.length ? (
              <ol className="space-y-4">
                {r.steps.map((s, n) => (
                  <li key={n} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{n + 1}</span>
                    <p className="pt-0.5 text-sm leading-relaxed">{s}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                This recipe has no written steps.{" "}
                {r.source && (
                  <a href={r.source} target="_blank" rel="noreferrer" className="font-medium text-primary underline">
                    See the original <ExternalLink className="inline size-3" aria-hidden="true" />
                  </a>
                )}
              </p>
            )}
            {r.source && r.steps.length > 0 && (
              <a href={r.source} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm text-muted-foreground underline">
                <Globe2 className="size-3.5" aria-hidden="true" /> Original recipe
              </a>
            )}
          </section>
        </div>
      </article>

      {cooking && <CookMode src={src} recipe={r} ings={ings} onClose={() => setCooking(false)} />}
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
      <Skeleton className="aspect-[16/10] w-full rounded-3xl md:aspect-[21/9]" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
