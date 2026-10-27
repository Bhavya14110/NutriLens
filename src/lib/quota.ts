import "server-only";
import { apiEnv } from "@/lib/env";

// Spoonacular point costs, checked against their docs (Oct 2026):
// findByIngredients 1 + 0.01/result, information 1, parseIngredients 1 per ingredient
export const spoonCost = {
  find: (n: number) => 1 + 0.01 * n,
  info: () => 1,
  parse: (lines: number) => lines,
};

export interface QuotaStore {
  used(day: string): Promise<number>;
  add(day: string, pts: number): Promise<number>;
}

class DbQuota implements QuotaStore {
  async used(day: string) {
    const sb = await admin();
    if (!sb) return memUsed.get(day) ?? 0;
    const { data } = await sb.from("quota_log").select("points_used").eq("day", day).maybeSingle();
    return Number(data?.points_used ?? 0);
  }
  async add(day: string, pts: number) {
    const sb = await admin();
    if (!sb) {
      const v = (memUsed.get(day) ?? 0) + pts;
      memUsed.set(day, v);
      return v;
    }
    const { data } = await sb.rpc("add_quota", { d: day, pts });
    return Number(data ?? 0);
  }
}

const memUsed = new Map<string, number>();

async function admin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { supabaseAdmin } = await import("@/lib/supabase/server");
  return supabaseAdmin();
}

let store: QuotaStore = new DbQuota();
export function setQuotaStore(s: QuotaStore) {
  store = s;
}

// spoonacular resets at UTC midnight, so the bucket is the UTC date
export const today = () => new Date().toISOString().slice(0, 10);

export async function canSpend(pts: number, limit = apiEnv().spoonDaily): Promise<boolean> {
  if (!apiEnv().spoonKey) return false;
  try {
    return (await store.used(today())) + pts <= limit;
  } catch {
    // can't read the log? play safe and use the free fallback
    return false;
  }
}

export async function spend(pts: number) {
  try {
    return await store.add(today(), pts);
  } catch (err) {
    console.warn("[quota] couldn't record spend", err);
    return null;
  }
}

export async function quotaState() {
  const limit = apiEnv().spoonDaily;
  const used = await store.used(today()).catch(() => 0);
  return { used, limit, left: Math.max(0, limit - used) };
}
