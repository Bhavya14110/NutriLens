import { ApiError, needUser, ok, route } from "@/lib/api";
import { lookupDrink } from "@/lib/apis/cocktaildb";
import { UpstreamError } from "@/lib/http";

export const GET = route(async (_req: Request, { params }: RouteContext<"/api/drinks/[id]">) => {
  const { id } = await params;
  const ctx = await needUser();
  let drink;
  try {
    drink = await lookupDrink(id);
  } catch (err) {
    if (err instanceof UpstreamError) throw new ApiError(503, "TheCocktailDB isn't answering right now.");
    throw err;
  }
  if (!drink) throw new ApiError(404, "We couldn't find that drink.");
  const allowed = ctx.mates.length > 0 && ctx.mates.every((m) => m.alcohol_ok);
  if (drink.alcoholic && !allowed) throw new ApiError(403, "That one has alcohol, and your household is set to non-alcoholic drinks.");
  return ok({ drink });
});
