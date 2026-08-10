import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { accounts, assignments, transactions } from "@/db/schema";

/** Balance = starting + sum of signed transaction amounts on the account. */
export async function getAccountBalanceCents(
  db: Db,
  accountId: string,
): Promise<number> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  if (!account) return 0;

  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));

  return account.startingBalanceCents + Number(row?.total ?? 0);
}

/**
 * Available to Assign (derived):
 *   sum(starting balances) + sum(income) + sum(adjustments) − sum(assignments)
 * Spending does not change Available — only assigns do.
 * Balance adjustments move Available (up if cash was understated, down if overstated).
 * Bucket/goal reassign transfers net to zero in the assignment sum.
 * Account transfers do not affect Available.
 */
export async function getAvailableToAssignCents(
  db: Db,
  householdId: string,
): Promise<number> {
  const [startingRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${accounts.startingBalanceCents}), 0)`,
    })
    .from(accounts)
    .where(eq(accounts.householdId, householdId));

  const [incomeRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.type, "income"),
      ),
    );

  const [adjustmentRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.type, "adjustment"),
      ),
    );

  const [assignRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${assignments.amountCents}), 0)`,
    })
    .from(assignments)
    .where(eq(assignments.householdId, householdId));

  return (
    Number(startingRow?.total ?? 0) +
    Number(incomeRow?.total ?? 0) +
    Number(adjustmentRow?.total ?? 0) -
    Number(assignRow?.total ?? 0)
  );
}

/** Cumulative assign through monthKey (rollover). */
export async function getBucketAssignedThroughCents(
  db: Db,
  bucketId: string,
  monthKey: string,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${assignments.amountCents}), 0)`,
    })
    .from(assignments)
    .where(
      and(
        eq(assignments.bucketId, bucketId),
        sql`${assignments.monthKey} <= ${monthKey}`,
      ),
    );
  return Number(row?.total ?? 0);
}

/** Cumulative expense through monthKey. */
export async function getBucketSpentThroughCents(
  db: Db,
  bucketId: string,
  monthKey: string,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(abs(${transactions.amountCents})), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.bucketId, bucketId),
        eq(transactions.type, "expense"),
        sql`to_char(${transactions.date}::timestamp, 'YYYY-MM') <= ${monthKey}`,
      ),
    );
  return Number(row?.total ?? 0);
}

/** Assigns to a bucket in one plan month only (not prior-month rollover). */
export async function getBucketAssignedInMonthCents(
  db: Db,
  bucketId: string,
  monthKey: string,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${assignments.amountCents}), 0)`,
    })
    .from(assignments)
    .where(
      and(
        eq(assignments.bucketId, bucketId),
        eq(assignments.monthKey, monthKey),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function getBucketMonthStats(
  db: Db,
  bucketId: string,
  monthKey: string,
) {
  const assigned = await getBucketAssignedThroughCents(db, bucketId, monthKey);
  const spent = await getBucketSpentThroughCents(db, bucketId, monthKey);
  const thisMonthAssignedCents = await getBucketAssignedInMonthCents(
    db,
    bucketId,
    monthKey,
  );
  return {
    assignedCents: assigned,
    spentCents: spent,
    remainingCents: assigned - spent,
    thisMonthAssignedCents,
  };
}
