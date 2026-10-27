import { isoDay } from "@/lib/canon";

export type Fresh = "expired" | "soon" | "fresh" | "none";

// "today" is always the IST calendar day, the app is India-first
export const todayIst = (now = new Date()) => isoDay(now);

export function daysLeft(expires: string | null | undefined, now = new Date()): number | null {
  if (!expires) return null;
  const a = Date.parse(`${todayIst(now)}T00:00:00Z`);
  const b = Date.parse(`${expires.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

export function freshness(expires: string | null | undefined, now = new Date()): Fresh {
  const d = daysLeft(expires, now);
  if (d === null) return "none";
  if (d < 0) return "expired";
  if (d <= 3) return "soon";
  return "fresh";
}

export function expiryText(expires: string | null | undefined, now = new Date()): string {
  const d = daysLeft(expires, now);
  if (d === null) return "No expiry set";
  if (d < -1) return `Expired ${-d} days ago`;
  if (d === -1) return "Expired yesterday";
  if (d === 0) return "Use today";
  if (d === 1) return "Use by tomorrow";
  if (d <= 7) return `${d} days left`;
  return `Good till ${new Date(`${expires}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}`;
}

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// sort helper: soonest first, items without a date last
export function byExpiry<T extends { expires_at: string | null }>(a: T, b: T) {
  if (!a.expires_at) return b.expires_at ? 1 : 0;
  if (!b.expires_at) return -1;
  return a.expires_at.localeCompare(b.expires_at);
}
