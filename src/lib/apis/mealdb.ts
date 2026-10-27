import "server-only";
import { z } from "zod";
import { cachedFetch, TTL } from "@/lib/cache";
import { apiEnv } from "@/lib/env";
import { getJson } from "@/lib/http";
import type { Ing, MealListItem, Recipe } from "@/types/food";

const base = () => `https://www.themealdb.com/api/json/v1/${apiEnv().mealKey}`;

const str = z.string().nullish();

// strIngredient1..20 / strMeasure1..20 come as loose keys, catchall keeps them
export const mealSchema = z
  .object({
    idMeal: z.string(),
    strMeal: z.string(),
    strMealThumb: str,
    strCategory: str,
    strArea: str,
    strInstructions: str,
    strYoutube: str,
    strSource: str,
    strTags: str,
  })
  .catchall(z.unknown());

const listItem = z.object({ idMeal: z.string(), strMeal: z.string(), strMealThumb: str });

// empty results are {"meals": null}, not an error
export const mealsSchema = z.object({ meals: z.array(mealSchema).nullable() });
export const mealListSchema = z.object({ meals: z.array(listItem).nullable() });
const catSchema = z.object({
  categories: z.array(z.object({ idCategory: z.string(), strCategory: z.string(), strCategoryThumb: str, strCategoryDescription: str })),
});
const areaSchema = z.object({ meals: z.array(z.object({ strArea: z.string() })).nullable() });

export type MealRaw = z.infer<typeof mealSchema>;

export function mealIngs(m: MealRaw): Ing[] {
  const out: Ing[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = m[`strIngredient${i}`];
    const meas = m[`strMeasure${i}`];
    if (typeof name !== "string" || !name.trim()) continue;
    out.push({ name: name.trim(), measure: typeof meas === "string" ? meas.trim() : "", canon: null });
  }
  return out;
}

export function mapMeal(m: MealRaw): Recipe {
  const steps = (m.strInstructions ?? "")
    .split(/\r?\n+/)
    .map((s) => s.replace(/^(step\s*\d+[:.)]?|\d+[.)])\s*/i, "").trim())
    // mealdb sometimes has lone "STEP 1" lines
    .filter((s) => s.length > 2 && !/^step\s*\d+$/i.test(s));
  return {
    src: "mealdb",
    id: m.idMeal,
    title: m.strMeal,
    image: m.strMealThumb ?? null,
    servings: null,
    minutes: null,
    area: m.strArea ?? null,
    category: m.strCategory ?? null,
    ings: mealIngs(m),
    steps,
    youtube: ytId(m.strYoutube),
    source: m.strSource || null,
    tags: (m.strTags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
  };
}

// youtube links come as watch?v=..., we only keep the id for a privacy-friendly embed
export function ytId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

const toItem = (x: z.infer<typeof listItem>): MealListItem => ({ id: x.idMeal, title: x.strMeal, image: x.strMealThumb ?? null });

async function list(path: string, key: string): Promise<MealListItem[]> {
  return cachedFetch(`mdb:${key}`, TTL.mealdb, async () => {
    const d = await getJson(`${base()}/${path}`, mealListSchema, { src: "TheMealDB" });
    return (d.meals ?? []).map(toItem);
  });
}

export const byIngredient = (ing: string) => list(`filter.php?i=${encodeURIComponent(ing.replace(/ /g, "_"))}`, `i:${ing.toLowerCase()}`);
export const byArea = (area: string) => list(`filter.php?a=${encodeURIComponent(area)}`, `a:${area.toLowerCase()}`);
export const byCategory = (cat: string) => list(`filter.php?c=${encodeURIComponent(cat)}`, `c:${cat.toLowerCase()}`);

export async function search(q: string): Promise<Recipe[]> {
  const s = q.trim().toLowerCase().slice(0, 60);
  if (!s) return [];
  return cachedFetch(`mdb:s:${s}`, TTL.mealdb, async () => {
    const d = await getJson(`${base()}/search.php?s=${encodeURIComponent(s)}`, mealsSchema, { src: "TheMealDB" });
    return (d.meals ?? []).map(mapMeal);
  });
}

export async function lookup(id: string): Promise<Recipe | null> {
  if (!/^\d{1,8}$/.test(id)) return null;
  return cachedFetch(`mdb:l:${id}`, TTL.mealdb, async () => {
    const d = await getJson(`${base()}/lookup.php?i=${id}`, mealsSchema, { src: "TheMealDB" });
    return d.meals?.[0] ? mapMeal(d.meals[0]) : null;
  });
}

// random is never cached, that's the whole point of it
export async function random(): Promise<Recipe | null> {
  const d = await getJson(`${base()}/random.php`, mealsSchema, { src: "TheMealDB" });
  return d.meals?.[0] ? mapMeal(d.meals[0]) : null;
}

export async function areas(): Promise<string[]> {
  return cachedFetch("mdb:areas", TTL.mealdb, async () => {
    const d = await getJson(`${base()}/list.php?a=list`, areaSchema, { src: "TheMealDB" });
    return (d.meals ?? []).map((a) => a.strArea).filter((a) => a && a !== "Unknown");
  });
}

export async function categories(): Promise<{ name: string; image: string | null; blurb: string }[]> {
  return cachedFetch("mdb:cats", TTL.mealdb, async () => {
    const d = await getJson(`${base()}/categories.php`, catSchema, { src: "TheMealDB" });
    return d.categories.map((c) => ({
      name: c.strCategory,
      image: c.strCategoryThumb ?? null,
      blurb: (c.strCategoryDescription ?? "").split(/(?<=\.)\s/)[0]?.replace(/\[\d+\]/g, "") ?? "",
    }));
  });
}
