import { needHh, ok, route } from "@/lib/api";
import { estimateCost, QuotaSkip } from "@/lib/apis/spoonacular";
import { apiEnv } from "@/lib/env";
import { UpstreamError } from "@/lib/http";
import { centsToInr, guessInr } from "@/lib/shop";

// prices every open line; spoonacular first, our rough ₹ table when it can't
export const POST = route(async () => {
  const ctx = await needHh();
  const { data } = await ctx.sb.from("shop_items").select("id, name, qty, unit, canon_ing").eq("household_id", ctx.hh.id).eq("done", false);
  const rows = data ?? [];
  if (!rows.length) return ok({ total: 0, priced: "none" as const });

  const lines = rows.map((r) => `${Number(r.qty)} ${r.unit === "pcs" ? "" : r.unit} ${r.name}`.replace(/\s+/g, " ").trim());
  let est: { cents: number; per: number[] } | null = null;
  try {
    est = await estimateCost(lines);
  } catch (err) {
    if (!(err instanceof QuotaSkip) && !(err instanceof UpstreamError)) throw err;
  }

  const rate = apiEnv().usdInr;
  const priced = est && est.per.length === rows.length ? ("spoon" as const) : ("local" as const);
  const costs = rows.map((r, i) => (priced === "spoon" && est ? centsToInr(est.per[i] ?? 0, rate) : guessInr(r.canon_ing, Number(r.qty))));

  await Promise.all(rows.map((r, i) => ctx.sb.from("shop_items").update({ est_cost_inr: costs[i] }).eq("id", r.id)));
  return ok({ total: costs.reduce((a, b) => a + b, 0), priced });
});
