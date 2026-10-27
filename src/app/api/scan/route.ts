import { ApiError, body, needHh, ok, route } from "@/lib/api";
import { getProduct } from "@/lib/apis/off";
import { defaultLoc, resolveCanon, suggestExpiry } from "@/lib/canon";
import { UpstreamError } from "@/lib/http";
import { saveProduct, savedCanon } from "@/lib/products";
import { scanSchema } from "@/lib/schemas";
import { matchesLine } from "@/lib/shop";
import type { ScanRes } from "@/types/api";

// one call per scan: log it, and if it's on the shopping list tick it + put it in the pantry
export const POST = route(async (req: Request) => {
  const ctx = await needHh();
  const { barcode } = await body(req, scanSchema);

  let prod;
  try {
    prod = await getProduct(barcode);
  } catch (err) {
    if (err instanceof UpstreamError) throw new ApiError(503, "Open Food Facts isn't answering right now. Try again in a minute.");
    throw err;
  }

  await ctx.sb.from("scans").insert({ user_id: ctx.uid, household_id: ctx.hh.id, barcode });
  const res: ScanRes = { barcode, found: Boolean(prod), ticked: null, added: false };
  if (!prod) return ok(res);

  const [saved] = await Promise.all([savedCanon(barcode), saveProduct(prod)]);
  const canon = resolveCanon({ saved, name: prod.name, categories: prod.categories })?.id ?? null;

  const { data: open } = await ctx.sb.from("shop_items").select("id, name, canon_ing, done").eq("household_id", ctx.hh.id).eq("done", false);
  const line = (open ?? []).find((l) => matchesLine(l, { canon, name: prod.name }));
  if (line) {
    const loc = defaultLoc(canon);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      ctx.sb.from("shop_items").update({ done: true }).eq("id", line.id),
      ctx.sb.from("pantry_items").insert({
        household_id: ctx.hh.id,
        barcode,
        name: prod.name ?? line.name,
        canon_ing: canon,
        qty: 1,
        unit: "pcs",
        location: loc,
        expires_at: suggestExpiry(canon, loc),
      }),
    ]);
    if (!e1) res.ticked = { name: line.name };
    res.added = !e2;
  }
  return ok(res);
});
