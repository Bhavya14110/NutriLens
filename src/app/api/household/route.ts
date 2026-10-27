import { z } from "zod";
import { ApiError, body, needHh, ok, route } from "@/lib/api";
import { hhNameSchema } from "@/lib/schemas";

export const PATCH = route(async (req: Request) => {
  const ctx = await needHh();
  const { name } = await body(req, z.object({ name: hhNameSchema }));
  const { error } = await ctx.sb.from("households").update({ name }).eq("id", ctx.hh.id);
  if (error) throw new ApiError(400, "Couldn't rename the household.");
  return ok({ saved: true });
});
