import { ApiError, needUser, ok, route } from "@/lib/api";
import { listFruits } from "@/lib/apis/fruityvice";
import { UpstreamError } from "@/lib/http";

// full list (cached a week) powers the autocomplete; filtering is cheap enough to do here
export const GET = route(async (req: Request) => {
  await needUser();
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  try {
    const all = await listFruits();
    const hits = q ? all.filter((f) => f.name.toLowerCase().includes(q)).sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q))) : all;
    return ok({ fruits: hits.slice(0, 50).map((f) => ({ name: f.name, family: f.family, sugar: f.nutr.sugar, calories: f.nutr.calories })) });
  } catch (err) {
    if (err instanceof UpstreamError) throw new ApiError(503, "The fruit database is taking a break. Try again shortly.");
    throw err;
  }
});
