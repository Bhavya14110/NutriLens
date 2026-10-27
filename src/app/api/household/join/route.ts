import { z } from "zod";
import { body, needUser, ok, route } from "@/lib/api";
import { joinHousehold } from "@/lib/household";
import { inviteSchema } from "@/lib/schemas";

export const POST = route(async (req: Request) => {
  const ctx = await needUser();
  const { code } = await body(req, z.object({ code: inviteSchema }));
  // AUTH DISABLED: rpc needs auth.uid(), see src/lib/household.ts
  // const { data, error } = await ctx.sb.rpc("join_household", { code });
  // if (error || !data) throw new ApiError(404, "That invite link has expired or the code is wrong. Ask for a fresh link.");
  const data = await joinHousehold(ctx, code);
  return ok({ household_id: data, onboarded: Boolean(ctx.profile?.onboarded) });
});
