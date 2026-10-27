import "server-only";
import type { Json } from "@/types/db";

export type CacheHit = { payload: unknown; expires: number };

export interface CacheStore {
  get(key: string): Promise<CacheHit | null>;
  set(key: string, payload: unknown, expires: number): Promise<void>;
}

export const TTL = {
  offProduct: 7 * 86400,
  swaps: 86400,
  fruitList: 7 * 86400,
  fruit: 7 * 86400,
  spoon: 86400,
  mealdb: 7 * 86400,
  cocktail: 7 * 86400,
  miss: 3600,
} as const;

// supabase-backed store; falls back to memory only when supabase isn't configured
class DbStore implements CacheStore {
  async get(key: string) {
    const sb = await admin();
    if (!sb) return null;
    const { data } = await sb.from("api_cache").select("payload, expires_at").eq("key", key).maybeSingle();
    if (!data) return null;
    return { payload: data.payload, expires: new Date(data.expires_at).getTime() };
  }
  async set(key: string, payload: unknown, expires: number) {
    const sb = await admin();
    if (!sb) return;
    await sb.from("api_cache").upsert({ key, payload: payload as Json, expires_at: new Date(expires).toISOString() });
  }
}

async function admin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { supabaseAdmin } = await import("@/lib/supabase/server");
  return supabaseAdmin();
}

let store: CacheStore = new DbStore();
const mem = new Map<string, CacheHit>();
const inflight = new Map<string, Promise<unknown>>();
const MEMMAX = 500;

export function setCacheStore(s: CacheStore) {
  store = s;
  mem.clear();
  inflight.clear();
}

function remember(key: string, hit: CacheHit) {
  if (mem.size >= MEMMAX) {
    const first = mem.keys().next().value;
    if (first !== undefined) mem.delete(first);
  }
  mem.set(key, hit);
}

// wrap so we can cache "nothing found" too (null) without confusing it with a miss
type Box<T> = { v: T };

export async function cachedFetch<T>(key: string, ttl: number, fn: () => Promise<T>, missTtl: number = TTL.miss): Promise<T> {
  const now = Date.now();
  const warm = mem.get(key);
  if (warm && warm.expires > now) return (warm.payload as Box<T>).v;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const job = (async () => {
    try {
      const hit = await store.get(key).catch(() => null);
      if (hit && hit.expires > Date.now() && isBox(hit.payload)) {
        remember(key, hit);
        return (hit.payload as Box<T>).v;
      }
    } catch {
      // cache read failing shouldn't take the feature down
    }
    const v = await fn();
    const expires = Date.now() + (v === null ? missTtl : ttl) * 1000;
    const box: Box<T> = { v };
    remember(key, { payload: box, expires });
    await store.set(key, box, expires).catch((err) => console.warn("[cache] write failed", key, err));
    return v;
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

function isBox(x: unknown): x is Box<unknown> {
  return typeof x === "object" && x !== null && "v" in x;
}
