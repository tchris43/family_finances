import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Server-side page timing: how long a page spent loading its data, how many
 * database queries it ran, and how much of that time was spent waiting on them.
 *
 * On automatically under `next dev`. In production, set PAGE_TIMING=1 (e.g. in
 * Vercel's env settings) to turn it on; the lines show up in the function logs.
 */
export const PAGE_TIMING_ENABLED =
  process.env.PAGE_TIMING === "1" || process.env.NODE_ENV === "development";

type QueryTiming = { ms: number; sql: string };
type Store = { queries: QueryTiming[] };

const currentPage = new AsyncLocalStorage<Store>();

/** Called by the DB client for every query; records it if a timed page is rendering. */
export async function timeQuery<T>(sql: string, run: () => Promise<T>): Promise<T> {
  const store = currentPage.getStore();
  if (!store) return run();
  const start = performance.now();
  try {
    return await run();
  } finally {
    store.queries.push({ ms: performance.now() - start, sql });
  }
}

/**
 * Wraps a page so its data loading is timed:
 *   export default timedPage("/plan", PlanPage);
 * Logs one line per render, e.g.
 *   [page] /plan 1834ms · 41 queries · DB 2210ms summed (avg 54ms) · slowest: 120ms select …
 * "Summed" can exceed the page time when queries run in parallel; a sum close to
 * (count × avg) with page time close to the sum means they ran one after another.
 * AUDIT: only times what the page function itself awaits. Data loaded inside a
 * nested async server component that renders after the page returns isn't counted.
 */
export function timedPage<P>(
  route: string,
  page: (props: P) => Promise<React.ReactNode>,
): (props: P) => Promise<React.ReactNode> {
  if (!PAGE_TIMING_ENABLED) return page;
  return async function TimedPage(props: P) {
    const store: Store = { queries: [] };
    const start = performance.now();
    try {
      return await currentPage.run(store, () => page(props));
    } finally {
      const total = performance.now() - start;
      const dbSum = store.queries.reduce((sum, q) => sum + q.ms, 0);
      const avg = store.queries.length ? dbSum / store.queries.length : 0;
      const slowest = [...store.queries]
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 3)
        .map((q) => `${Math.round(q.ms)}ms ${q.sql.replace(/\s+/g, " ").slice(0, 70)}`)
        .join(" | ");
      console.log(
        `[page] ${route} ${Math.round(total)}ms · ${store.queries.length} queries · DB ${Math.round(dbSum)}ms summed (avg ${Math.round(avg)}ms) · slowest: ${slowest || "none"}`,
      );
    }
  };
}
