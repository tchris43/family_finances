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
 * Covered when linked bucket's remaining (assigned − spent, with rollover)
 * for the expense's due month is >= expense amount.
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

  return Promise.all(
    expenses.map(async (expense) => {
      const monthKey = monthKeyFromDate(expense.dueDate);
      const stats = await getBucketMonthStats(db, expense.bucketId, monthKey);
      const covered = stats.remainingCents >= expense.amountCents;
      const shortfallCents = covered
        ? 0
        : expense.amountCents - stats.remainingCents;
      return {
        expense,
        bucketName: bucketName[expense.bucketId] ?? "Bucket",
        covered,
        bucketRemainingCents: stats.remainingCents,
        shortfallCents,
      };
    }),
  );
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
