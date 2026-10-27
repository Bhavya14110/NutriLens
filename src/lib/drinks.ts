import "server-only";
import { byIngredient, lookupDrink, nonAlcoholic } from "@/lib/apis/cocktaildb";
import { cachedFetch, TTL } from "@/lib/cache";
import { cocktailName } from "@/lib/canon";
import { pmapSafe } from "@/lib/pmap";
import type { Drink, DrinkCard } from "@/types/food";

export function cdbNames(canonIds: readonly (string | null)[]): string[] {
  return [...new Set(canonIds.map((c) => (c ? cocktailName(c) : null)).filter((x): x is string => Boolean(x)))];
}

// "Orange juice" in the pantry should also light up a drink calling for "Orange"
export function drinkMatches(d: Pick<Drink, "ings">, have: readonly string[]): string[] {
  const mine = have.map((h) => h.toLowerCase());
  return d.ings
    .map((i) => i.name)
    .filter((n) => {
      const x = n.toLowerCase();
      return mine.some((h) => h === x || h.startsWith(`${x} `) || x.startsWith(`${h} `));
    });
}

// the free key only returns ~1 drink per ingredient filter, so we pull the whole
// non-alcoholic list once a week and match against the pantry ourselves
async function naCatalogue(): Promise<Drink[]> {
  return cachedFetch("cdb:na:full", TTL.cocktail, async () => {
    const list = await nonAlcoholic();
    const full = await pmapSafe(list, 6, (x) => lookupDrink(x.id));
    return full.filter((d): d is Drink => d !== null);
  });
}

export type DrinkIdeas = { drinks: DrinkCard[]; have: string[]; alcohol: boolean };

export async function drinkIdeas(canonIds: readonly (string | null)[], alcoholOk: boolean, want = 12): Promise<DrinkIdeas> {
  const have = cdbNames(canonIds);
  const na = await naCatalogue();
  const naIds = new Set(na.map((d) => d.id));

  // the spec'd per-ingredient filter still adds variety (and the boozy ones when allowed)
  const extraLists = await pmapSafe(have.slice(0, 8), 3, (n) => byIngredient(n));
  const extraIds = [...new Set(extraLists.flatMap((l) => l ?? []).map((x) => x.id))].filter((id) => alcoholOk || naIds.has(id));
  const extra = (await pmapSafe(extraIds.filter((id) => !naIds.has(id)), 3, (id) => lookupDrink(id))).filter((d): d is Drink => d !== null);

  const pool = [...na, ...extra].filter((d) => alcoholOk || !d.alcoholic);
  const scored = pool
    .map((d) => ({ ...d, matches: drinkMatches(d, have) }))
    .filter((d) => d.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length || a.ings.length - b.ings.length);

  return {
    drinks: scored.slice(0, want).map(({ id, name, image, matches, alcoholic }) => ({ id, name, image, matches, alcoholic })),
    have,
    alcohol: alcoholOk,
  };
}
