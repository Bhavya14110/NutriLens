import { needHh, ok, route } from "@/lib/api";
import { toGrade } from "@/lib/apis/off";
import { todayIst } from "@/lib/expiry";
import { gradeScore, scoreToGrade } from "@/lib/health";
import { wasRescued } from "@/lib/pantry";
import type { InsightsRes } from "@/types/api";
import type { Loc } from "@/types/db";

const MONTHS = 6;

// IST month key for a timestamp
const ym = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(0, 7);
const label = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });

export const GET = route(async () => {
  const ctx = await needHh();
  const now = todayIst();
  const keys: string[] = [];
  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(`${now.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - i);
    keys.push(d.toISOString().slice(0, 7));
  }
  const since = `${keys[0]}-01T00:00:00+05:30`;

  const [{ data: closed }, { data: active }, { data: scans }] = await Promise.all([
    ctx.sb.from("pantry_items").select("status, closed_at, expires_at").eq("household_id", ctx.hh.id).in("status", ["used", "wasted"]).gte("closed_at", since),
    ctx.sb.from("pantry_items").select("barcode, location").eq("household_id", ctx.hh.id).eq("status", "active"),
    ctx.sb.from("scans").select("barcode, scanned_at").eq("household_id", ctx.hh.id).gte("scanned_at", since),
  ]);

  const codes = [...new Set([...(active ?? []).map((a) => a.barcode), ...(scans ?? []).map((s) => s.barcode)].filter((b): b is string => Boolean(b)))];
  const { data: prods } = codes.length ? await ctx.sb.from("products").select("barcode, nutriscore, nova").in("barcode", codes) : { data: [] };
  const pmap = new Map((prods ?? []).map((p) => [p.barcode, p]));

  const usedVsWasted = keys.map((k) => {
    const rows = (closed ?? []).filter((r) => r.closed_at && ym(r.closed_at) === k);
    return { name: label(k), used: rows.filter((r) => r.status === "used").length, wasted: rows.filter((r) => r.status === "wasted").length };
  });

  const thisMonth = (closed ?? []).filter((r) => r.closed_at && ym(r.closed_at) === keys[keys.length - 1]);

  const gradeTrend = keys.map((k) => {
    const gs = (scans ?? [])
      .filter((s) => ym(s.scanned_at) === k)
      .map((s) => toGrade(pmap.get(s.barcode)?.nutriscore))
      .filter((g): g is NonNullable<typeof g> => g !== null);
    const avg = gs.length ? gs.reduce((a, g) => a + gradeScore[g], 0) / gs.length : null;
    return { month: label(k), avg: avg === null ? null : Math.round(avg * 100) / 100, grade: avg === null ? null : scoreToGrade(avg), scans: gs.length };
  });

  const known = (active ?? []).filter((a) => a.barcode && pmap.get(a.barcode)?.nova);
  const n4 = known.filter((a) => pmap.get(a.barcode as string)?.nova === 4).length;

  const locs: Loc[] = ["fridge", "freezer", "shelf"];
  const res: InsightsRes = {
    month: label(keys[keys.length - 1]),
    usedVsWasted,
    totals: {
      used: thisMonth.filter((r) => r.status === "used").length,
      wasted: thisMonth.filter((r) => r.status === "wasted").length,
      saved: thisMonth.filter(wasRescued).length,
    },
    gradeTrend,
    nova4: { share: known.length ? Math.round((n4 / known.length) * 100) : 0, count: n4, total: known.length },
    byLocation: locs.map((loc) => ({ loc, count: (active ?? []).filter((a) => a.location === loc).length })),
  };
  return ok(res);
});
