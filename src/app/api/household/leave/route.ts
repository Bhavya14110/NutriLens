import { ApiError, needHh, ok, route } from "@/lib/api";

export const POST = route(async () => {
  const ctx = await needHh();
  const { error } = await ctx.sb.rpc("leave_household", { hh: ctx.hh.id });
  if (error) throw new ApiError(400, "Couldn't leave the household. Try again.");
  return ok({ left: true });
});
