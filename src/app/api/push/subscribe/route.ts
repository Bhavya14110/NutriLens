import { z } from "zod";
import { ApiError, body, needUser, ok, route } from "@/lib/api";
import { isSub } from "@/lib/push";
import type { Json } from "@/types/db";

export const POST = route(async (req: Request) => {
  const ctx = await needUser();
  const { subscription } = await body(req, z.object({ subscription: z.unknown() }));
  if (!isSub(subscription)) throw new ApiError(400, "That push subscription looks incomplete. Try enabling notifications again.");
  const { error } = await ctx.sb
    .from("push_subs")
    .upsert({ user_id: ctx.uid, endpoint: subscription.endpoint, subscription: subscription as unknown as Json }, { onConflict: "endpoint" });
  if (error) throw new ApiError(400, "Couldn't save your notification settings.");
  return ok({ subscribed: true });
});

export const DELETE = route(async (req: Request) => {
  const ctx = await needUser();
  const { endpoint } = await body(req, z.object({ endpoint: z.url() }));
  await ctx.sb.from("push_subs").delete().eq("user_id", ctx.uid).eq("endpoint", endpoint);
  return ok({ subscribed: false });
});
