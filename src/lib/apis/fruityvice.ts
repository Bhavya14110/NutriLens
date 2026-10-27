import "server-only";
import { z } from "zod";
import { cachedFetch, TTL } from "@/lib/cache";
import { getJson, request } from "@/lib/http";
import type { Fruit } from "@/types/food";

// CORS is off on fruityvice, so this only ever runs on our server
const BASE = "https://www.fruityvice.com/api/fruit";

export const fruitSchema = z.object({
  name: z.string(),
  id: z.number().optional(),
  family: z.string().default(""),
  genus: z.string().default(""),
  order: z.string().default(""),
  nutritions: z.object({
    calories: z.number(),
    fat: z.number(),
    sugar: z.number(),
    carbohydrates: z.number(),
    protein: z.number(),
  }),
});

export function mapFruit(f: z.infer<typeof fruitSchema>): Fruit {
  return {
    name: f.name,
    family: f.family,
    genus: f.genus,
    order: f.order,
    nutr: {
      calories: f.nutritions.calories,
      fat: f.nutritions.fat,
      sugar: f.nutritions.sugar,
      carbs: f.nutritions.carbohydrates,
      protein: f.nutritions.protein,
    },
  };
}

export async function listFruits(): Promise<Fruit[]> {
  return cachedFetch("fv:all", TTL.fruitList, async () => {
    const rows = await getJson(`${BASE}/all`, z.array(fruitSchema), { src: "Fruityvice" });
    return rows.map(mapFruit).sort((a, b) => a.name.localeCompare(b.name));
  });
}

export async function getFruit(name: string): Promise<Fruit | null> {
  const key = name.trim().toLowerCase();
  if (!/^[a-z][a-z \-]{1,40}$/.test(key)) return null;
  return cachedFetch(`fv:${key}`, TTL.fruit, async () => {
    const { data } = await request(`${BASE}/${encodeURIComponent(key)}`, fruitSchema, { src: "Fruityvice", nullOn404: true });
    if (data) return mapFruit(data);
    // fruityvice is picky about names ("GreenApple", "Kiwifruit"), try the list
    const all = await listFruits();
    const squash = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
    return all.find((f) => squash(f.name) === squash(key)) ?? null;
  });
}
