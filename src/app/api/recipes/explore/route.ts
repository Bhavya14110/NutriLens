import { ApiError, needUser, ok, route } from "@/lib/api";
import * as mealdb from "@/lib/apis/mealdb";
import { UpstreamError } from "@/lib/http";

// one endpoint for the Explore tab: ?meta=1 | ?area= | ?category= | ?q= | ?random=1
export const GET = route(async (req: Request) => {
  await needUser();
  const sp = new URL(req.url).searchParams;
  try {
    if (sp.get("meta")) {
      const [areas, categories] = await Promise.all([mealdb.areas(), mealdb.categories()]);
      return ok({ areas, categories });
    }
    if (sp.get("random")) {
      const r = await mealdb.random();
      return ok({ items: r ? [{ id: r.id, title: r.title, image: r.image }] : [] });
    }
    const area = sp.get("area");
    if (area) return ok({ items: await mealdb.byArea(area.slice(0, 40)) });
    const cat = sp.get("category");
    if (cat) return ok({ items: await mealdb.byCategory(cat.slice(0, 40)) });
    const q = sp.get("q");
    if (q) return ok({ items: (await mealdb.search(q)).map((r) => ({ id: r.id, title: r.title, image: r.image })) });
    throw new ApiError(400, "Pick a cuisine, a category or search for something.");
  } catch (err) {
    if (err instanceof UpstreamError) throw new ApiError(503, "TheMealDB isn't answering right now. Try again in a moment.");
    throw err;
  }
});
