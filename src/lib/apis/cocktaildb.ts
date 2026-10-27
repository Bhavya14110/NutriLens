import "server-only";
import { z } from "zod";
import { cachedFetch, TTL } from "@/lib/cache";
import { apiEnv } from "@/lib/env";
import { getJson } from "@/lib/http";
import type { Drink } from "@/types/food";

const base = () => `https://www.thecocktaildb.com/api/json/v1/${apiEnv().cocktailKey}`;
const str = z.string().nullish();

const item = z.object({ idDrink: z.string(), strDrink: z.string(), strDrinkThumb: str });

// empty filter results come back as {"drinks": "no data found"} (or null), treat both as []
export const drinkListSchema = z.object({
  drinks: z.union([z.array(item), z.string(), z.null()]),
});

export const drinkSchema = z
  .object({
    idDrink: z.string(),
    strDrink: z.string(),
    strDrinkThumb: str,
    strAlcoholic: str,
    strGlass: str,
    strCategory: str,
    strInstructions: str,
  })
  .catchall(z.unknown());

const drinksSchema = z.object({ drinks: z.union([z.array(drinkSchema), z.string(), z.null()]) });

export type DrinkItem = { id: string; name: string; image: string | null };

const toItem = (x: z.infer<typeof item>): DrinkItem => ({ id: x.idDrink, name: x.strDrink, image: x.strDrinkThumb ?? null });

export function mapDrink(d: z.infer<typeof drinkSchema>): Drink {
  const ings: { name: string; measure: string }[] = [];
  for (let i = 1; i <= 15; i++) {
    const n = d[`strIngredient${i}`];
    const m = d[`strMeasure${i}`];
    if (typeof n === "string" && n.trim()) ings.push({ name: n.trim(), measure: typeof m === "string" ? m.trim() : "" });
  }
  return {
    id: d.idDrink,
    name: d.strDrink,
    image: d.strDrinkThumb ?? null,
    alcoholic: !/non/i.test(d.strAlcoholic ?? ""),
    glass: d.strGlass ?? null,
    category: d.strCategory ?? null,
    instructions: (d.strInstructions ?? "").trim(),
    ings,
    matches: [],
  };
}

async function list(path: string, key: string): Promise<DrinkItem[]> {
  return cachedFetch(`cdb:${key}`, TTL.cocktail, async () => {
    const d = await getJson(`${base()}/${path}`, drinkListSchema, { src: "TheCocktailDB" });
    return Array.isArray(d.drinks) ? d.drinks.map(toItem) : [];
  });
}

// single ingredient only on the free key (and it returns very few rows these days)
export const byIngredient = (ing: string) => list(`filter.php?i=${encodeURIComponent(ing.replace(/ /g, "_"))}`, `i:${ing.toLowerCase()}`);

export const nonAlcoholic = () => list("filter.php?a=Non_Alcoholic", "a:non");

export async function lookupDrink(id: string): Promise<Drink | null> {
  if (!/^\d{1,8}$/.test(id)) return null;
  return cachedFetch(`cdb:l:${id}`, TTL.cocktail, async () => {
    const d = await getJson(`${base()}/lookup.php?i=${id}`, drinksSchema, { src: "TheCocktailDB" });
    return Array.isArray(d.drinks) && d.drinks[0] ? mapDrink(d.drinks[0]) : null;
  });
}
