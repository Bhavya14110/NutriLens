import "server-only";
import { z } from "zod";
import { cachedFetch, TTL } from "@/lib/cache";
import { apiEnv } from "@/lib/env";
import { request } from "@/lib/http";
import { canSpend, spend, spoonCost } from "@/lib/quota";
import type { Recipe } from "@/types/food";

const BASE = "https://api.spoonacular.com";

const ingSchema = z.object({
  id: z.number().nullish(),
  name: z.string(),
  original: z.string().nullish(),
  amount: z.number().nullish(),
  unit: z.string().nullish(),
});

export const findSchema = z.array(
  z.object({
    id: z.number(),
    title: z.string(),
    image: z.string().nullish(),
    usedIngredientCount: z.number(),
    missedIngredientCount: z.number(),
    usedIngredients: z.array(ingSchema).default([]),
    missedIngredients: z.array(ingSchema).default([]),
    likes: z.number().nullish(),
  }),
);

export const infoSchema = z.object({
  id: z.number(),
  title: z.string(),
  image: z.string().nullish(),
  servings: z.number().nullish(),
  readyInMinutes: z.number().nullish(),
  sourceUrl: z.string().nullish(),
  cuisines: z.array(z.string()).nullish(),
  dishTypes: z.array(z.string()).nullish(),
  diets: z.array(z.string()).nullish(),
  instructions: z.string().nullish(),
  extendedIngredients: z.array(ingSchema).default([]),
  analyzedInstructions: z
    .array(z.object({ name: z.string().nullish(), steps: z.array(z.object({ number: z.number(), step: z.string() })) }))
    .default([]),
});

export const parseSchema = z.array(
  z.object({
    name: z.string().nullish(),
    original: z.string().nullish(),
    estimatedCost: z.object({ value: z.number(), unit: z.string() }).nullish(),
  }),
);

export type SpoonFind = z.infer<typeof findSchema>;

// Thrown when the guard says no, callers switch to TheMealDB instead of erroring
export class QuotaSkip extends Error {}

function hdrs() {
  return { "x-api-key": apiEnv().spoonKey, Accept: "application/json" };
}

// prefer the real cost spoonacular reports in its response headers
function charged(h: Headers | null, est: number) {
  const v = Number(h?.get("x-api-quota-request"));
  return Number.isFinite(v) && v > 0 ? v : est;
}

export async function findByIngredients(ings: string[], number = 10): Promise<SpoonFind> {
  const list = [...new Set(ings.map((s) => s.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
  const key = `spoon:find:${number}:${[...list].sort().join(",")}`;
  return cachedFetch(key, TTL.spoon, async () => {
    const est = spoonCost.find(number);
    if (!(await canSpend(est))) throw new QuotaSkip("spoonacular daily budget reached");
    // keep the caller's order (expiring first) - spoonacular weighs earlier ones a bit
    const qs = new URLSearchParams({ ingredients: list.join(","), number: String(number), ranking: "1", ignorePantry: "true" });
    const { data, headers } = await request(`${BASE}/recipes/findByIngredients?${qs}`, findSchema, { src: "Spoonacular", headers: hdrs() });
    const rows = data ?? [];
    await spend(charged(headers, spoonCost.find(rows.length)));
    return rows;
  });
}

export async function recipeInfo(id: string): Promise<Recipe | null> {
  if (!/^\d{1,9}$/.test(id)) return null;
  return cachedFetch(`spoon:info:${id}`, TTL.spoon, async () => {
    if (!(await canSpend(spoonCost.info()))) throw new QuotaSkip("spoonacular daily budget reached");
    const { data, headers } = await request(`${BASE}/recipes/${id}/information?includeNutrition=false`, infoSchema, {
      src: "Spoonacular",
      headers: hdrs(),
      nullOn404: true,
    });
    await spend(charged(headers, spoonCost.info()));
    return data ? mapInfo(data) : null;
  });
}

export function mapInfo(d: z.infer<typeof infoSchema>): Recipe {
  const steps = d.analyzedInstructions.flatMap((b) => b.steps.map((s) => s.step.trim())).filter(Boolean);
  // some recipes only ship html instructions
  const fallback = (d.instructions ?? "")
    .replace(/<\/?(li|p|br)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    src: "spoon",
    id: String(d.id),
    title: d.title,
    image: d.image ?? null,
    servings: d.servings ?? null,
    minutes: d.readyInMinutes ?? null,
    area: d.cuisines?.[0] ?? null,
    category: d.dishTypes?.[0] ?? null,
    ings: d.extendedIngredients.map((i) => ({ name: i.name, measure: i.original ?? `${i.amount ?? ""} ${i.unit ?? ""}`.trim(), canon: null })),
    steps: steps.length ? steps : fallback,
    youtube: null,
    source: d.sourceUrl ?? null,
    tags: d.diets ?? [],
  };
}

// returns total in US cents, or null when we can't afford it today
export async function estimateCost(lines: string[]): Promise<{ cents: number; per: number[] } | null> {
  const clean = lines.map((l) => l.trim()).filter(Boolean).slice(0, 30);
  if (!clean.length) return { cents: 0, per: [] };
  const key = `spoon:cost:${[...clean].sort().join("|").toLowerCase()}`;
  return cachedFetch(key, TTL.spoon, async () => {
    const est = spoonCost.parse(clean.length);
    if (!(await canSpend(est))) return null;
    const body = new URLSearchParams({ ingredientList: clean.join("\n"), servings: "1", includeNutrition: "false" });
    const { data, headers } = await request(`${BASE}/recipes/parseIngredients`, parseSchema, {
      src: "Spoonacular",
      method: "POST",
      headers: { ...hdrs(), "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    await spend(charged(headers, est));
    const per = (data ?? []).map((r) => r.estimatedCost?.value ?? 0);
    return { cents: per.reduce((a, b) => a + b, 0), per };
  });
}
