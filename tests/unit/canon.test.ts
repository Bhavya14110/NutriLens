import { describe, expect, it } from "vitest";
import {
  CANON,
  canonFromName,
  canonFromTags,
  canonOptions,
  cocktailName,
  detectFruit,
  fruityName,
  getCanon,
  isFruitBased,
  mealName,
  normName,
  resolveCanon,
  shelfDays,
  spoonName,
  suggestExpiry,
} from "@/lib/canon";

describe("dictionary", () => {
  it("has ~150 unique base ingredients", () => {
    expect(CANON.length).toBeGreaterThanOrEqual(150);
    expect(new Set(CANON.map((c) => c.id)).size).toBe(CANON.length);
  });

  it("covers the Indian kitchen basics", () => {
    for (const id of ["paneer", "atta", "besan", "ghee", "curd", "poha", "toor dal", "moong dal", "masoor dal", "urad dal", "chana dal", "sooji", "jaggery", "asafoetida"]) {
      expect(getCanon(id), id).not.toBeNull();
    }
  });

  it("keeps keywords lowercase and every entry has a shelf life", () => {
    for (const c of CANON) {
      expect(c.kw.every((k) => k === k.toLowerCase()), c.id).toBe(true);
      expect(c.shelf).toBeGreaterThan(0);
    }
  });

  it("offers sorted picker options for the manual select", () => {
    expect(canonOptions.length).toBe(CANON.length);
    expect(canonOptions[0].label.localeCompare(canonOptions[1].label)).toBeLessThanOrEqual(0);
  });
});

describe("name matching", () => {
  it.each([
    ["Amul Taaza Toned Milk 500ml", "milk"],
    ["Mother Dairy Classic Dahi 400g", "curd"],
    ["Amul Fresh Paneer 200 g", "paneer"],
    ["Aashirvaad Shudh Chakki Atta 5kg", "atta"],
    ["Tata Sampann Besan", "besan"],
    ["India Gate Basmati Rice Classic", "basmati rice"],
    ["Patanjali Cow Ghee 1L", "ghee"],
    ["Maggi 2-Minute Masala Noodles", "noodles"],
    ["Pintola Peanut Butter Creamy", "peanut butter"],
    ["Dabur Coconut Milk", "coconut milk"],
    ["Real Fruit Power Orange Juice 1L", "orange juice"],
    ["Cadbury Dairy Milk Silk", "chocolate"],
    ["Rajdhani Toor Dal", "toor dal"],
    ["Tata Salt Lite", "salt"],
    ["Thums Up 750 ml", "cola"],
    ["Bru Instant Coffee", "coffee"],
    ["Fresh bhindi", "okra"],
  ])("%s -> %s", (name, want) => {
    expect(canonFromName(name)).toBe(want);
  });

  it("prefers the longest keyword", () => {
    expect(canonFromName("Kissan Mixed Fruit Jam")).toBe("jam");
    expect(canonFromName("butter")).toBe("butter");
    expect(canonFromName("Amul Butter")).toBe("butter");
    expect(canonFromName("Mustard oil kachi ghani")).toBe("mustard oil");
  });

  it("doesn't match inside other words", () => {
    // "egg" must not fire on "eggless"
    expect(canonFromName("Eggless cake")).toBeNull();
    expect(canonFromName("pineapple chunks")).toBe("pineapple");
  });

  it("returns null when nothing fits", () => {
    expect(canonFromName("Zyxwv Gizmo 3000")).toBeNull();
    expect(canonFromName("")).toBeNull();
    expect(canonFromName(null)).toBeNull();
  });

  it("strips sizes and punctuation", () => {
    expect(normName("Milk, 2x200ml!")).toBe(" milk ");
  });
});

describe("tag matching", () => {
  it("uses the most specific OFF category", () => {
    expect(canonFromTags(["en:beverages", "en:fruit-juices", "en:orange-juices"])).toBe("orange juice");
    expect(canonFromTags(["en:spreads", "en:sweet-spreads", "en:hazelnut-spreads", "en:cocoa-and-hazelnuts-spreads"])).toBe("chocolate spread");
    expect(canonFromTags(["en:beverages", "en:sodas", "en:colas"])).toBe("cola");
  });

  it("returns null for unknown tags", () => {
    expect(canonFromTags(["en:something-else"])).toBeNull();
    expect(canonFromTags([])).toBeNull();
  });
});

describe("resolve order", () => {
  it("saved correction beats everything", () => {
    expect(resolveCanon({ saved: "paneer", name: "Amul milk", categories: ["en:milks"] })).toEqual({ id: "paneer", via: "saved" });
  });
  it("ignores a saved value that isn't in the dictionary", () => {
    expect(resolveCanon({ saved: "unicorn", name: "Amul milk" })).toEqual({ id: "milk", via: "name" });
  });
  it("tags beat name keywords", () => {
    expect(resolveCanon({ name: "Something butter", categories: ["en:peanut-butters"] })).toEqual({ id: "peanut butter", via: "tags" });
  });
  it("falls back to name, then null (ask the user)", () => {
    expect(resolveCanon({ name: "Haldiram Aloo Bhujia", categories: ["en:snacks"] })).toEqual({ id: "namkeen", via: "name" });
    expect(resolveCanon({ name: "Mystery tin" })).toBeNull();
  });
});

describe("api name mappings", () => {
  it("maps to spoonacular / mealdb / cocktaildb / fruityvice names", () => {
    expect(spoonName("curd")).toBe("yogurt");
    expect(spoonName("onion")).toBe("onion");
    expect(mealName("onion")).toBe("Onion");
    expect(mealName("curd")).toBe("Greek Yogurt");
    expect(cocktailName("orange juice")).toBe("Orange juice");
    expect(cocktailName("milk")).toBe("Milk");
    expect(cocktailName("atta")).toBeNull();
    expect(fruityName("banana")).toBe("Banana");
  });
});

describe("shelf life + expiry suggestions", () => {
  it("matches the spec defaults", () => {
    expect(shelfDays("milk")).toBe(5);
    expect(shelfDays("curd")).toBe(4);
    expect(shelfDays("bread")).toBe(4);
    expect(shelfDays("paneer")).toBe(5);
    expect(shelfDays("spinach")).toBe(3);
    expect(shelfDays("banana")).toBeGreaterThanOrEqual(5);
    expect(shelfDays("rice")).toBeGreaterThanOrEqual(180);
    expect(shelfDays("unknown-thing")).toBe(7);
  });

  it("suggests dates in IST and stretches the freezer", () => {
    // 20:00 UTC on Jan 1 is already Jan 2 in India
    const from = new Date("2026-01-01T20:00:00Z");
    expect(suggestExpiry("milk", "fridge", from)).toBe("2026-01-07");
    expect(suggestExpiry("milk", "freezer", from)).toBe("2026-01-17");
    expect(suggestExpiry("rice", "freezer", from)).toBe("2026-07-01");
  });
});

describe("fruit detection", () => {
  it("spots the fruit in juices and jams", () => {
    expect(detectFruit("Orangensaft", ["en:beverages", "en:fruit-juices", "en:orange-juices"])).toBe("Orange");
    expect(detectFruit("Kissan Mango Jam", ["en:jams"])).toBe("Mango");
    expect(detectFruit("Paper Boat Aam Panna", [])).toBe("Mango");
  });

  it("knows what counts as fruit-based", () => {
    expect(isFruitBased("Orangensaft", ["en:fruit-juices", "en:orange-juices"])).toBe(true);
    expect(isFruitBased("Kissan Mixed Fruit Jam", ["en:jams"])).toBe(false); // no single fruit to compare
    expect(isFruitBased("Strawberry jam", ["en:jams"])).toBe(true);
    expect(isFruitBased("Nutella", ["en:hazelnut-spreads"])).toBe(false);
    expect(isFruitBased("Coca-Cola", ["en:sodas", "en:colas"])).toBe(false);
  });
});
