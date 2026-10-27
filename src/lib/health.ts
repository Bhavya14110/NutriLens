import type { Nutr, Product } from "@/types/food";

export const GRADE_COLORS = { a: "#038141", b: "#85BB2F", c: "#FECB02", d: "#EE8100", e: "#E63E11" } as const;
export const NOVA_COLORS = { 1: "#038141", 2: "#85BB2F", 3: "#EE8100", 4: "#E63E11" } as const;

export const NOVA_TEXT = {
  1: "Unprocessed or minimally processed",
  2: "Processed culinary ingredient",
  3: "Processed food",
  4: "Ultra-processed food",
} as const;

export type Light = "low" | "medium" | "high";
export type Bar = { key: keyof Nutr; label: string; value: number | null; light: Light | null; max: number; goodWhenHigh: boolean };

// UK FSA front-of-pack thresholds per 100 g; drinks use the per-100 ml halves
const FOOD = { sugar: [5, 22.5], salt: [0.3, 1.5], satfat: [1.5, 5] } as const;
const DRINK = { sugar: [2.5, 11.25], salt: [0.3, 0.75], satfat: [0.75, 2.5] } as const;

export function isDrink(cats: readonly string[]) {
  return cats.some((c) => c === "en:beverages" || c.endsWith("-beverages") || c.endsWith("juices") || c.endsWith("drinks"));
}

export function lightFor(kind: "sugar" | "salt" | "satfat", v: number | null, drink = false): Light | null {
  if (v === null) return null;
  const [lo, hi] = (drink ? DRINK : FOOD)[kind];
  if (v <= lo) return "low";
  if (v > hi) return "high";
  return "medium";
}

export function bars(p: Pick<Product, "nutr" | "categories">): Bar[] {
  const d = isDrink(p.categories);
  const prot = p.nutr.protein;
  return [
    { key: "sugar", label: "Sugar", value: p.nutr.sugar, light: lightFor("sugar", p.nutr.sugar, d), max: d ? 15 : 50, goodWhenHigh: false },
    { key: "salt", label: "Salt", value: p.nutr.salt, light: lightFor("salt", p.nutr.salt, d), max: d ? 1 : 3, goodWhenHigh: false },
    { key: "satfat", label: "Saturated fat", value: p.nutr.satfat, light: lightFor("satfat", p.nutr.satfat, d), max: d ? 4 : 15, goodWhenHigh: false },
    // protein is the odd one out: more is better, so flip the colours
    { key: "protein", label: "Protein", value: prot, light: prot === null ? null : prot >= 10 ? "low" : prot >= 5 ? "medium" : "high", max: 30, goodWhenHigh: true },
  ];
}

// what we couldn't find, so the card can say so instead of guessing
export function missingFields(p: Product): string[] {
  const out: string[] = [];
  if (!p.name) out.push("product name");
  if (!p.grade) out.push("Nutri-Score");
  if (!p.nova) out.push("NOVA group");
  if (p.nutr.sugar === null) out.push("sugar");
  if (p.nutr.salt === null) out.push("salt");
  if (p.nutr.satfat === null) out.push("saturated fat");
  if (p.nutr.protein === null) out.push("protein");
  if (!p.ingredients) out.push("ingredients list");
  if (!p.image) out.push("photo");
  return out;
}

export function additiveLabel(tag: string) {
  return tag.replace(/^[a-z]{2}:/, "").toUpperCase();
}

export const gradeScore = { a: 5, b: 4, c: 3, d: 2, e: 1 } as const;

export function scoreToGrade(x: number): keyof typeof GRADE_COLORS {
  if (x >= 4.5) return "a";
  if (x >= 3.5) return "b";
  if (x >= 2.5) return "c";
  if (x >= 1.5) return "d";
  return "e";
}
