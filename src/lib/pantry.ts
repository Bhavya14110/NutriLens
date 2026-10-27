import "server-only";
import type { HhCtx } from "@/lib/api";
import { byExpiry, daysLeft } from "@/lib/expiry";
import { toGrade } from "@/lib/apis/off";
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
  return rows
    .map((r) => {
      const p = r.barcode ? map.get(r.barcode) : undefined;
      return { ...r, qty: Number(r.qty), image: p?.image_url ?? null, grade: toGrade(p?.nutriscore) };
    })
    .sort(byExpiry);
}

// a "rescue" = used up on or before its date, within the last 3 days of its life
export function wasRescued(r: Pick<PantryRow, "status" | "closed_at" | "expires_at">) {
  if (r.status !== "used" || !r.closed_at || !r.expires_at) return false;
  const d = daysLeft(r.expires_at, new Date(r.closed_at));
  return d !== null && d >= 0 && d <= 3;
}
