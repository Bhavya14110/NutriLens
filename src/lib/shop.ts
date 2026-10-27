import { getCanon, normName } from "@/lib/canon";
import type { CanonGroup } from "@/lib/canon-data";

export type ShopLine = { id: string; name: string; canon_ing: string | null; qty: number; unit: string; done: boolean; est_cost_inr: number | null };

export type Merged = ShopLine & { ids: string[] };

const key = (s: Pick<ShopLine, "canon_ing" | "name">) => s.canon_ing ?? normName(s.name).trim();

// "milk" + "Milk" + "Amul milk" (all canon=milk) become one line; qty adds up when units agree
export function mergeShop(lines: readonly ShopLine[]): Merged[] {
  const out = new Map<string, Merged>();
  for (const l of lines) {
    const k = `${l.done ? "done" : "todo"}:${key(l)}`;
    const cur = out.get(k);
    if (!cur) {
      out.set(k, { ...l, ids: [l.id] });
      continue;
    }
    cur.ids.push(l.id);
    if (cur.unit === l.unit) cur.qty += l.qty;
    else cur.qty = Math.max(cur.qty, l.qty);
    if (l.est_cost_inr !== null) cur.est_cost_inr = (cur.est_cost_inr ?? 0) + l.est_cost_inr;
    // prefer the more specific name ("Amul Gold milk" over "milk")
    if (l.name.length > cur.name.length) cur.name = l.name;
  }
  return [...out.values()];
}

// does a scanned product tick off a list line?
export function matchesLine(line: Pick<ShopLine, "canon_ing" | "name" | "done">, scan: { canon: string | null; name: string | null }): boolean {
  if (line.done) return false;
  if (line.canon_ing && scan.canon) return line.canon_ing === scan.canon;
  const a = normName(line.name).trim();
  const b = normName(scan.name ?? "").trim();
  return Boolean(a && b && (b.includes(a) || a.includes(b)));
}

// Rough Indian retail prices (2026). `kg` is ₹ per kg or litre, `pc` is ₹ per typical
// pack / piece as people put it on a list ("1 bread", "2 Frooti"). Used for the local
// estimate and to sanity-check Spoonacular, whose numbers are US-priced and sometimes
// read "1 paprika" as a pinch worth nothing.
type Price = { kg: number; pc: number };

const GROUP_INR: Record<CanonGroup, Price> = {
  dairy: { kg: 80, pc: 40 },
  grain: { kg: 80, pc: 60 },
  pulse: { kg: 140, pc: 70 },
  veg: { kg: 50, pc: 30 },
  fruit: { kg: 120, pc: 40 },
  spice: { kg: 400, pc: 60 },
  sauce: { kg: 250, pc: 100 },
  bev: { kg: 100, pc: 40 },
  protein: { kg: 300, pc: 100 },
  nut: { kg: 900, pc: 150 },
  sweet: { kg: 200, pc: 100 },
  oil: { kg: 160, pc: 180 },
  snack: { kg: 300, pc: 30 },
  bakery: { kg: 150, pc: 45 },
};

// things off our ingredient list (recipe extras like "thyme") - a middle-of-the-road guess
const UNKNOWN: Price = { kg: 150, pc: 50 };

const ITEM_INR: Record<string, Price> = {
  milk: { kg: 60, pc: 32 },
  curd: { kg: 120, pc: 40 },
  paneer: { kg: 450, pc: 90 },
  cheese: { kg: 600, pc: 130 },
  butter: { kg: 550, pc: 60 },
  ghee: { kg: 650, pc: 320 },
  cream: { kg: 250, pc: 70 },
  bread: { kg: 110, pc: 45 },
  eggs: { kg: 160, pc: 7 },
  onion: { kg: 40, pc: 10 },
  tomato: { kg: 40, pc: 8 },
  potato: { kg: 35, pc: 8 },
  ginger: { kg: 150, pc: 20 },
  garlic: { kg: 200, pc: 20 },
  "green chilli": { kg: 80, pc: 10 },
  "coriander leaves": { kg: 100, pc: 15 },
  spinach: { kg: 60, pc: 30 },
  banana: { kg: 60, pc: 6 },
  apple: { kg: 180, pc: 30 },
  lemon: { kg: 100, pc: 5 },
  rice: { kg: 70, pc: 70 },
  "basmati rice": { kg: 120, pc: 120 },
  atta: { kg: 50, pc: 250 },
  sugar: { kg: 45, pc: 45 },
  salt: { kg: 25, pc: 25 },
  tea: { kg: 500, pc: 140 },
  coffee: { kg: 1000, pc: 190 },
  "vegetable oil": { kg: 150, pc: 150 },
  chicken: { kg: 250, pc: 250 },
  "mango juice": { kg: 70, pc: 20 },
  "orange juice": { kg: 130, pc: 130 },
  cola: { kg: 55, pc: 40 },
  "black pepper": { kg: 800, pc: 60 },
};

const WEIGHT: Record<string, number> = { g: 0.001, kg: 1, ml: 0.001, l: 1 };

export function priceFor(canon: string | null): Price {
  if (canon && ITEM_INR[canon]) return ITEM_INR[canon];
  const g = getCanon(canon)?.group;
  return g ? GROUP_INR[g] : UNKNOWN;
}

// local estimate that respects units: "2 l milk" ≠ "2 milk", "1 dozen eggs" = 12 eggs
export function guessInr(canon: string | null, qty = 1, unit = "pcs"): number {
  const p = priceFor(canon);
  const u = unit.toLowerCase();
  if (u in WEIGHT) return Math.max(5, Math.round(p.kg * qty * WEIGHT[u]));
  const count = u === "dozen" ? qty * 12 : qty;
  // a "bunch" or "pack" counts as one piece
  return Math.max(5, Math.round(p.pc * Math.max(count, 0.25)));
}

export const knownPrice = (canon: string | null) => Boolean(canon && ITEM_INR[canon]);

// keep Spoonacular's figure only if it's in the same ballpark as a typical Indian price
export const PLAUSIBLE = { low: 0.4, high: 2.5 } as const;

// for staples we have a real Indian price for, that wins over Spoonacular's US one;
// for everything else Spoonacular is used when it looks sane
export function pickCost(spoonInr: number | null | undefined, localInr: number, known = false): { inr: number; src: "spoon" | "local" } {
  if (known || spoonInr === null || spoonInr === undefined || !Number.isFinite(spoonInr)) return { inr: localInr, src: "local" };
  const r = spoonInr / localInr;
  return r >= PLAUSIBLE.low && r <= PLAUSIBLE.high ? { inr: Math.round(spoonInr), src: "spoon" } : { inr: localInr, src: "local" };
}

export function centsToInr(cents: number, rate: number) {
  return Math.round((cents / 100) * rate);
}

export function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
