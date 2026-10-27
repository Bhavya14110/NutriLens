import { z } from "zod";
import { ApiError, body, needUser, ok, route } from "@/lib/api";
import { inviteSchema } from "@/lib/schemas";

export const POST = route(async (req: Request) => {
  const ctx = await needUser();
  const { code } = await body(req, z.object({ code: inviteSchema }));
  const { data, error } = await ctx.sb.rpc("join_household", { code });
  if (error || !data) throw new ApiError(404, "That invite link has expired or the code is wrong. Ask for a fresh link.");
  return ok({ household_id: data, onboarded: Boolean(ctx.profile?.onboarded) });
});
