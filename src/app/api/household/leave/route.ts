import { needHh, ok, route } from "@/lib/api";
import { leaveHousehold } from "@/lib/household";

export const POST = route(async () => {
  const ctx = await needHh();
  // AUTH DISABLED: rpc needs auth.uid(), see src/lib/household.ts
  // const { error } = await ctx.sb.rpc("leave_household", { hh: ctx.hh.id });
  // if (error) throw new ApiError(400, "Couldn't leave the household. Try again.");
  await leaveHousehold(ctx, ctx.hh.id);
  return ok({ left: true });
});
