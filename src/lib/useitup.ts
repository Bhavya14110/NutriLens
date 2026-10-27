import "server-only";
import * as mealdb from "@/lib/apis/mealdb";
import { findByIngredients, QuotaSkip, type SpoonFind } from "@/lib/apis/spoonacular";
import { canonFromName, isStaple, mealName, spoonName } from "@/lib/canon";
import { recipeOkFor } from "@/lib/diet";
import { byExpiry, daysLeft } from "@/lib/expiry";
import { UpstreamError } from "@/lib/http";
import { pmapSafe } from "@/lib/pmap";
import type { Diet } from "@/types/db";
import type { Recipe, RecipeCard } from "@/types/food";

export type PItem = { id: string; name: string; canon_ing: string | null; expires_at: string | null };

export type UseItUp = { recs: RecipeCard[]; source: "spoon" | "mealdb"; note: string | null; ings: string[] };

const SOON = 3;

// canon ids from the pantry, soonest-expiring first, staples dropped
export function pantryCanon(items: readonly PItem[]) {
  const sorted = [...items].sort(byExpiry);
  const ids: string[] = [];
  const soon = new Set<string>();
  for (const it of sorted) {
    if (!it.canon_ing || isStaple(it.canon_ing)) continue;
    if (!ids.includes(it.canon_ing)) ids.push(it.canon_ing);
    const d = daysLeft(it.expires_at);
    if (d !== null && d <= SOON) soon.add(it.canon_ing);
  }
  return { ids, soon };
}

export function rank(a: RecipeCard, b: RecipeCard) {
  return b.rescues - a.rescues || b.used - a.used || a.missed - b.missed;
}

// spoonacular names ("yogurt") back to our canon ids so we know what gets rescued
function toCanon(name: string, have: readonly string[]): string | null {
  const direct = have.find((id) => spoonName(id) === name.toLowerCase() || id === name.toLowerCase());
  return direct ?? canonFromName(name);
}

export function spoonCards(rows: SpoonFind, have: readonly string[], soon: ReadonlySet<string>, diets: readonly Diet[]): RecipeCard[] {
  return rows
    // spoonacular's lists skip some ingredients (we've seen sausage missing), so the title counts too
    .filter((r) => recipeOkFor(diets, [r.title, ...[...r.usedIngredients, ...r.missedIngredients].map((i) => i.name)]))
    .map((r) => {
      const usedCanon = r.usedIngredients.map((i) => toCanon(i.name, have));
      return {
        src: "spoon" as const,
        id: String(r.id),
        title: r.title,
        image: r.image ?? null,
        used: r.usedIngredientCount,
        missed: r.missedIngredientCount,
        usedNames: r.usedIngredients.map((i) => i.name),
        missedNames: r.missedIngredients.map((i) => i.name),
        rescues: usedCanon.filter((c) => c && soon.has(c)).length,
      };
    })
    .sort(rank);
}

// score a full MealDB recipe against what's in the pantry
export function mealCard(r: Recipe, have: ReadonlySet<string>, soon: ReadonlySet<string>): RecipeCard {
  const used: string[] = [];
  const missed: string[] = [];
  let rescues = 0;
  for (const i of r.ings) {
    const c = canonFromName(i.name);
    if (c && have.has(c)) {
      used.push(i.name);
      if (soon.has(c)) rescues++;
    } else if (!c || !isStaple(c)) {
      missed.push(i.name);
    }
  }
  return { src: "mealdb", id: r.id, title: r.title, image: r.image, used: used.length, missed: missed.length, usedNames: used, missedNames: missed, rescues, area: r.area, category: r.category };
}

export async function mealFallback(ids: readonly string[], soon: ReadonlySet<string>, diets: readonly Diet[], want = 10): Promise<RecipeCard[]> {
  // search by each expiring-first ingredient, count how many of ours each meal shows up for
  const probe = ids.slice(0, 6);
  const lists = await pmapSafe(probe, 3, (id) => mealdb.byIngredient(mealName(id)));
  const score = new Map<string, number>();
  lists.forEach((list, i) => {
    const w = soon.has(probe[i]) ? 2 : 1;
    for (const m of list ?? []) score.set(m.id, (score.get(m.id) ?? 0) + w);
  });
  const top = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, want + 6).map(([id]) => id);
  const full = await pmapSafe(top, 4, (id) => mealdb.lookup(id));
  const have = new Set(ids);
  return full
    .filter((r): r is Recipe => r !== null)
    .filter((r) => recipeOkFor(diets, [r.title, ...r.ings.map((i) => i.name)]))
    .map((r) => mealCard(r, have, soon))
    .filter((c) => c.used > 0)
    .sort(rank)
    .slice(0, want);
}

export async function useItUp(items: readonly PItem[], diets: readonly Diet[]): Promise<UseItUp> {
  const { ids, soon } = pantryCanon(items);
  if (!ids.length) return { recs: [], source: "mealdb", note: null, ings: [] };

  try {
    const rows = await findByIngredients(ids.slice(0, 12).map(spoonName), 10);
    const recs = spoonCards(rows, ids, soon, diets);
    if (recs.length) return { recs, source: "spoon", note: null, ings: ids };
  } catch (err) {
    // quota guard, missing key or spoonacular down: quietly fall back, never error
    if (!(err instanceof QuotaSkip) && !(err instanceof UpstreamError)) throw err;
  }

  const recs = await mealFallback(ids, soon, diets);
  return { recs, source: "mealdb", note: "Showing more ideas", ings: ids };
}
