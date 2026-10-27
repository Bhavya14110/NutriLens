import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Json } from "@/types/db";
import type { Product } from "@/types/food";

// snapshot OFF data into products; canon_ing isn't in the payload so a saved correction survives
export async function saveProduct(p: Product) {
  const { error } = await supabaseAdmin()
    .from("products")
    .upsert({
      barcode: p.barcode,
      name: p.name,
      brand: p.brand,
      image_url: p.image,
      nutriscore: p.grade,
      nova: p.nova,
      nutrients: p.nutr as unknown as Json,
      allergens: p.allergens,
      additives: p.additives,
      categories: p.categories,
      fetched_at: new Date().toISOString(),
    });
  if (error) console.warn("[products] upsert failed", error.message);
}

export async function savedCanon(barcode: string): Promise<string | null> {
  const { data } = await supabaseAdmin().from("products").select("canon_ing").eq("barcode", barcode).maybeSingle();
  return data?.canon_ing ?? null;
}

// a user's "this is actually paneer" sticks to the barcode for everyone next time
export async function saveCanon(barcode: string, canon: string) {
  const { error } = await supabaseAdmin().from("products").update({ canon_ing: canon }).eq("barcode", barcode);
  if (error) console.warn("[products] canon save failed", error.message);
}
