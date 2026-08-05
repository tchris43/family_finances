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
  const expenses = await db
    .select()
    .from(plannedExpenses)
    .where(eq(plannedExpenses.householdId, householdId))
    .orderBy(asc(plannedExpenses.dueDate), asc(plannedExpenses.priority));

  const bucketList = await db
    .select()
    .from(buckets)
    .where(eq(buckets.householdId, householdId));
  const bucketName = Object.fromEntries(
    bucketList.map((b) => [b.id, b.name]),
  );

  /** Cents already claimed by earlier planned expenses in this bucket. */
  const claimedByBucket = new Map<string, number>();
  const remainingCache = new Map<string, number>();

  const rows: PlannedExpenseRow[] = [];

  for (const expense of expenses) {
    const monthKey = monthKeyFromDate(expense.dueDate);
    const cacheKey = `${expense.bucketId}:${monthKey}`;

    let bucketRemainingCents = remainingCache.get(cacheKey);
    if (bucketRemainingCents === undefined) {
      const stats = await getBucketMonthStats(db, expense.bucketId, monthKey);
      bucketRemainingCents = stats.remainingCents;
      remainingCache.set(cacheKey, bucketRemainingCents);
    }

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
