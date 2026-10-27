import { z } from "zod";
import { ApiError, body, needHh, ok, route } from "@/lib/api";
import { saveCanon } from "@/lib/products";
import { pantryPatchSchema } from "@/lib/schemas";
import type { PantryRow } from "@/types/db";

export const PATCH = route(async (req: Request, { params }: RouteContext<"/api/pantry/[id]">) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(400, "Bad item id.");
  const ctx = await needHh();
  const inp = await body(req, pantryPatchSchema);

  // RLS already limits this to our household; the eq is belt and braces
  const { data: cur } = await ctx.sb.from("pantry_items").select("*").eq("id", id).eq("household_id", ctx.hh.id).maybeSingle();
  if (!cur) throw new ApiError(404, "That item isn't in your pantry any more.");

  const { useQty, ...rest } = inp;
  const patch: Partial<PantryRow> = { ...rest };

  if (useQty !== undefined) {
    // partly used: take some off, finishing it closes the item as used
    const left = Math.max(0, Number(cur.qty) - useQty);
    patch.qty = Math.round(left * 100) / 100;
    if (left === 0) patch.status = "used";
  }
  if (patch.status && patch.status !== "active") patch.closed_at = new Date().toISOString();
  if (patch.status === "active") patch.closed_at = null;

  const { error } = await ctx.sb.from("pantry_items").update(patch).eq("id", id);
  if (error) throw new ApiError(400, "Couldn't update that item.");
  if (inp.canon_ing && cur.barcode) await saveCanon(cur.barcode, inp.canon_ing);
  return ok({ saved: true, status: patch.status ?? cur.status, qty: patch.qty ?? Number(cur.qty) });
});
