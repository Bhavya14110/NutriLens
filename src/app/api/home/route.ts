import { needHh, ok, route } from "@/lib/api";
import { addDays, daysLeft, todayIst } from "@/lib/expiry";
import { activeItems, wasRescued } from "@/lib/pantry";
import type { HomeData } from "@/types/api";

export const GET = route(async () => {
  const ctx = await needHh();
  const today = todayIst();
  const monthStart = `${today.slice(0, 8)}01`;

  const [items, { data: closed }, { count: scans }] = await Promise.all([
    activeItems(ctx),
    ctx.sb.from("pantry_items").select("status, closed_at, expires_at").eq("household_id", ctx.hh.id).eq("status", "used").gte("closed_at", `${addDays(monthStart, -1)}T18:30:00Z`),
    ctx.sb.from("scans").select("id", { count: "exact", head: true }).eq("household_id", ctx.hh.id).gte("scanned_at", `${addDays(monthStart, -1)}T18:30:00Z`),
  ]);

  const left = (i: { expires_at: string | null }) => daysLeft(i.expires_at);
  const soon = items.filter((i) => {
    const d = left(i);
    return d !== null && d <= 3;
  });

  const res: HomeData = {
    name: ctx.profile?.name ?? "",
    hh: ctx.hh.name,
    soon: soon.slice(0, 12),
    stats: {
      active: items.length,
      soon: soon.filter((i) => (left(i) ?? 0) >= 0).length,
      expired: soon.filter((i) => (left(i) ?? 0) < 0).length,
      savedMonth: (closed ?? []).filter(wasRescued).length,
      scansMonth: scans ?? 0,
    },
  };
  return ok(res);
});
