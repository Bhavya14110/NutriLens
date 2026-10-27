// Hand-written to match supabase/migrations. If you change the schema, regenerate with
// `npx supabase gen types typescript --linked > src/types/db.ts` or update this by hand.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Diet = "none" | "vegetarian" | "vegan" | "jain";
export type Loc = "fridge" | "freezer" | "shelf";
export type ItemStatus = "active" | "used" | "wasted";
export type RecipeSrc = "spoon" | "mealdb";
export type Role = "owner" | "member";

type Table<R, I, U = Partial<I>> = { Row: R; Insert: I; Update: U; Relationships: [] };

export type ProfileRow = {
  user_id: string;
  name: string;
  allergens: string[];
  diet: Diet;
  alcohol_ok: boolean;
  onboarded: boolean;
  created_at: string;
};

export type HouseholdRow = { id: string; name: string; invite_code: string; created_at: string };

export type MemberRow = { household_id: string; user_id: string; role: Role; created_at: string };

export type ProductRow = {
  barcode: string;
  name: string | null;
  brand: string | null;
  image_url: string | null;
  nutriscore: string | null;
  nova: number | null;
  nutrients: Json;
  allergens: string[];
  additives: string[];
  categories: string[];
  canon_ing: string | null;
  fetched_at: string;
  created_at: string;
};

export type PantryRow = {
  id: string;
  household_id: string;
  barcode: string | null;
  fruit: string | null;
  name: string;
  canon_ing: string | null;
  qty: number;
  unit: string;
  location: Loc;
  added_at: string;
  expires_at: string | null;
  status: ItemStatus;
  closed_at: string | null;
  created_at: string;
};

export type ScanRow = { id: string; user_id: string; household_id: string; barcode: string; scanned_at: string; created_at: string };

export type ShopRow = {
  id: string;
  household_id: string;
  name: string;
  canon_ing: string | null;
  qty: number;
  unit: string;
  est_cost_inr: number | null;
  done: boolean;
  created_at: string;
};

export type CookRow = {
  id: string;
  household_id: string;
  src: RecipeSrc;
  recipe_id: string;
  title: string;
  cooked_at: string;
  used_items: string[];
  created_at: string;
};

export type PushRow = { id: string; user_id: string; endpoint: string; subscription: Json; created_at: string };
export type CacheRow = { key: string; payload: Json; expires_at: string; created_at: string };
export type QuotaRow = { day: string; points_used: number; created_at: string };

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Partial<ProfileRow> & { user_id: string }>;
      households: Table<HouseholdRow, Partial<HouseholdRow> & { name: string }>;
      members: Table<MemberRow, Partial<MemberRow> & { household_id: string; user_id: string }>;
      products: Table<ProductRow, Partial<ProductRow> & { barcode: string }>;
      pantry_items: Table<PantryRow, Partial<PantryRow> & { household_id: string; name: string }>;
      scans: Table<ScanRow, Partial<ScanRow> & { user_id: string; household_id: string; barcode: string }>;
      shop_items: Table<ShopRow, Partial<ShopRow> & { household_id: string; name: string }>;
      cook_logs: Table<CookRow, Partial<CookRow> & { household_id: string; src: RecipeSrc; recipe_id: string; title: string }>;
      push_subs: Table<PushRow, Partial<PushRow> & { user_id: string; endpoint: string; subscription: Json }>;
      api_cache: Table<CacheRow, Partial<CacheRow> & { key: string; payload: Json; expires_at: string }>;
      quota_log: Table<QuotaRow, Partial<QuotaRow> & { day: string }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_member: { Args: { hh: string }; Returns: boolean };
      shares_household: { Args: { other: string }; Returns: boolean };
      create_household: { Args: { hname: string }; Returns: string };
      join_household: { Args: { code: string }; Returns: string };
      leave_household: { Args: { hh: string }; Returns: undefined };
      household_preview: { Args: { code: string }; Returns: { name: string; member_count: number }[] };
      add_quota: { Args: { d: string; pts: number }; Returns: number };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
