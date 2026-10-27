import type { Diet } from "@/types/db";

// keyword lists are deliberately broad; a false "not suitable" beats feeding chicken to a vegetarian
const MEAT = ["chicken", "beef", "pork", "lamb", "mutton", "goat", "bacon", "ham", "sausage", "chorizo", "turkey", "duck", "veal", "mince", "keema", "steak", "salami", "pepperoni", "prosciutto", "meat", "liver", "kidney", "oxtail", "gelatin", "gelatine", "lard", "suet", "venison", "rabbit", "anchovy", "anchovies"];
const SEA = ["fish", "salmon", "tuna", "cod", "prawn", "prawns", "shrimp", "crab", "lobster", "mussel", "mussels", "clam", "clams", "oyster", "oysters", "squid", "octopus", "sardine", "sardines", "mackerel", "haddock", "fish sauce", "scallop", "scallops", "monkfish", "herring", "hake"];
const EGG = ["egg", "eggs", "egg yolk", "egg yolks", "egg white", "mayonnaise", "meringue"];
const DAIRY = ["milk", "butter", "cheese", "cream", "yogurt", "yoghurt", "ghee", "paneer", "curd", "buttermilk", "ice cream", "custard", "whey", "condensed milk", "mascarpone", "mozzarella", "cheddar", "parmesan", "feta", "brie", "creme fraiche", "khoya"];
const HONEY = ["honey"];
// jain: no root vegetables or bulbs either
const ROOTS = ["onion", "onions", "garlic", "potato", "potatoes", "carrot", "carrots", "beetroot", "radish", "ginger", "shallot", "shallots", "leek", "leeks", "spring onion", "turnip", "sweet potato", "yam", "scallion", "mushroom", "mushrooms"];

// plant-based look-alikes that shouldn't trip the dairy/egg checks
const SAFE = ["coconut milk", "almond milk", "soy milk", "oat milk", "peanut butter", "cocoa butter", "eggplant", "egg plant", "egg plants", "butternut", "butter beans", "cream of tartar", "vegan"];

// "sausages" / "anchovies" should trip the same check as the singular keyword
const forms = (w: string) => [w, `${w}s`, `${w}es`, w.replace(/y$/, "ies")];

function hits(name: string, words: string[]) {
  let n = ` ${name.toLowerCase().replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim()} `;
  for (const s of SAFE) n = n.replace(` ${s} `, " ");
  return words.some((w) => forms(w).some((f) => n.includes(` ${f} `)));
}

export function ingOk(diet: Diet, name: string): boolean {
  if (diet === "none") return true;
  if (hits(name, MEAT) || hits(name, SEA)) return false;
  if (diet === "vegetarian") return true;
  if (hits(name, EGG)) return false;
  if (diet === "vegan") return !hits(name, DAIRY) && !hits(name, HONEY);
  // jain: lacto-vegetarian, no eggs, no roots
  return !hits(name, ROOTS);
}

export function recipeOk(diet: Diet, ings: readonly string[]): boolean {
  return ings.every((i) => ingOk(diet, i));
}

// cook for everyone: a recipe has to pass every diet in the house
export function houseDiets(diets: readonly Diet[]): Diet[] {
  const set = [...new Set(diets.filter((d) => d !== "none"))];
  return set.length ? set : ["none"];
}

export function recipeOkFor(diets: readonly Diet[], ings: readonly string[]) {
  return diets.every((d) => recipeOk(d, ings));
}

export const DIETS: { id: Diet; label: string; blurb: string }[] = [
  { id: "none", label: "No restriction", blurb: "Everything's on the table" },
  { id: "vegetarian", label: "Vegetarian", blurb: "No meat, fish or seafood" },
  { id: "vegan", label: "Vegan", blurb: "No animal products at all" },
  { id: "jain", label: "Jain", blurb: "Vegetarian, no eggs, no roots like onion or garlic" },
];
