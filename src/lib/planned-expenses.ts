import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { buckets, plannedExpenses } from "@/db/schema";
import { getBucketMonthStats } from "@/lib/ledger";
import { monthKeyFromDate } from "@/lib/money";

export type PlannedExpenseRow = {
  expense: typeof plannedExpenses.$inferSelect;
  bucketName: string;
  covered: boolean;
  bucketRemainingCents: number;
  shortfallCents: number;
};

/**
 * Covered when the linked bucket has enough remaining after earlier
 * planned expenses in that same bucket claim their share first
 * (order: due date, then priority). Multiple bills in one bucket share
 * one pool — they are not each checked against the full remaining.
 */
export async function listPlannedExpensesWithCoverage(
  db: Db,
  householdId: string,
): Promise<PlannedExpenseRow[]> {
  const [expenses, bucketList] = await Promise.all([
    db
      .select()
      .from(plannedExpenses)
      .where(eq(plannedExpenses.householdId, householdId))
      .orderBy(asc(plannedExpenses.dueDate), asc(plannedExpenses.priority)),
    db.select().from(buckets).where(eq(buckets.householdId, householdId)),
  ]);
  const bucketName = Object.fromEntries(
    bucketList.map((b) => [b.id, b.name]),
  );

  // Fetch each (bucket, month) pair's remaining once, all at the same time.
  // The claiming below must stay in due-date order, but it's pure math on
  // these numbers, so the loads don't need to wait on each other.
  const pairs = [
    ...new Set(
      expenses.map((e) => `${e.bucketId}:${monthKeyFromDate(e.dueDate)}`),
    ),
  ];
  const remainingCache = new Map<string, number>(
    await Promise.all(
      pairs.map(async (key) => {
        const [bucketId, monthKey] = key.split(":");
        const stats = await getBucketMonthStats(db, householdId, bucketId, monthKey);
        return [key, stats.remainingCents] as const;
      }),
    ),
  );

  /** Cents already claimed by earlier planned expenses in this bucket. */
  const claimedByBucket = new Map<string, number>();

  const rows: PlannedExpenseRow[] = [];

  for (const expense of expenses) {
    const monthKey = monthKeyFromDate(expense.dueDate);
    const cacheKey = `${expense.bucketId}:${monthKey}`;

    const bucketRemainingCents = remainingCache.get(cacheKey) ?? 0;

    const claimed = claimedByBucket.get(expense.bucketId) ?? 0;
    const freeCents = bucketRemainingCents - claimed;
    const covered = freeCents >= expense.amountCents;
    const shortfallCents = covered
      ? 0
      : expense.amountCents - Math.max(freeCents, 0);

    if (covered) {
      claimedByBucket.set(expense.bucketId, claimed + expense.amountCents);
    }

    rows.push({
      expense,
      bucketName: bucketName[expense.bucketId] ?? "Bucket",
      covered,
      bucketRemainingCents,
      shortfallCents,
    });
  }

  return rows;
}

export async function listUpcomingPlannedExpenses(
  db: Db,
  householdId: string,
  limit = 5,
) {
  const all = await listPlannedExpensesWithCoverage(db, householdId);
  return all
    .sort((a, b) => {
      if (a.covered !== b.covered) return a.covered ? 1 : -1;
      return a.expense.dueDate.localeCompare(b.expense.dueDate);
    })
    .slice(0, limit);
}
