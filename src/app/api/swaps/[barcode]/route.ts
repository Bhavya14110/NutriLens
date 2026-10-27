import { ApiError, needUser, ok, route } from "@/lib/api";
import { getProduct, getSwaps, isBarcode } from "@/lib/apis/off";
import { UpstreamError } from "@/lib/http";
import type { SwapsRes } from "@/types/api";

export const GET = route(async (_req: Request, { params }: RouteContext<"/api/swaps/[barcode]">) => {
  const { barcode } = await params;
  if (!isBarcode(barcode)) throw new ApiError(400, "Bad barcode.");
  await needUser();
  try {
    const prod = await getProduct(barcode);
    const res: SwapsRes = { swaps: prod ? await getSwaps(prod) : [] };
    return ok(res);
  } catch (err) {
    // swaps are a nice-to-have, an OFF hiccup shouldn't break the card
    if (err instanceof UpstreamError) return ok({ swaps: [] } satisfies SwapsRes);
    throw err;
  }
});
