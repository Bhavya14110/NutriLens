import { ApiError, needUser, ok, route } from "@/lib/api";
import { isSub, pushReady, sendPush } from "@/lib/push";

export const POST = route(async () => {
  const ctx = await needUser();
  if (!pushReady()) throw new ApiError(503, "Push isn't set up on the server yet (VAPID keys missing). See the README.");
  const { data: subs } = await ctx.sb.from("push_subs").select("id, subscription").eq("user_id", ctx.uid);
  if (!subs?.length) throw new ApiError(400, "Turn on notifications on this device first.");

  let sent = 0;
  for (const s of subs) {
    if (!isSub(s.subscription)) continue;
    const r = await sendPush(s.subscription, { title: "NutriLens test 🥬", body: "Notifications work! We'll nudge you at 9am when food is about to expire.", url: "/pantry", tag: "test" });
    if (r === "ok") sent++;
    if (r === "gone") await ctx.sb.from("push_subs").delete().eq("id", s.id);
  }
  if (!sent) throw new ApiError(502, "Couldn't reach this device. Try turning notifications off and on again.");
  return ok({ sent });
});
