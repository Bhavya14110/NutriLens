import { ApiError, body, needUser, ok, route } from "@/lib/api";
import { onboardSchema } from "@/lib/schemas";

export const POST = route(async (req: Request) => {
  const ctx = await needUser();
  const inp = await body(req, onboardSchema);

  if (inp.hh.mode === "create") {
    const { error } = await ctx.sb.rpc("create_household", { hname: inp.hh.name });
    if (error) throw new ApiError(400, "Couldn't create the household. Try again.");
  } else if (inp.hh.mode === "join") {
    const { error } = await ctx.sb.rpc("join_household", { code: inp.hh.code });
    if (error) throw new ApiError(404, "That invite code doesn't match any household. Double-check it with whoever invited you.");
  } else if (!ctx.hh) {
    throw new ApiError(400, "Create or join a household to continue.");
  }

  const { error } = await ctx.sb
    .from("profiles")
    .upsert({ user_id: ctx.uid, name: inp.name, allergens: inp.allergens, diet: inp.diet, alcohol_ok: inp.alcohol_ok, onboarded: true });
  if (error) throw new ApiError(400, "Couldn't save your profile. Try again.");
  return ok({ done: true });
});
