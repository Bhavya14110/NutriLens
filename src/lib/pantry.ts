import "server-only";
import { after } from "next/server";
import type { HhCtx } from "@/lib/api";
import { getProduct, toGrade } from "@/lib/apis/off";
import { ingImage, nameImage } from "@/lib/canon";
import { byExpiry, daysLeft } from "@/lib/expiry";
import { pmapSafe } from "@/lib/pmap";
import { saveProduct } from "@/lib/products";
import type { PantryView } from "@/types/api";
import type { PantryRow } from "@/types/db";

export async function activeItems(ctx: HhCtx): Promise<PantryView[]> {
  const { data, error } = await ctx.sb.from("pantry_items").select("*").eq("household_id", ctx.hh.id).eq("status", "active").order("expires_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return withImages(ctx, data ?? []);
}

// no FK between pantry and products (fruit/manual items have no barcode), so join by hand
export async function withImages(ctx: HhCtx, rows: PantryRow[]): Promise<PantryView[]> {
  const codes = [...new Set(rows.map((r) => r.barcode).filter((b): b is string => Boolean(b)))];
  const { data: prods } = codes.length ? await ctx.sb.from("products").select("barcode, image_url, nutriscore").in("barcode", codes) : { data: [] };
  const map = new Map((prods ?? []).map((p) => [p.barcode, p]));

  // seeded / never-opened products have no photo yet: fetch them from OFF after we've
  // answered, so this response stays fast and the next one has the picture
  const bare = codes.filter((c) => !map.get(c)?.image_url).slice(0, 8);
  if (bare.length) after(() => backfill(bare));

  return rows
    .map((r) => {
      const p = r.barcode ? map.get(r.barcode) : undefined;
      // fresh and manual items fall back to a TheMealDB ingredient photo (by canon, then by name)
      const fallback = ingImage(r.canon_ing) ?? (r.barcode ? null : nameImage(r.fruit ?? r.name));
      return { ...r, qty: Number(r.qty), image: p?.image_url ?? fallback, grade: toGrade(p?.nutriscore) };
    })
    .sort(byExpiry);
}

async function backfill(codes: string[]) {
  await pmapSafe(codes, 3, async (c) => {
    const prod = await getProduct(c);
    if (prod?.image) await saveProduct(prod);
  });
}

// a "rescue" = used up on or before its date, within the last 3 days of its life
export function wasRescued(r: Pick<PantryRow, "status" | "closed_at" | "expires_at">) {
  if (r.status !== "used" || !r.closed_at || !r.expires_at) return false;
  const d = daysLeft(r.expires_at, new Date(r.closed_at));
  return d !== null && d >= 0 && d <= 3;
}
