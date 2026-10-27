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

// rough Indian retail price per typical pack, used only when Spoonacular can't price the list
const GROUP_INR: Record<CanonGroup, number> = {
  dairy: 60,
  grain: 80,
  pulse: 130,
  veg: 40,
  fruit: 90,
  spice: 60,
  sauce: 110,
  bev: 90,
  protein: 220,
  nut: 250,
  sweet: 120,
  oil: 180,
  snack: 40,
  bakery: 45,
};

const ITEM_INR: Record<string, number> = {
  milk: 32,
  curd: 40,
  paneer: 90,
  bread: 45,
  eggs: 84,
  onion: 40,
  tomato: 40,
  potato: 35,
  banana: 60,
  apple: 180,
  rice: 90,
  atta: 300,
  ghee: 320,
  butter: 60,
  chicken: 250,
  sugar: 50,
  salt: 25,
  tea: 140,
  coffee: 190,
  "vegetable oil": 170,
};

export function guessInr(canon: string | null, qty = 1): number {
  const per = (canon ? ITEM_INR[canon] : undefined) ?? GROUP_INR[getCanon(canon)?.group ?? "veg"];
  return Math.round(per * Math.max(1, Math.ceil(qty)));
}

export function centsToInr(cents: number, rate: number) {
  return Math.round((cents / 100) * rate);
}

export function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
