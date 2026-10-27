import { ApiError, body, needHh, ok, route } from "@/lib/api";
import { daysLeft } from "@/lib/expiry";
import { cookSchema } from "@/lib/schemas";

// "I cooked this": deduct what was used and log it. saved = items rescued from expiry.
export const POST = route(async (req: Request) => {
  const ctx = await needHh();
  const inp = await body(req, cookSchema);
  const ids = inp.used.map((u) => u.id);

  const { data: rows } = ids.length
    ? await ctx.sb.from("pantry_items").select("id, qty, expires_at, status").eq("household_id", ctx.hh.id).eq("status", "active").in("id", ids)
    : { data: [] };

  const now = new Date().toISOString();
  let saved = 0;
  const done: string[] = [];
  for (const u of inp.used) {
    const row = rows?.find((r) => r.id === u.id);
    if (!row) continue;
    const qty = Number(row.qty);
    const left = u.mode === "all" ? 0 : Math.max(0, qty - (u.qty ?? qty / 2));
    const finished = left === 0;
    const { error } = await ctx.sb
      .from("pantry_items")
      .update(finished ? { status: "used", closed_at: now } : { qty: Math.round(left * 100) / 100 })
      .eq("id", u.id);
    if (error) continue;
    done.push(u.id);
    const d = daysLeft(row.expires_at);
    if (finished && d !== null && d >= 0 && d <= 3) saved++;
  }

  const { error } = await ctx.sb.from("cook_logs").insert({ household_id: ctx.hh.id, src: inp.src, recipe_id: inp.recipe_id, title: inp.title, used_items: done });
  if (error) throw new ApiError(400, "Cooked! But we couldn't log it. Your pantry was still updated.");
  return ok({ used: done.length, saved });
});
