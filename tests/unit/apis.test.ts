import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as cdb from "@/lib/apis/cocktaildb";
import { getFruit, listFruits } from "@/lib/apis/fruityvice";
import * as mealdb from "@/lib/apis/mealdb";
import { getProduct, getSwaps, isBarcode, swapCats } from "@/lib/apis/off";
import { estimateCost, findByIngredients, QuotaSkip, recipeInfo } from "@/lib/apis/spoonacular";
import { setCacheStore } from "@/lib/cache";
import { setQuotaStore } from "@/lib/quota";
import { fx, json, MemQuota, MemStore, routeFetch } from "./helpers";

let quota: MemQuota;
beforeEach(() => {
  setCacheStore(new MemStore());
  quota = new MemQuota();
  setQuotaStore(quota);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Open Food Facts", () => {
  it("maps a product and sends our User-Agent + a limited fields list", async () => {
    vi.stubEnv("OFF_CONTACT_EMAIL", "team@example.com");
    const { fn, calls } = routeFetch([["/api/v2/product/3017624010701", () => json(fx("off-nutella.json"))]]);
    const p = await getProduct("3017624010701");
    expect(p?.name).toBe("Nutella");
    expect(p?.brand).toBe("Ferrero");
    expect(p?.grade).toBe("e");
    expect(p?.nova).toBeNull(); // missing in this record, the card says so
    expect(p?.nutr.sugar).toBeGreaterThan(50);
    expect(p?.allergens).toContain("en:nuts");
    expect(calls[0]).toContain("fields=code,product_name,brands");
    const init = fn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe("NutriLens/1.0 (contact: team@example.com)");
  });

  it("returns null for unknown barcodes and bad input", async () => {
    routeFetch([["/api/v2/product/", () => json(fx("off-notfound.json"))]]);
    expect(await getProduct("0000000000001")).toBeNull();
    expect(await getProduct("not-a-code")).toBeNull();
    expect(isBarcode("8901058000290")).toBe(true);
  });

  it("finds up to 3 better swaps in the same category", async () => {
    routeFetch([
      ["/api/v2/product/3017624010701", () => json(fx("off-nutella.json"))],
      ["search.openfoodfacts.org", () => json(fx("off-sal-swaps.json"))],
    ]);
    const p = await getProduct("3017624010701");
    if (!p) throw new Error("fixture broke");
    const swaps = await getSwaps(p);
    expect(swaps.length).toBeGreaterThan(0);
    expect(swaps.length).toBeLessThanOrEqual(3);
    for (const s of swaps) expect(["a", "b", "c", "d"]).toContain(s.grade);
    expect(swaps[0].grade <= swaps[swaps.length - 1].grade).toBe(true);
  });

  it("skips swaps for A-grade or ungraded products", async () => {
    const base = { barcode: "1", name: "x", brand: null, image: null, nova: null, allergens: [], additives: [], ingredients: null, quantity: null, categories: ["en:yogurts"], nutr: { energy: null, sugar: null, salt: null, satfat: null, protein: null, fat: null, carbs: null, fiber: null } };
    expect(await getSwaps({ ...base, grade: "a" })).toEqual([]);
    expect(await getSwaps({ ...base, grade: null })).toEqual([]);
  });

  it("picks specific english categories for swaps", () => {
    expect(swapCats(["en:beverages", "en:fruit-juices", "en:orange-juices", "fr:jus"])).toEqual(["en:orange-juices", "en:fruit-juices"]);
  });
});

describe("Fruityvice", () => {
  it("gets one fruit and maps nutritions", async () => {
    routeFetch([["/api/fruit/banana", () => json(fx("fv-banana.json"))]]);
    const f = await getFruit("Banana");
    expect(f).toMatchObject({ name: "Banana", family: "Musaceae", nutr: { sugar: 17.2, carbs: 22 } });
  });

  it("lists all fruits sorted", async () => {
    routeFetch([["/api/fruit/all", () => json(fx("fv-all.json"))]]);
    const all = await listFruits();
    expect(all.length).toBeGreaterThan(40);
    expect(all[0].name.localeCompare(all[1].name)).toBeLessThan(0);
  });

  it("returns null for unknown fruit instead of throwing", async () => {
    routeFetch([
      ["/api/fruit/all", () => json(fx("fv-all.json"))],
      ["/api/fruit/dragon", () => json(fx("fv-notfound.json"), 404)],
    ]);
    expect(await getFruit("dragon")).toBeNull();
    expect(await getFruit("<script>")).toBeNull();
  });
});

describe("Spoonacular", () => {
  beforeEach(() => {
    vi.stubEnv("SPOONACULAR_KEY", "k");
    vi.stubEnv("SPOON_DAILY_POINTS", "45");
  });

  it("findByIngredients sends the key header + ranking params and logs points", async () => {
    const { fn, calls } = routeFetch([["findByIngredients", () => json(fx("spoon-find.json"), 200, { "x-api-quota-request": "1.03" })]]);
    const rows = await findByIngredients(["Banana", "yogurt"], 10);
    expect(rows).toHaveLength(3);
    expect(calls[0]).toContain("ranking=1");
    expect(calls[0]).toContain("ignorePantry=true");
    expect(calls[0]).toContain("number=10");
    expect(((fn.mock.calls[0][1] as RequestInit).headers as Record<string, string>)["x-api-key"]).toBe("k");
    expect(await quota.used(new Date().toISOString().slice(0, 10))).toBeCloseTo(1.03);
  });

  it("throws QuotaSkip before calling when the budget is spent", async () => {
    await quota.add(new Date().toISOString().slice(0, 10), 44.5);
    const { fn } = routeFetch([]);
    await expect(findByIngredients(["milk"])).rejects.toBeInstanceOf(QuotaSkip);
    expect(fn).not.toHaveBeenCalled();
  });

  it("maps recipe info with analysed steps", async () => {
    routeFetch([["/recipes/715497/information", () => json(fx("spoon-info.json"))]]);
    const r = await recipeInfo("715497");
    expect(r?.steps).toEqual(["Add banana, yogurt and berries to a blender.", "Blend until smooth and serve cold."]);
    expect(r?.ings.map((i) => i.name)).toEqual(["banana", "yogurt", "blueberries"]);
  });

  it("estimates cost via a form POST, 1 point per line", async () => {
    const { fn } = routeFetch([["parseIngredients", () => json(fx("spoon-parse.json"))]]);
    const est = await estimateCost(["1 litre milk", "1 bread", "1 kg onion"]);
    expect(est?.cents).toBeCloseTo(723.4);
    const init = fn.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(String(init.body)).toContain("ingredientList=");
    expect(await quota.used(new Date().toISOString().slice(0, 10))).toBe(3);
  });
});

describe("TheMealDB", () => {
  it("treats {meals: null} as an empty list", async () => {
    routeFetch([["filter.php", () => json(fx("mdb-empty.json"))]]);
    expect(await mealdb.byIngredient("zzzz")).toEqual([]);
  });

  it("parses strIngredientN / strMeasureN and the youtube id", async () => {
    routeFetch([["lookup.php?i=52772", () => json(fx("mdb-lookup.json"))]]);
    const r = await mealdb.lookup("52772");
    expect(r?.title).toBe("Teriyaki Chicken Casserole");
    expect(r?.ings.length).toBeGreaterThan(5);
    expect(r?.ings.every((i) => i.name.length > 0)).toBe(true);
    expect(r?.youtube).toMatch(/^[\w-]{11}$/);
    expect(r?.steps.length).toBeGreaterThan(1);
  });

  it("uses the configured key in the path", async () => {
    vi.stubEnv("MEALDB_KEY", "9973533");
    const { calls } = routeFetch([["filter.php", () => json(fx("mdb-filter-chicken.json"))]]);
    const list = await mealdb.byIngredient("Chicken");
    expect(calls[0]).toContain("/api/json/v1/9973533/filter.php?i=Chicken");
    expect(list.length).toBe(20);
  });

  it("extracts youtube ids from the usual url shapes", () => {
    expect(mealdb.ytId("https://www.youtube.com/watch?v=4aZr5hZXP_s")).toBe("4aZr5hZXP_s");
    expect(mealdb.ytId("https://youtu.be/4aZr5hZXP_s")).toBe("4aZr5hZXP_s");
    expect(mealdb.ytId("")).toBeNull();
  });
});

describe("TheCocktailDB", () => {
  it('treats {"drinks": "no data found"} as empty', async () => {
    routeFetch([["filter.php?i=", () => json(fx("cdb-empty.json"))]]);
    expect(await cdb.byIngredient("Zzz")).toEqual([]);
  });

  it("lists non-alcoholic drinks and parses a lookup", async () => {
    routeFetch([
      ["a=Non_Alcoholic", () => json(fx("cdb-non-alcoholic.json"))],
      ["lookup.php?i=12560", () => json(fx("cdb-lookup-afterglow.json"))],
    ]);
    const na = await cdb.nonAlcoholic();
    expect(na.length).toBeGreaterThan(40);
    const d = await cdb.lookupDrink("12560");
    expect(d).toMatchObject({ name: "Afterglow", alcoholic: false });
    expect(d?.ings.map((i) => i.name)).toEqual(["Grenadine", "Orange juice", "Pineapple juice"]);
  });
});
