import { timingSafeEqual } from "node:crypto";
import { fail, ok, route } from "@/lib/api";
import { addDays, todayIst } from "@/lib/expiry";
import { isSub, pushReady, sendPush } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 60;

function authed(req: Request) {
  // read straight from process.env so a bad caller gets 401 even if other config is missing
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // vercel cron sends "Authorization: Bearer <CRON_SECRET>"
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

// daily 03:30 UTC = 09:00 IST. one push per user listing what expires within 2 days
export const GET = route(async (req: Request) => {
  if (!authed(req)) return fail(401, "Not allowed.");
  if (!pushReady()) return ok({ users: 0, sent: 0, note: "VAPID keys missing" });

  const sb = supabaseAdmin();
  const today = todayIst();
  const { data: subs } = await sb.from("push_subs").select("id, user_id, subscription");
  if (!subs?.length) return ok({ users: 0, sent: 0 });

  const uids = [...new Set(subs.map((s) => s.user_id))];
  const { data: mem } = await sb.from("members").select("user_id, household_id").in("user_id", uids);
  const hids = [...new Set((mem ?? []).map((m) => m.household_id))];
  const { data: items } = hids.length
    ? await sb.from("pantry_items").select("household_id, name, expires_at").in("household_id", hids).eq("status", "active").gte("expires_at", today).lte("expires_at", addDays(today, 2)).order("expires_at")
    : { data: [] };

  let sent = 0;
  let users = 0;
  for (const uid of uids) {
    const mine = new Set((mem ?? []).filter((m) => m.user_id === uid).map((m) => m.household_id));
    const list = (items ?? []).filter((i) => mine.has(i.household_id));
    if (!list.length) continue;
    users++;
    const names = list.slice(0, 4).map((i) => i.name);
    const more = list.length > 4 ? ` +${list.length - 4} more` : "";
    const msg = {
      title: list.length === 1 ? "1 thing to use up soon" : `${list.length} things to use up soon`,
      body: `${names.join(", ")}${more}. Tap for recipes that use them.`,
      url: "/recipes",
      tag: `expiry-${today}`,
    };
    for (const s of subs.filter((x) => x.user_id === uid)) {
      if (!isSub(s.subscription)) continue;
      const r = await sendPush(s.subscription, msg);
      if (r === "ok") sent++;
      if (r === "gone") await sb.from("push_subs").delete().eq("id", s.id);
    }
  }
  return ok({ users, sent });
});
