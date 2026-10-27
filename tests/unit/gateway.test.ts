import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { cachedFetch, setCacheStore } from "@/lib/cache";
import { backoff, request, UpstreamError } from "@/lib/http";
import { canSpend, setQuotaStore, spend, today } from "@/lib/quota";
import { json, MemQuota, MemStore } from "./helpers";

const schema = z.object({ ok: z.boolean() });
const fast = { src: "Test", baseDelayMs: 1 };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("request (retry + validation)", () => {
  it("retries 429 and 5xx, then succeeds", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({}, 429))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ ok: true }));
    vi.stubGlobal("fetch", f);
    const { data } = await request("https://x.test", schema, fast);
    expect(data).toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("gives up after 2 retries", async () => {
    const f = vi.fn().mockResolvedValue(json({}, 500));
    vi.stubGlobal("fetch", f);
    await expect(request("https://x.test", schema, fast)).rejects.toBeInstanceOf(UpstreamError);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("doesn't retry a plain 400", async () => {
    const f = vi.fn().mockResolvedValue(json({}, 400));
    vi.stubGlobal("fetch", f);
    await expect(request("https://x.test", schema, fast)).rejects.toMatchObject({ status: 400 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("treats an html maintenance page as retryable", async () => {
    const html = () => new Response("<html>Page temporarily unavailable</html>", { status: 200, headers: { "content-type": "text/html" } });
    const f = vi.fn().mockImplementationOnce(async () => html()).mockResolvedValueOnce(json({ ok: true }));
    vi.stubGlobal("fetch", f);
    const { data } = await request("https://x.test", schema, fast);
    expect(data).toEqual({ ok: true });
  });

  it("returns a clean error when the shape is wrong, never a crash", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ ok: "nope" })));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(request("https://x.test", schema, fast)).rejects.toMatchObject({ status: 502 });
  });

  it("maps 404 to null when asked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "Not found" }, 404)));
    const { data } = await request("https://x.test", schema, { ...fast, nullOn404: true });
    expect(data).toBeNull();
  });

  it("retries network errors / timeouts", async () => {
    const f = vi.fn().mockRejectedValueOnce(new DOMException("timed out", "TimeoutError")).mockResolvedValueOnce(json({ ok: true }));
    vi.stubGlobal("fetch", f);
    const { data } = await request("https://x.test", schema, fast);
    expect(data).toEqual({ ok: true });
  });

  it("passes a timeout signal on every request", async () => {
    const f = vi.fn().mockResolvedValue(json({ ok: true }));
    vi.stubGlobal("fetch", f);
    await request("https://x.test", schema, fast);
    expect(f.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("backs off exponentially with jitter", () => {
    for (let i = 0; i < 20; i++) {
      const a = backoff(1, 100);
      const b = backoff(2, 100);
      expect(a).toBeGreaterThanOrEqual(100);
      expect(a).toBeLessThanOrEqual(200);
      expect(b).toBeGreaterThanOrEqual(200);
      expect(b).toBeLessThanOrEqual(400);
    }
  });
});

describe("cachedFetch", () => {
  let store: MemStore;
  beforeEach(() => {
    store = new MemStore();
    setCacheStore(store);
  });

  it("dedupes in-flight calls with the same key", async () => {
    let n = 0;
    const fn = () => new Promise<number>((r) => setTimeout(() => r(++n), 10));
    const [a, b, c] = await Promise.all([cachedFetch("k", 60, fn), cachedFetch("k", 60, fn), cachedFetch("k", 60, fn)]);
    expect([a, b, c]).toEqual([1, 1, 1]);
    expect(n).toBe(1);
  });

  it("serves from the store until it expires", async () => {
    await store.set("k2", { v: "cached" }, Date.now() + 60000);
    const fn = vi.fn(async () => "fresh");
    expect(await cachedFetch("k2", 60, fn)).toBe("cached");
    expect(fn).not.toHaveBeenCalled();

    await store.set("k3", { v: "old" }, Date.now() - 1);
    expect(await cachedFetch("k3", 60, fn)).toBe("fresh");
    expect(store.data.get("k3")?.payload).toEqual({ v: "fresh" });
  });

  it("caches misses (null) for the shorter ttl", async () => {
    const fn = vi.fn(async () => null);
    await cachedFetch("miss", 7 * 86400, fn, 60);
    const hit = store.data.get("miss");
    expect(hit?.payload).toEqual({ v: null });
    expect((hit?.expires ?? 0) - Date.now()).toBeLessThanOrEqual(60000);
  });

  it("doesn't cache errors", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");
    await expect(cachedFetch("err", 60, fn)).rejects.toThrow("boom");
    expect(await cachedFetch("err", 60, fn)).toBe("ok");
  });

  it("still works when the cache store is down", async () => {
    setCacheStore({
      get: async () => {
        throw new Error("db down");
      },
      set: async () => {
        throw new Error("db down");
      },
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await cachedFetch("down", 60, async () => 42)).toBe(42);
  });
});

describe("quota guard", () => {
  beforeEach(() => {
    setQuotaStore(new MemQuota());
    vi.stubEnv("SPOONACULAR_KEY", "test");
  });

  it("allows spending up to the daily limit", async () => {
    expect(await canSpend(1.1, 5)).toBe(true);
    await spend(4);
    expect(await canSpend(1, 5)).toBe(true);
    expect(await canSpend(1.1, 5)).toBe(false);
  });

  it("reads SPOON_DAILY_POINTS when no limit is passed", async () => {
    vi.stubEnv("SPOON_DAILY_POINTS", "2");
    expect(await canSpend(1.1)).toBe(true);
    await spend(1.5);
    expect(await canSpend(1.1)).toBe(false);
  });

  it("refuses everything without a key", async () => {
    vi.stubEnv("SPOONACULAR_KEY", "");
    expect(await canSpend(0.1, 100)).toBe(false);
  });

  it("buckets by UTC day", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
