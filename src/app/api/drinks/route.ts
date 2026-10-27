import { ApiError, needHh, ok, route } from "@/lib/api";
import { drinkIdeas } from "@/lib/drinks";
import { UpstreamError } from "@/lib/http";
import { activeItems } from "@/lib/pantry";
import type { DrinksRes } from "@/types/api";

export const GET = route(async () => {
  const ctx = await needHh();
  const items = await activeItems(ctx);
  // booze only when every single person in the house has said yes
  const alcohol = ctx.mates.length > 0 && ctx.mates.every((m) => m.alcohol_ok);
  try {
    const res: DrinksRes = await drinkIdeas(items.map((i) => i.canon_ing), alcohol);
    return ok(res);
  } catch (err) {
    if (err instanceof UpstreamError) throw new ApiError(503, "TheCocktailDB isn't answering right now. Try again in a bit.");
    throw err;
  }
});
