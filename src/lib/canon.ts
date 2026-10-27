import { CANON, STAPLES, type Canon } from "@/lib/canon-data";
import type { Loc } from "@/types/db";

export { CANON, STAPLES, type Canon };

const byid = new Map(CANON.map((x) => [x.id, x]));

// tag -> canon id. later (more specific) entries don't overwrite earlier ones on purpose
const bytag = new Map<string, string>();
for (const x of CANON) for (const t of x.tags) if (!bytag.has(t)) bytag.set(t, x.id);

// flatten keywords once, longest first so "peanut butter" beats "butter"
const kwlist = CANON.flatMap((x) => x.kw.map((k) => ({ k, id: x.id }))).sort((a, b) => b.k.length - a.k.length);

export function getCanon(id: string | null | undefined): Canon | null {
  return id ? (byid.get(id) ?? null) : null;
}

export function normName(s: string) {
  return (
    ` ${s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      // "500ml", "1 kg", "2x200g" are noise for matching
      .replace(/\d+(\.\d+)?\s*(x\s*\d+\s*)?(ml|l|ltr|g|gm|gms|kg|pcs|pc|pack|oz)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()} `
  );
}

export function canonFromTags(tags: readonly string[] | null | undefined): string | null {
  if (!tags?.length) return null;
  // OFF lists categories general -> specific, so walk backwards for the most specific hit
  for (let i = tags.length - 1; i >= 0; i--) {
    const hit = bytag.get(tags[i].toLowerCase());
    if (hit) return hit;
  }
  return null;
}

export function canonFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = normName(name);
  for (const { k, id } of kwlist) {
    if (n.includes(` ${k} `)) return id;
  }
  return null;
}

export type CanonInput = {
  name?: string | null;
  categories?: readonly string[] | null;
  saved?: string | null; // a user's correction stored on products.canon_ing
};

export type CanonHit = { id: string; via: "saved" | "tags" | "name" } | null;

// resolution order from the spec: saved correction > OFF tags > name keywords > ask the user
export function resolveCanon(inp: CanonInput): CanonHit {
  if (inp.saved && byid.has(inp.saved)) return { id: inp.saved, via: "saved" };
  const t = canonFromTags(inp.categories);
  if (t) return { id: t, via: "tags" };
  const n = canonFromName(inp.name);
  if (n) return { id: n, via: "name" };
  return null;
}

// --- mappings to the other APIs

export function spoonName(id: string): string {
  return getCanon(id)?.spoon ?? id;
}

export function mealName(id: string): string {
  const x = getCanon(id);
  if (x?.meal) return x.meal;
  return titleCase(x?.spoon ?? id);
}

export function cocktailName(id: string): string | null {
  return getCanon(id)?.cdb ?? null;
}

export function fruityName(id: string): string | null {
  return getCanon(id)?.fv ?? null;
}

// handy for the cocktail side: canon ids for every cdb ingredient name (lowercased)
export const cdbToCanon = (() => {
  const m = new Map<string, string[]>();
  for (const x of CANON) {
    if (!x.cdb) continue;
    const k = x.cdb.toLowerCase();
    m.set(k, [...(m.get(k) ?? []), x.id]);
  }
  return m;
})();

// --- expiry suggestions

export function shelfDays(id: string | null | undefined, fallback = 7): number {
  return getCanon(id)?.shelf ?? fallback;
}

export function defaultLoc(id: string | null | undefined): Loc {
  return getCanon(id)?.loc ?? "shelf";
}

// freezer roughly triples how long most things last; cap so dry goods don't go silly
export function suggestExpiry(id: string | null | undefined, loc: Loc, from = new Date()): string {
  let days = shelfDays(id);
  if (loc === "freezer") days = Math.min(days * 3, 180);
  const d = new Date(from.getTime() + days * 86400000);
  return isoDay(d);
}

// IST is UTC+5:30 with no DST, so a fixed offset is safe
export function isoDay(d: Date): string {
  const ist = new Date(d.getTime() + 330 * 60000);
  return ist.toISOString().slice(0, 10);
}

// --- fruit detection for the "real fruit" comparison

const fruitKw: { k: string; fv: string }[] = CANON.filter((x) => x.fv && (x.group === "fruit" || x.group === "bev"))
  .flatMap((x) => [x.label.toLowerCase(), ...x.kw].map((k) => ({ k: k.replace(/\s*\(.*\)/, ""), fv: x.fv as string })))
  .sort((a, b) => b.k.length - a.k.length);

const fruityCats = ["juice", "nectar", "jam", "marmalade", "fruit", "dried", "compote", "smoothie", "squash", "preserve", "puree", "drink"];
const fruityTags = /fruit-juices|juices-and-nectars|nectars|jams|marmalades|fruit-snacks|dried-fruits|compotes|smoothies|fruit-based|fruit-preserves/;

// juice, nectar, jam, fruit snack, dried fruit - and we must be able to name the fruit
export function isFruitBased(name: string | null | undefined, cats: readonly string[] | null | undefined): boolean {
  if (detectFruit(name, cats) === null) return false;
  if (fruityTags.test((cats ?? []).join(" ").toLowerCase())) return true;
  const n = normName(name ?? "");
  return fruityCats.some((w) => n.includes(` ${w} `));
}

export function detectFruit(name: string | null | undefined, cats: readonly string[] | null | undefined): string | null {
  // tags first: "en:orange-juices" is a much stronger signal than a brand name
  for (const t of [...(cats ?? [])].reverse()) {
    const words = normName(t.replace(/^[a-z]{2}:/, "").replace(/-/g, " "));
    for (const { k, fv } of fruitKw) {
      const singular = k.replace(/s$/, "");
      if (words.includes(` ${k} `) || words.includes(` ${singular} `) || words.includes(` ${singular}s `) || words.includes(` ${singular}es `)) return fv;
    }
  }
  const n = normName(name ?? "");
  for (const { k, fv } of fruitKw) if (n.includes(` ${k} `)) return fv;
  return null;
}

// --- picker options for the "what is this?" select

export const canonOptions = CANON.map((x) => ({ id: x.id, label: x.label, group: x.group })).sort((a, b) => a.label.localeCompare(b.label));

export function isStaple(id: string) {
  return STAPLES.has(id);
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (m) => m.toUpperCase());
}
