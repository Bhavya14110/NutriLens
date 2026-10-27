import { ApiError, body, needHh, ok, route } from "@/lib/api";
import { canonFromName } from "@/lib/canon";
import { shopAddSchema, shopDeleteSchema } from "@/lib/schemas";
import { mergeShop } from "@/lib/shop";
import type { ShopRes } from "@/types/api";

export const GET = route(async () => {
  const ctx = await needHh();
  const { data, error } = await ctx.sb.from("shop_items").select("*").eq("household_id", ctx.hh.id).order("created_at", { ascending: true });
  if (error) throw error;
  const items = mergeShop((data ?? []).map((r) => ({ ...r, qty: Number(r.qty), est_cost_inr: r.est_cost_inr === null ? null : Number(r.est_cost_inr) })));
  const open = items.filter((i) => !i.done);
  const priced = open.filter((i) => i.est_cost_inr !== null);
  const res: ShopRes = {
    items,
    total: priced.reduce((a, i) => a + (i.est_cost_inr ?? 0), 0),
    priced: priced.length ? "estimate" : "none",
  };
  return ok(res);
});

export const POST = route(async (req: Request) => {
  const ctx = await needHh();
  const { items } = await body(req, shopAddSchema);
  const rows = items.map((i) => ({ ...i, canon_ing: i.canon_ing ?? canonFromName(i.name), household_id: ctx.hh.id }));
  const { error } = await ctx.sb.from("shop_items").insert(rows);
  if (error) throw new ApiError(400, "Couldn't add to the shopping list.");
  return ok({ added: rows.length }, { status: 201 });
});

export const DELETE = route(async (req: Request) => {
  const ctx = await needHh();
  const { ids } = await body(req, shopDeleteSchema);
  const { error } = await ctx.sb.from("shop_items").delete().eq("household_id", ctx.hh.id).in("id", ids);
  if (error) throw new ApiError(400, "Couldn't remove that.");
  return ok({ removed: ids.length });
});
