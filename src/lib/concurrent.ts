export interface MapConcurrentResult<R> {
  results: Array<R | null>;
  errors: Array<{ index: number; error: string } | null>;
}

/**
 * Run an async mapper across items with a max concurrency.
 * Order of results matches input order. Errors are caught and stored — a
 * single bad item won't break the batch, but callers can inspect failures.
 */
export async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<MapConcurrentResult<R>> {
  const results: Array<R | null> = new Array(items.length).fill(null);
  const errors: Array<{ index: number; error: string } | null> = new Array(
    items.length,
  ).fill(null);
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors[i] = { index: i, error: msg };
        results[i] = null;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return { results, errors };
}
