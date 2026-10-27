import "server-only";
import type { z } from "zod";

export class UpstreamError extends Error {
  constructor(
    public src: string,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type ReqOpts = {
  src: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
  // tests pass 1 so backoff doesn't slow the suite down
  baseDelayMs?: number;
  // some APIs (fruityvice) answer 404 for "no such thing" - that's data, not an error
  nullOn404?: boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const retryable = (s: number) => s === 429 || s >= 500;

export function backoff(attempt: number, base: number) {
  // exponential with full jitter so parallel lambdas don't stampede together
  const cap = base * 2 ** attempt;
  return cap / 2 + Math.random() * (cap / 2);
}

export async function request<S extends z.ZodType>(
  url: string,
  schema: S,
  opts: ReqOpts,
): Promise<{ data: z.infer<S> | null; headers: Headers | null }> {
  const { src, retries = 2, timeoutMs = 8000, baseDelayMs = 300 } = opts;
  let last: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(backoff(attempt, baseDelayMs));
    let res: Response;
    try {
      res = await fetch(url, {
        method: opts.method ?? "GET",
        headers: opts.headers,
        body: opts.body,
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (err) {
      // timeout or network blip - worth another go
      last = err;
      continue;
    }

    if (opts.nullOn404 && res.status === 404) return { data: null, headers: res.headers };
    if (retryable(res.status)) {
      last = new UpstreamError(src, res.status, `${src} answered ${res.status}`);
      continue;
    }
    if (!res.ok) throw new UpstreamError(src, res.status, `${src} answered ${res.status}`);

    // OFF sends a pretty html "temporarily unavailable" page with a 200 sometimes
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("json")) {
      last = new UpstreamError(src, 503, `${src} is temporarily unavailable`);
      continue;
    }

    let raw: unknown;
    try {
      raw = await res.json();
    } catch {
      throw new UpstreamError(src, 502, `${src} sent broken JSON`);
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      console.warn(`[${src}] unexpected shape`, parsed.error.issues.slice(0, 3));
      throw new UpstreamError(src, 502, `${src} sent data we couldn't read`);
    }
    return { data: parsed.data, headers: res.headers };
  }

  if (last instanceof UpstreamError) throw last;
  throw new UpstreamError(src, 504, `${src} didn't respond in time`);
}

export async function getJson<S extends z.ZodType>(url: string, schema: S, opts: ReqOpts): Promise<z.infer<S>> {
  const { data } = await request(url, schema, opts);
  if (data === null) throw new UpstreamError(opts.src, 404, `${opts.src}: not found`);
  return data;
}
