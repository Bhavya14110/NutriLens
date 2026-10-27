"use client";

import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import Link from "next/link";
import { FoodImage } from "@/components/common/food-image";
import { cn } from "@/lib/utils";
import type { MealListItem, RecipeCard as Card } from "@/types/food";

export function RecipeCard({ r, i = 0, compact }: { r: Card; i?: number; compact?: boolean }) {
  return (
    <motion.li initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className="list-none">
      <Link href={`/recipes/${r.src}/${r.id}`} className="group block h-full overflow-hidden rounded-3xl border bg-card transition-shadow hover:shadow-lg focus-visible:shadow-lg">
        <div className="relative">
          <FoodImage src={r.image} alt="" kind="recipe" className={cn("w-full", compact ? "aspect-[16/10]" : "aspect-[4/3]")} sizes="(min-width: 768px) 33vw, 100vw" />
          {r.rescues > 0 && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow">
              <Leaf className="size-3" aria-hidden="true" /> Saves {r.rescues} expiring
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 font-display text-lg leading-snug font-semibold group-hover:underline">{r.title}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-fresh/12 px-2 py-0.5 font-medium text-fresh">{r.used} in pantry</span>
            <span className={cn("rounded-full px-2 py-0.5 font-medium", r.missed ? "bg-muted text-muted-foreground" : "bg-fresh/12 text-fresh")}>{r.missed ? `${r.missed} missing` : "Nothing missing"}</span>
          </div>
          {r.usedNames.length > 0 && !compact && <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">Uses {r.usedNames.slice(0, 4).join(", ")}</p>}
        </div>
      </Link>
    </motion.li>
  );
}

export function MealTile({ m, i = 0 }: { m: MealListItem; i?: number }) {
  return (
    <motion.li initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="list-none">
      <Link href={`/recipes/mealdb/${m.id}`} className="group block overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md">
        <FoodImage src={m.image} alt="" kind="recipe" className="aspect-square w-full" sizes="(min-width: 768px) 25vw, 50vw" />
        <p className="line-clamp-2 p-3 text-sm font-medium group-hover:underline">{m.title}</p>
      </Link>
    </motion.li>
  );
}
