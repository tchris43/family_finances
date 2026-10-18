import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { loginFailures } from "@/db/schema";

export const MAX_FAILURES = 8;
export const WINDOW_MINUTES = 15;

export async function isLockedOut(db: Db, emailKey: string): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loginFailures)
    .where(
      and(
        eq(loginFailures.emailKey, emailKey),
        gt(
          loginFailures.createdAt,
          sql`now() - make_interval(mins => ${WINDOW_MINUTES})`,
        ),
      ),
    );
  return Number(row?.n ?? 0) >= MAX_FAILURES;
}

export async function recordFailure(db: Db, emailKey: string) {
  await db.insert(loginFailures).values({ emailKey });
  // Keep the table small: nothing older than a day is ever consulted.
  await db
    .delete(loginFailures)
    .where(lt(loginFailures.createdAt, sql`now() - interval '1 day'`));
}

export async function clearFailures(db: Db, emailKey: string) {
  await db.delete(loginFailures).where(eq(loginFailures.emailKey, emailKey));
}
