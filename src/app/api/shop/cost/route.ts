import { needHh, ok, route } from "@/lib/api";
import { estimateCost, QuotaSkip } from "@/lib/apis/spoonacular";
import { apiEnv } from "@/lib/env";
import { UpstreamError } from "@/lib/http";
import { centsToInr, guessInr, knownPrice, pickCost } from "@/lib/shop";
import type { CostRes } from "@/types/api";

// prices every open line: our Indian table for staples, Spoonacular for the rest when it's
// sane, and the table again whenever Spoonacular is missing, over budget or way off
export const POST = route(async () => {
  const ctx = await needHh();
  const { data } = await ctx.sb.from("shop_items").select("id, name, qty, unit, canon_ing").eq("household_id", ctx.hh.id).eq("done", false);
  const rows = data ?? [];
  if (!rows.length) return ok({ total: 0, priced: "none" } satisfies CostRes);

  // only ask spoonacular about things we don't already have a price for - saves quota too
  const unknown = rows.filter((r) => !knownPrice(r.canon_ing));
  const lines = unknown.map((r) => `${Number(r.qty)} ${r.unit === "pcs" ? "" : r.unit} ${r.name}`.replace(/\s+/g, " ").trim());
  let est: { cents: number; per: number[] } | null = null;
  if (lines.length) {
    try {
      est = await estimateCost(lines);
    } catch (err) {
      if (!(err instanceof QuotaSkip) && !(err instanceof UpstreamError)) throw err;
    }
  }
  // spoonacular answers one result per line, in order; anything else and we don't trust the mapping
  const spoonBy = new Map<string, number>();
  if (est && est.per.length === unknown.length) unknown.forEach((r, i) => spoonBy.set(r.id, centsToInr(est.per[i], apiEnv().usdInr)));

  const picks = rows.map((r) => pickCost(spoonBy.get(r.id), guessInr(r.canon_ing, Number(r.qty), r.unit), knownPrice(r.canon_ing)));
  await Promise.all(rows.map((r, i) => ctx.sb.from("shop_items").update({ est_cost_inr: picks[i].inr }).eq("id", r.id)));

  const srcs = new Set(picks.map((p) => p.src));
  const res: CostRes = { total: picks.reduce((a, p) => a + p.inr, 0), priced: srcs.size > 1 ? "mixed" : srcs.has("spoon") ? "spoon" : "local" };
  return ok(res);
});
