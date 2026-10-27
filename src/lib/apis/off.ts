import "server-only";
import { z } from "zod";
import { cachedFetch, TTL } from "@/lib/cache";
import { apiEnv } from "@/lib/env";
import { request, UpstreamError } from "@/lib/http";
import type { Grade, Nutr, Product, Swap } from "@/types/food";

const BASE = "https://world.openfoodfacts.org";
// OFF's classic v2 search keeps returning "temporarily unavailable"; search-a-licious is their new one
const SAL = "https://search.openfoodfacts.org/search";

const FIELDS = [
  "code",
  "product_name",
  "brands",
  "image_front_url",
  "nutriscore_grade",
  "nova_group",
  "nutriments",
  "allergens_tags",
  "additives_tags",
  "categories_tags",
  "ingredients_text",
  "quantity",
].join(",");

const num = z.union([z.number(), z.string()]).nullish();

export const offProductSchema = z.object({
  code: z.string().optional(),
  status: z.number().optional(),
  product: z
    .object({
      product_name: z.string().nullish(),
      brands: z.string().nullish(),
      image_front_url: z.string().nullish(),
      nutriscore_grade: z.string().nullish(),
      nova_group: num,
      nutriments: z.record(z.string(), z.unknown()).nullish(),
      allergens_tags: z.array(z.string()).nullish(),
      additives_tags: z.array(z.string()).nullish(),
      categories_tags: z.array(z.string()).nullish(),
      ingredients_text: z.string().nullish(),
      quantity: z.string().nullish(),
    })
    .optional(),
});

const salSchema = z.object({
  hits: z.array(
    z.object({
      code: z.string(),
      product_name: z.string().nullish(),
      brands: z.union([z.array(z.string()), z.string()]).nullish(),
      image_front_url: z.string().nullish(),
      nutriscore_grade: z.string().nullish(),
    }),
  ),
});

const v2SearchSchema = z.object({
  products: z.array(
    z.object({
      code: z.string(),
      product_name: z.string().nullish(),
      brands: z.string().nullish(),
      image_front_url: z.string().nullish(),
      nutriscore_grade: z.string().nullish(),
    }),
  ),
});

const headers = () => ({ "User-Agent": `NutriLens/1.0 (contact: ${apiEnv().offContact})`, Accept: "application/json" });

export const isBarcode = (s: string) => /^\d{6,14}$/.test(s);

const grades = ["a", "b", "c", "d", "e"] as const;
export const toGrade = (g: string | null | undefined): Grade | null => {
  const x = (g ?? "").toLowerCase();
  return (grades as readonly string[]).includes(x) ? (x as Grade) : null;
};

function n(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? Math.round(x * 100) / 100 : null;
}

export function mapNutr(nm: Record<string, unknown> | null | undefined): Nutr {
  const g = (k: string) => n(nm?.[`${k}_100g`]);
  const salt = g("salt") ?? (g("sodium") !== null ? Math.round((g("sodium") as number) * 2.5 * 100) / 100 : null);
  return {
    energy: g("energy-kcal") ?? (g("energy") !== null ? Math.round((g("energy") as number) / 4.184) : null),
    sugar: g("sugars"),
    salt,
    satfat: g("saturated-fat"),
    protein: g("proteins"),
    fat: g("fat"),
    carbs: g("carbohydrates"),
    fiber: g("fiber"),
  };
}

export function mapProduct(barcode: string, raw: z.infer<typeof offProductSchema>): Product | null {
  const p = raw.product;
  if (!p || raw.status === 0) return null;
  const nova = n(p.nova_group);
  return {
    barcode,
    name: p.product_name?.trim() || null,
    brand: p.brands?.split(",")[0]?.trim() || null,
    image: p.image_front_url || null,
    grade: toGrade(p.nutriscore_grade),
    nova: nova && nova >= 1 && nova <= 4 ? (Math.round(nova) as 1 | 2 | 3 | 4) : null,
    nutr: mapNutr(p.nutriments),
    allergens: p.allergens_tags ?? [],
    additives: p.additives_tags ?? [],
    categories: p.categories_tags ?? [],
    ingredients: p.ingredients_text?.trim() || null,
    quantity: p.quantity?.trim() || null,
  };
}

export async function getProduct(barcode: string): Promise<Product | null> {
  if (!isBarcode(barcode)) return null;
  return cachedFetch(`off:p:${barcode}`, TTL.offProduct, async () => {
    const { data } = await request(`${BASE}/api/v2/product/${barcode}?fields=${FIELDS}`, offProductSchema, {
      src: "Open Food Facts",
      headers: headers(),
      timeoutMs: 10000,
      nullOn404: true,
    });
    return data ? mapProduct(barcode, data) : null;
  });
}

const better = (g: Grade) => grades.slice(0, grades.indexOf(g));

// most specific english category first; generic ones make for silly swaps
export function swapCats(cats: string[]): string[] {
  const skip = /^en:(plant-based-foods-and-beverages|plant-based-foods|beverages|beverages-and-beverages-preparations|snacks|sweet-snacks|foods|groceries|breakfasts|dairies|fermented-foods|fermented-milk-products|non-alcoholic-beverages)$/;
  return cats.filter((c) => c.startsWith("en:") && !skip.test(c)).reverse().slice(0, 3);
}

export async function getSwaps(prod: Product): Promise<Swap[]> {
  if (!prod.grade || prod.grade === "a") return [];
  const want = better(prod.grade);
  const cats = swapCats(prod.categories);
  if (!cats.length) return [];

  return cachedFetch(`off:swaps:${prod.barcode}`, TTL.swaps, async () => {
    const out: Swap[] = [];
    // walk from the most specific category up until we have 3
    for (const cat of cats) {
      if (out.length >= 3) break;
      const found = await searchBetter(cat, want).catch((err: unknown) => {
        if (err instanceof UpstreamError) return [] as Swap[];
        throw err;
      });
      for (const s of found) {
        if (s.barcode !== prod.barcode && !out.some((o) => o.barcode === s.barcode)) out.push(s);
        if (out.length >= 3) break;
      }
    }
    // best grade first
    return out.sort((a, b) => a.grade.localeCompare(b.grade));
  });
}

async function searchBetter(cat: string, want: Grade[]): Promise<Swap[]> {
  const q = `categories_tags:"${cat}" AND nutriscore_grade:(${want.join(" OR ")})`;
  const url = `${SAL}?q=${encodeURIComponent(q)}&page_size=12&fields=code,product_name,brands,image_front_url,nutriscore_grade&sort_by=-unique_scans_n`;
  try {
    const { data } = await request(url, salSchema, { src: "Open Food Facts", headers: headers(), timeoutMs: 8000, retries: 1 });
    return toSwaps(
      (data?.hits ?? []).map((h) => ({ ...h, brands: Array.isArray(h.brands) ? h.brands[0] : h.brands })),
      want,
    );
  } catch {
    // fall back to the classic v2 search when search-a-licious hiccups
    const url2 = `${BASE}/api/v2/search?categories_tags=${encodeURIComponent(cat)}&nutrition_grades_tags=${want.join("|")}&fields=code,product_name,brands,image_front_url,nutriscore_grade&page_size=12`;
    const { data } = await request(url2, v2SearchSchema, { src: "Open Food Facts", headers: headers(), timeoutMs: 8000, retries: 1 });
    return toSwaps((data?.products ?? []).map((p) => ({ ...p, brands: p.brands?.split(",")[0] })), want);
  }
}

function toSwaps(rows: { code: string; product_name?: string | null; brands?: string | null; image_front_url?: string | null; nutriscore_grade?: string | null }[], want: Grade[]): Swap[] {
  return rows
    .map((r) => ({ r, g: toGrade(r.nutriscore_grade) }))
    .filter(({ r, g }) => g && want.includes(g) && r.product_name && isBarcode(r.code))
    .map(({ r, g }) => ({
      barcode: r.code,
      name: (r.product_name as string).trim(),
      brand: r.brands?.trim() || null,
      image: r.image_front_url || null,
      grade: g as Grade,
    }));
}
