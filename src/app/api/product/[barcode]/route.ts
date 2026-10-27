import { z } from "zod";
import { allergenHits } from "@/lib/allergens";
import { ApiError, body, needHh, ok, route } from "@/lib/api";
import { getFruit } from "@/lib/apis/fruityvice";
import { getProduct, isBarcode } from "@/lib/apis/off";
import { detectFruit, isFruitBased, resolveCanon } from "@/lib/canon";
import { missingFields } from "@/lib/health";
import { UpstreamError } from "@/lib/http";
import { saveCanon, saveProduct, savedCanon } from "@/lib/products";
import { canonSchema } from "@/lib/schemas";
import type { ProductRes } from "@/types/api";

export const GET = route(async (_req: Request, { params }: RouteContext<"/api/product/[barcode]">) => {
  const { barcode } = await params;
  if (!isBarcode(barcode)) throw new ApiError(400, "That doesn't look like a barcode — it should be 6 to 14 digits.");
  const ctx = await needHh();

  let prod;
  try {
    prod = await getProduct(barcode);
  } catch (err) {
    if (err instanceof UpstreamError) throw new ApiError(503, "Open Food Facts isn't answering right now. Give it a minute and try again.");
    throw err;
  }
  if (!prod) throw new ApiError(404, "We couldn't find this barcode on Open Food Facts. You can still add it to your pantry by name.");

  const [saved] = await Promise.all([savedCanon(barcode), saveProduct(prod)]);
  const hit = resolveCanon({ saved, name: prod.name, categories: prod.categories });

  // real-fruit check: only for juices, jams, dried fruit etc. where we can name the fruit
  let fruit: ProductRes["fruit"] = null;
  if (isFruitBased(prod.name, prod.categories)) {
    const fv = detectFruit(prod.name, prod.categories);
    const f = fv ? await getFruit(fv).catch(() => null) : null;
    if (f) fruit = { fruit: f, productSugar: prod.nutr.sugar };
  }

  const { count } = await ctx.sb
    .from("pantry_items")
    .select("id", { count: "exact", head: true })
    .eq("household_id", ctx.hh.id)
    .eq("barcode", barcode)
    .eq("status", "active");

  const res: ProductRes = {
    prod,
    canon: hit?.id ?? null,
    canonVia: hit?.via ?? null,
    alerts: allergenHits(prod.allergens, ctx.mates),
    missing: missingFields(prod),
    fruit,
    inPantry: count ?? 0,
  };
  return ok(res);
});

// "this is actually paneer" - remember the correction for this barcode
export const PATCH = route(async (req: Request, { params }: RouteContext<"/api/product/[barcode]">) => {
  const { barcode } = await params;
  if (!isBarcode(barcode)) throw new ApiError(400, "Bad barcode.");
  await needHh();
  const { canon } = await body(req, z.object({ canon: canonSchema }));
  await saveCanon(barcode, canon);
  return ok({ saved: true });
});
