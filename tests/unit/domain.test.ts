import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { allergenHits, allergenLabel } from "@/lib/allergens";
import { setCacheStore } from "@/lib/cache";
import { ingOk, recipeOk, recipeOkFor } from "@/lib/diet";
import { drinkIdeas, drinkMatches } from "@/lib/drinks";
import { addDays, daysLeft, expiryText, freshness, todayIst } from "@/lib/expiry";
import { bars, lightFor, missingFields, scoreToGrade } from "@/lib/health";
import { setQuotaStore } from "@/lib/quota";
import { guessInr, matchesLine, mergeShop, type ShopLine } from "@/lib/shop";
import { pantryCanon, spoonCards, useItUp, type PItem } from "@/lib/useitup";
import type { Product } from "@/types/food";
import { fx, json, MemQuota, MemStore, routeFetch } from "./helpers";

const today = todayIst();
const item = (name: string, canon: string, inDays: number | null): PItem => ({
  id: name,
  name,
  canon_ing: canon,
  expires_at: inDays === null ? null : addDays(today, inDays),
});

beforeEach(() => {
  setCacheStore(new MemStore());
  setQuotaStore(new MemQuota());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("expiry", () => {
  it("classifies fresh / soon / expired by IST day", () => {
    expect(freshness(addDays(today, -1))).toBe("expired");
    expect(freshness(today)).toBe("soon");
    expect(freshness(addDays(today, 3))).toBe("soon");
    expect(freshness(addDays(today, 4))).toBe("fresh");
    expect(freshness(null)).toBe("none");
    expect(daysLeft(addDays(today, 2))).toBe(2);
  });
  it("words it like a human", () => {
    expect(expiryText(today)).toBe("Use today");
    expect(expiryText(addDays(today, 1))).toBe("Use by tomorrow");
    expect(expiryText(addDays(today, -3))).toBe("Expired 3 days ago");
  });
});

describe("health card", () => {
  it("uses traffic-light thresholds per 100 g", () => {
    expect(lightFor("sugar", 4)).toBe("low");
    expect(lightFor("sugar", 10)).toBe("medium");
    expect(lightFor("sugar", 56)).toBe("high");
    expect(lightFor("salt", 2)).toBe("high");
    expect(lightFor("satfat", null)).toBeNull();
    // drinks get stricter sugar cut-offs
    expect(lightFor("sugar", 10.6, true)).toBe("medium");
    expect(lightFor("sugar", 12, true)).toBe("high");
  });

  it("lists missing data instead of guessing", () => {
    const p: Product = {
      barcode: "1",
      name: "Thing",
      brand: null,
      image: null,
      grade: null,
      nova: null,
      nutr: { energy: null, sugar: 3, salt: null, satfat: null, protein: 1, fat: null, carbs: null, fiber: null },
      allergens: [],
      additives: [],
      categories: [],
      ingredients: null,
      quantity: null,
    };
    expect(missingFields(p)).toEqual(expect.arrayContaining(["Nutri-Score", "NOVA group", "salt", "saturated fat", "ingredients list", "photo"]));
    expect(missingFields(p)).not.toContain("sugar");
    expect(bars(p).map((b) => b.key)).toEqual(["sugar", "salt", "satfat", "protein"]);
  });

  it("averages grades back to a letter", () => {
    expect(scoreToGrade(4.6)).toBe("a");
    expect(scoreToGrade(3)).toBe("c");
    expect(scoreToGrade(1.2)).toBe("e");
  });
});

describe("allergens", () => {
  it("names every household member who's affected", () => {
    const hits = allergenHits(["en:milk", "en:nuts"], [
      { name: "Asha", allergens: ["nuts"] },
      { name: "Ravi", allergens: ["gluten"] },
      { name: "Meera", allergens: ["milk", "eggs"] },
    ]);
    expect(hits).toEqual([
      { name: "Asha", allergens: ["nuts"] },
      { name: "Meera", allergens: ["milk"] },
    ]);
    expect(allergenLabel("en:sesame-seeds")).toBe("Sesame");
  });
});

describe("diets", () => {
  it("handles vegetarian, vegan and jain", () => {
    expect(recipeOk("vegetarian", ["paneer", "tomato", "onion"])).toBe(true);
    expect(recipeOk("vegetarian", ["chicken breast"])).toBe(false);
    expect(recipeOk("vegan", ["paneer"])).toBe(false);
    expect(recipeOk("vegan", ["coconut milk", "peanut butter", "eggplant"])).toBe(true);
    expect(recipeOk("jain", ["onion"])).toBe(false);
    expect(recipeOk("jain", ["paneer", "tomato"])).toBe(true);
    expect(ingOk("jain", "eggs")).toBe(false);
    expect(recipeOkFor(["vegetarian", "jain"], ["potato"])).toBe(false);
    expect(recipeOkFor(["none"], ["beef"])).toBe(true);
    // plurals used to slip through
    expect(recipeOk("vegetarian", ["breakfast sausages"])).toBe(false);
    expect(recipeOk("vegetarian", ["anchovies"])).toBe(false);
    expect(recipeOk("vegetarian", ["chicken thighs"])).toBe(false);
    expect(recipeOk("vegan", ["eggs"])).toBe(false);
    expect(recipeOk("vegetarian", ["green beans", "potatoes", "lentils"])).toBe(true);
  });
});

describe("shopping list", () => {
  const line = (id: string, name: string, canon: string | null, qty = 1, unit = "pcs", done = false): ShopLine => ({ id, name, canon_ing: canon, qty, unit, done, est_cost_inr: null });

  it("merges duplicates by canonical ingredient", () => {
    const m = mergeShop([line("1", "milk", "milk", 1, "l"), line("2", "Amul Gold milk", "milk", 2, "l"), line("3", "bread", "bread"), line("4", "Bread", null)]);
    const milk = m.find((x) => x.canon_ing === "milk");
    expect(milk).toMatchObject({ qty: 3, name: "Amul Gold milk", ids: ["1", "2"] });
    // "Bread" with no canon still folds into the canon=bread line by name
    expect(m).toHaveLength(2);
    expect(m.find((x) => x.canon_ing === "bread")?.ids).toEqual(["3", "4"]);
  });

  it("keeps done and todo apart", () => {
    expect(mergeShop([line("1", "milk", "milk"), line("2", "milk", "milk", 1, "pcs", true)])).toHaveLength(2);
  });

  it("auto-ticks a scan that matches a line", () => {
    expect(matchesLine(line("1", "milk", "milk"), { canon: "milk", name: "Amul Taaza" })).toBe(true);
    expect(matchesLine(line("1", "milk", "milk"), { canon: "curd", name: "Amul Dahi" })).toBe(false);
    expect(matchesLine(line("1", "Maggi", null), { canon: null, name: "Maggi Masala Noodles" })).toBe(true);
    expect(matchesLine(line("1", "milk", "milk", 1, "pcs", true), { canon: "milk", name: "x" })).toBe(false);
  });

  it("has a local ₹ fallback guess", () => {
    expect(guessInr("milk", 2)).toBe(64);
    expect(guessInr(null)).toBeGreaterThan(0);
  });
});

describe("use it up", () => {
  it("orders pantry ingredients expiring-first and flags the soon ones", () => {
    const { ids, soon } = pantryCanon([item("Rice", "rice", 200), item("Milk", "milk", 1), item("Salt", "salt", 300), item("Paneer", "paneer", 2)]);
    expect(ids).toEqual(["milk", "paneer", "rice"]);
    expect([...soon].sort()).toEqual(["milk", "paneer"]);
  });

  it("ranks spoonacular recipes by rescued items and respects diet", async () => {
    vi.stubEnv("SPOONACULAR_KEY", "k");
    routeFetch([["findByIngredients", () => json(fx("spoon-find.json"))]]);
    const res = await useItUp([item("Paneer", "paneer", 1), item("Tomato", "tomato", 1), item("Onion", "onion", 10), item("Curd", "curd", 5), item("Banana", "banana", 6)], ["vegetarian"]);
    expect(res.source).toBe("spoon");
    expect(res.note).toBeNull();
    expect(res.recs[0].title).toBe("Paneer Bhurji");
    expect(res.recs[0].rescues).toBe(2);
    // chicken tikka is filtered out for vegetarians
    expect(res.recs.some((r) => r.title === "Chicken Tikka")).toBe(false);
  });

  it("checks the title too, since spoonacular's ingredient lists can be incomplete", () => {
    const row = { id: 1, title: "Sausage, Spinach, and Quail Egg Breakfast Salad", image: null, likes: 0, usedIngredientCount: 1, missedIngredientCount: 0, usedIngredients: [{ name: "spinach" }], missedIngredients: [] };
    expect(spoonCards([row], ["spinach"], new Set(), ["vegetarian"])).toEqual([]);
    expect(spoonCards([row], ["spinach"], new Set(), ["none"])).toHaveLength(1);
  });

  it("silently falls back to TheMealDB when the quota is spent", async () => {
    vi.stubEnv("SPOONACULAR_KEY", "k");
    vi.stubEnv("SPOON_DAILY_POINTS", "0.5");
    const { calls } = routeFetch([
      ["filter.php?i=", () => json(fx("mdb-filter-chicken.json"))],
      [/lookup\.php\?i=\d+/, () => json(fx("mdb-lookup.json"))],
    ]);
    const res = await useItUp([item("Chicken", "chicken", 1), item("Soy", "soy sauce", 30)], ["none"]);
    expect(calls.some((u) => u.includes("spoonacular"))).toBe(false);
    expect(res.source).toBe("mealdb");
    expect(res.note).toBe("Showing more ideas");
    expect(res.recs.length).toBeGreaterThan(0);
    expect(res.recs[0].used).toBeGreaterThan(0);
  });

  it("returns an empty result for an empty pantry", async () => {
    const res = await useItUp([], ["none"]);
    expect(res.recs).toEqual([]);
  });
});

describe("drinks", () => {
  it("matches juice leftovers to non-alcoholic drinks only by default", async () => {
    const afterglow = fx("cdb-lookup-afterglow.json");
    routeFetch([
      ["a=Non_Alcoholic", () => json({ drinks: [{ idDrink: "12560", strDrink: "Afterglow", strDrinkThumb: null }] })],
      ["lookup.php?i=12560", () => json(afterglow)],
      ["filter.php?i=", () => json({ drinks: [{ idDrink: "11007", strDrink: "Margarita", strDrinkThumb: null }] })],
    ]);
    const res = await drinkIdeas(["orange juice", "milk"], false);
    expect(res.drinks.map((d) => d.name)).toEqual(["Afterglow"]);
    expect(res.drinks[0].matches).toEqual(["Orange juice"]);
    expect(res.have).toEqual(["Orange juice", "Milk"]);
  });

  it("fuzzy-matches 'Orange juice' with 'Orange'", () => {
    expect(drinkMatches({ ings: [{ name: "Orange", measure: "" }] }, ["Orange juice"])).toEqual(["Orange"]);
    expect(drinkMatches({ ings: [{ name: "Lemon", measure: "" }] }, ["Lemonade"])).toEqual([]);
  });
});
