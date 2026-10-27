import { ApiError, needHh, ok, route } from "@/lib/api";
import * as mealdb from "@/lib/apis/mealdb";
import { QuotaSkip, recipeInfo } from "@/lib/apis/spoonacular";
import { canonFromName, getCanon, isStaple } from "@/lib/canon";
import { houseDiets, recipeOk } from "@/lib/diet";
import { UpstreamError } from "@/lib/http";
import { activeItems } from "@/lib/pantry";
import type { RecipeRes } from "@/types/api";

export const GET = route(async (_req: Request, { params }: RouteContext<"/api/recipes/[src]/[id]">) => {
  const { src, id } = await params;
  if (src !== "spoon" && src !== "mealdb") throw new ApiError(404, "Unknown recipe source.");
  const ctx = await needHh();

  let recipe;
  try {
    recipe = src === "spoon" ? await recipeInfo(id) : await mealdb.lookup(id);
  } catch (err) {
    if (err instanceof QuotaSkip) throw new ApiError(429, "We've hit today's limit for these recipes. Try one from Explore — they're unlimited.");
    if (err instanceof UpstreamError) throw new ApiError(503, "The recipe service isn't answering. Try again shortly.");
    throw err;
  }
  if (!recipe) throw new ApiError(404, "That recipe doesn't exist any more.");

  const pantry = await activeItems(ctx);
  const ings: RecipeRes["ings"] = recipe.ings.map((i) => {
    const canon = canonFromName(i.name);
    const items = canon ? pantry.filter((p) => p.canon_ing === canon) : [];
    return {
      name: i.name,
      measure: i.measure,
      canon,
      canonLabel: getCanon(canon)?.label ?? null,
      have: items.length > 0,
      staple: canon ? isStaple(canon) : false,
      items: items.map((p) => ({ id: p.id, name: p.name, qty: p.qty, unit: p.unit, expires_at: p.expires_at })),
    };
  });

  const diets = houseDiets(ctx.mates.map((m) => m.diet)).filter((d) => d !== "none");
  const res: RecipeRes = {
    recipe,
    ings,
    dietWarn: diets.filter((d) => !recipeOk(d, recipe.ings.map((i) => i.name))),
  };
  return ok(res);
});
