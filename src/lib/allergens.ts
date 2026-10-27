// Allergen ids match Open Food Facts allergens_tags without the "en:" prefix,
// so a profile value of "milk" lines up with "en:milk" on a product.
export const ALLERGENS = [
  { id: "milk", label: "Milk / dairy" },
  { id: "gluten", label: "Gluten" },
  { id: "peanuts", label: "Peanuts" },
  { id: "nuts", label: "Tree nuts" },
  { id: "eggs", label: "Eggs" },
  { id: "soybeans", label: "Soy" },
  { id: "sesame-seeds", label: "Sesame" },
  { id: "mustard", label: "Mustard" },
  { id: "fish", label: "Fish" },
  { id: "crustaceans", label: "Shellfish (crustaceans)" },
  { id: "molluscs", label: "Molluscs" },
  { id: "celery", label: "Celery" },
  { id: "lupin", label: "Lupin" },
  { id: "sulphur-dioxide-and-sulphites", label: "Sulphites" },
] as const;

export type AllergenId = (typeof ALLERGENS)[number]["id"];

const labels = new Map<string, string>(ALLERGENS.map((a) => [a.id, a.label]));

export function allergenLabel(tag: string): string {
  const id = tag.replace(/^[a-z]{2}:/, "");
  return labels.get(id) ?? id.replace(/-/g, " ").replace(/^\w/, (m) => m.toUpperCase());
}

export type AllergenHit = { name: string; allergens: string[] };

// who in the household should not eat this, and why
export function allergenHits(productTags: readonly string[], people: readonly { name: string; allergens: readonly string[] }[]): AllergenHit[] {
  const have = new Set(productTags.map((t) => t.replace(/^[a-z]{2}:/, "").toLowerCase()));
  return people
    .map((p) => ({ name: p.name, allergens: p.allergens.filter((a) => have.has(a.toLowerCase())) }))
    .filter((h) => h.allergens.length > 0);
}
