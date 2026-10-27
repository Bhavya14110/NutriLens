// tiny concurrency limiter - the free APIs get grumpy if we fire 50 requests at once
export async function pmap<T, R>(items: readonly T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// same but a failing item becomes null instead of sinking the whole batch
export function pmapSafe<T, R>(items: readonly T[], limit: number, fn: (x: T) => Promise<R>) {
  return pmap(items, limit, (x) => fn(x).catch(() => null));
}
