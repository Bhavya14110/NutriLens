import { ApiError, body, needHh, ok, route } from "@/lib/api";
import { defaultLoc, suggestExpiry } from "@/lib/canon";
import { shopPatchSchema } from "@/lib/schemas";

// ticking a bought item also drops it into the pantry with a suggested expiry
export const POST = route(async (req: Request) => {
  const ctx = await needHh();
  const { ids, done } = await body(req, shopPatchSchema);
  const { data: rows, error } = await ctx.sb.from("shop_items").update({ done }).eq("household_id", ctx.hh.id).in("id", ids).select("*");
  if (error) throw new ApiError(400, "Couldn't update the list.");

  let added = 0;
  if (done && rows?.length) {
    // merged lines come in as several ids - one pantry item per line is plenty
    const first = rows[0];
    const qty = rows.reduce((a, r) => a + Number(r.qty), 0);
    const loc = defaultLoc(first.canon_ing);
    const { error: e2 } = await ctx.sb.from("pantry_items").insert({
      household_id: ctx.hh.id,
      name: first.name,
      canon_ing: first.canon_ing,
      qty,
      unit: first.unit,
      location: loc,
      expires_at: suggestExpiry(first.canon_ing, loc),
    });
    if (!e2) added = 1;
  }
  return ok({ updated: rows?.length ?? 0, added });
});
