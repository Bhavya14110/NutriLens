import { readFileSync } from "node:fs";
import path from "node:path";
import { vi } from "vitest";
import type { CacheHit, CacheStore } from "@/lib/cache";
import type { QuotaStore } from "@/lib/quota";

export function fx(name: string): unknown {
  return JSON.parse(readFileSync(path.join(__dirname, "..", "fixtures", name), "utf8"));
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

export class MemStore implements CacheStore {
  data = new Map<string, CacheHit>();
  async get(key: string) {
    return this.data.get(key) ?? null;
  }
  async set(key: string, payload: unknown, expires: number) {
    this.data.set(key, { payload, expires });
  }
}

export class MemQuota implements QuotaStore {
  used_ = new Map<string, number>();
  async used(day: string) {
    return this.used_.get(day) ?? 0;
  }
  async add(day: string, pts: number) {
    const v = (this.used_.get(day) ?? 0) + pts;
    this.used_.set(day, v);
    return v;
  }
}

// route fake fetch calls by url substring -> response factory
export function routeFetch(routes: [string | RegExp, () => Response][]) {
  const calls: string[] = [];
  const inits: (RequestInit | undefined)[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    inits.push(init);
    for (const [m, res] of routes) {
      if (typeof m === "string" ? url.includes(m) : m.test(url)) return res();
    }
    return json({ error: "no route in test" }, 404);
  });
  vi.stubGlobal("fetch", fn);
  return { fn, calls, inits };
}
