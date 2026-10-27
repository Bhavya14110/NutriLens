"use client";

import { useQuery } from "@tanstack/react-query";
import { ChefHat, Dices, Globe2, Loader2, Search, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Empty, ErrorBox, PageHeader } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExplore, useUseItUp } from "@/hooks/data";
import { getCanon } from "@/lib/canon";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { MealListItem } from "@/types/food";
import { MealTile, RecipeCard } from "./recipe-card";

export function RecipesScreen() {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = sp.get("tab") === "explore" ? "explore" : "useitup";
  return (
    <div>
      <PageHeader title="Recipes" sub="Cook what you've got before it goes off." />
      <Tabs value={tab} onValueChange={(v) => router.replace(v === "explore" ? "/recipes?tab=explore" : "/recipes", { scroll: false })} className="gap-5">
        <TabsList className="h-10 w-full sm:w-auto">
          <TabsTrigger value="useitup" className="h-8 px-4">
            <Sparkles className="size-4" aria-hidden="true" /> Use it up
          </TabsTrigger>
          <TabsTrigger value="explore" className="h-8 px-4">
            <Globe2 className="size-4" aria-hidden="true" /> Explore
          </TabsTrigger>
        </TabsList>
        <TabsContent value="useitup">
          <UseItUp />
        </TabsContent>
        <TabsContent value="explore">
          <Explore />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function CardGridSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading recipes">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-3xl border">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function UseItUp() {
  const { data, isLoading, error, refetch } = useUseItUp();
  if (isLoading) return <CardGridSkeleton />;
  if (error) return <ErrorBox error={error} retry={() => refetch()} />;
  if (!data?.ings.length)
    return <Empty icon={ChefHat} title="Nothing to cook with yet" body="Add a few things to your pantry and we'll find recipes that use up what expires first." cta={{ href: "/scan", label: "Scan groceries" }} />;
  if (!data.recs.length)
    return <Empty icon={ChefHat} title="No matches right now" body="We couldn't find recipes for this mix. Try Explore for ideas, or add a couple more staples." cta={{ href: "/recipes?tab=explore", label: "Explore recipes" }} />;
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Ranked by what they rescue from your pantry, expiring first: {data.ings.slice(0, 6).map((i) => getCanon(i)?.label.replace(/\s*\(.*\)/, "") ?? i).join(", ")}
        {data.ings.length > 6 && ` +${data.ings.length - 6}`}.
        {/* the quota fallback is meant to be quiet - just a hint, never an error */}
        {data.note && <span className="ml-1 italic">{data.note}.</span>}
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.recs.map((r, i) => (
          <RecipeCard key={`${r.src}-${r.id}`} r={r} i={i} />
        ))}
      </ul>
    </div>
  );
}

type Meta = { areas: string[]; categories: { name: string; image: string | null; blurb: string }[] };

function Explore() {
  const router = useRouter();
  const [qs, setQs] = useState<string | null>("category=Vegetarian");
  const [q, setQ] = useState("");
  const [rolling, setRolling] = useState(false);
  const meta = useQuery({ queryKey: ["explore-meta"], queryFn: () => api<Meta>("/api/recipes/explore?meta=1"), staleTime: 24 * 3600_000 });
  const list = useExplore(qs);
  const cur = new URLSearchParams(qs ?? "");

  async function surprise() {
    setRolling(true);
    try {
      const r = await api<{ items: MealListItem[] }>("/api/recipes/explore?random=1");
      if (r.items[0]) router.push(`/recipes/mealdb/${r.items[0].id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't roll the dice.");
    } finally {
      setRolling(false);
    }
  }

  const search = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) setQs(`q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={search} className="relative flex-1" role="search">
          <Label htmlFor="ex-q" className="sr-only">
            Search recipes
          </Label>
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="ex-q" placeholder="Search dal, pasta, curry…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 pl-9" />
        </form>
        <Select value={cur.get("area") ?? ""} onValueChange={(v) => setQs(`area=${encodeURIComponent(v)}`)}>
          <SelectTrigger className="h-11 w-full sm:w-48" aria-label="Cuisine">
            <SelectValue placeholder="Any cuisine" />
          </SelectTrigger>
          <SelectContent>
            {(meta.data?.areas ?? []).map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" className="h-11" onClick={surprise} disabled={rolling}>
          {rolling ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Dices aria-hidden="true" />} Surprise me
        </Button>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="toolbar" aria-label="Categories">
        {meta.isLoading
          ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full" />)
          : (meta.data?.categories ?? []).map((c) => {
              const on = cur.get("category") === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setQs(`category=${encodeURIComponent(c.name)}`)}
                  className={cn("flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-sm font-medium transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  {c.image && <Image src={c.image} alt="" width={32} height={32} className="size-8 rounded-full bg-white object-contain" />}
                  {c.name}
                </button>
              );
            })}
      </div>

      {list.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      ) : list.error ? (
        <ErrorBox error={list.error} retry={() => list.refetch()} />
      ) : !list.data?.items.length ? (
        <Empty icon={Search} title="No recipes found" body="TheMealDB doesn't have anything for that yet. Try another cuisine, category or word." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.data.items.map((m, i) => (
            <MealTile key={m.id} m={m} i={i} />
          ))}
        </ul>
      )}
    </div>
  );
}
