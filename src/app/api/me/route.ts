import { ApiError, body, needUser, ok, route } from "@/lib/api";
import { env } from "@/lib/env";
import { profileSchema } from "@/lib/schemas";
import type { MeRes } from "@/types/api";

export const GET = route(async () => {
  const ctx = await needUser();
  if (!ctx.profile) throw new ApiError(404, "Profile not found. Try signing out and in again.");
  const res: MeRes = {
    uid: ctx.uid,
    email: ctx.email,
    profile: ctx.profile,
    hh: ctx.hh,
    mates: ctx.mates,
    invite: ctx.hh ? `${env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/join/${ctx.hh.invite_code}` : null,
  };
  return ok(res);
});

export const PATCH = route(async (req: Request) => {
  const ctx = await needUser();
  const inp = await body(req, profileSchema);
  const { error } = await ctx.sb.from("profiles").update(inp).eq("user_id", ctx.uid);
  if (error) throw new ApiError(400, "Couldn't save your profile.");
  return ok({ saved: true });
});
