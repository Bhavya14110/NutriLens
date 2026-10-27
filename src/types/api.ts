import type { Diet, HouseholdRow, Loc, PantryRow, ProfileRow, Role } from "@/types/db";
import type { DrinkCard, Fruit, Grade, Product, Recipe, RecipeCard, Swap } from "@/types/food";

export type PantryView = PantryRow & { image: string | null; grade: Grade | null };

export type HomeData = {
  name: string;
  hh: string;
  soon: PantryView[];
  stats: { active: number; soon: number; expired: number; savedMonth: number; scansMonth: number };
};

export type UseItUpRes = { recs: RecipeCard[]; source: "spoon" | "mealdb"; note: string | null; ings: string[] };

export type DrinksRes = { drinks: DrinkCard[]; have: string[]; alcohol: boolean };

export type ProductRes = {
  prod: Product;
  canon: string | null;
  canonVia: "saved" | "tags" | "name" | null;
  alerts: { name: string; allergens: string[] }[];
  missing: string[];
  fruit: { fruit: Fruit; productSugar: number | null } | null;
  inPantry: number;
};

export type ScanRes = { barcode: string; found: boolean; ticked: { name: string } | null; added: boolean };

export type SwapsRes = { swaps: Swap[] };

export type ShopItemView = {
  id: string;
  ids: string[];
  name: string;
  canon_ing: string | null;
  qty: number;
  unit: string;
  done: boolean;
  est_cost_inr: number | null;
};

export type ShopRes = { items: ShopItemView[]; total: number; priced: "estimate" | "none" };

export type CostRes = { total: number; priced: "spoon" | "local" | "none" };

export type Mate = { user_id: string; name: string; role: Role; allergens: string[]; diet: Diet; alcohol_ok: boolean };

export type MeRes = {
  uid: string;
  email: string;
  profile: ProfileRow;
  hh: HouseholdRow | null;
  mates: Mate[];
  invite: string | null;
};

export type InsightsRes = {
  month: string;
  usedVsWasted: { name: string; used: number; wasted: number }[];
  totals: { used: number; wasted: number; saved: number };
  gradeTrend: { month: string; avg: number | null; grade: Grade | null; scans: number }[];
  nova4: { share: number; count: number; total: number };
  byLocation: { loc: Loc; count: number }[];
};

export type NewPantry = {
  name: string;
  barcode?: string | null;
  fruit?: string | null;
  canon_ing?: string | null;
  qty: number;
  unit: string;
  location: Loc;
  expires_at: string | null;
};

export type RecipeIng = {
  name: string;
  measure: string;
  canon: string | null;
  canonLabel: string | null;
  have: boolean;
  staple: boolean;
  items: { id: string; name: string; qty: number; unit: string; expires_at: string | null }[];
};

export type RecipeRes = { recipe: Recipe; ings: RecipeIng[]; dietWarn: string[] };
