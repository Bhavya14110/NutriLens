import { ApiError, needUser, ok, route } from "@/lib/api";
import { getFruit } from "@/lib/apis/fruityvice";
import { canonFromName, shelfDays } from "@/lib/canon";
import { UpstreamError } from "@/lib/http";

export const GET = route(async (_req: Request, { params }: RouteContext<"/api/fruit/[name]">) => {
  await needUser();
  const { name } = await params;
  let fruit;
  try {
    fruit = await getFruit(decodeURIComponent(name));
  } catch (err) {
    if (err instanceof UpstreamError) throw new ApiError(503, "The fruit database is taking a break. Try again shortly.");
    throw err;
  }
  if (!fruit) throw new ApiError(404, `We don't have nutrition data for "${decodeURIComponent(name)}". Try another spelling.`);
  const canon = canonFromName(fruit.name);
  return ok({ fruit, canon, shelf: shelfDays(canon, 5) });
});
