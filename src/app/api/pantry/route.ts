import { ApiError, body, needHh, ok, route } from "@/lib/api";
import { activeItems } from "@/lib/pantry";
import { saveCanon } from "@/lib/products";
import { newPantrySchema } from "@/lib/schemas";

export const GET = route(async () => {
  const ctx = await needHh();
  return ok({ items: await activeItems(ctx) });
});

export const POST = route(async (req: Request) => {
  const ctx = await needHh();
  const inp = await body(req, newPantrySchema);
  const { data, error } = await ctx.sb
    .from("pantry_items")
    .insert({ ...inp, barcode: inp.barcode ?? null, fruit: inp.fruit ?? null, canon_ing: inp.canon_ing ?? null, household_id: ctx.hh.id })
    .select("id")
    .single();
  if (error) throw new ApiError(400, "Couldn't add that to the pantry. Try again.");
  // picking an ingredient for a barcode teaches every future scan of it
  if (inp.barcode && inp.canon_ing) await saveCanon(inp.barcode, inp.canon_ing);
  return ok({ id: data.id }, { status: 201 });
});
