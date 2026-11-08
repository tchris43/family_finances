import { and, eq, notInArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { accounts, assignments, transactions } from "@/db/schema";

/**
 * Account types that hold debt, not money. They're left out of Available
 * entirely (Taylor's ruling 2026-11-07); their own balances still work.
 * AUDIT: matched against accounts.type as stored. A new debt type (e.g.
 * "mortgage") must be added here, or it will silently count as cash again.
 */
export const DEBT_ACCOUNT_TYPES = ["credit", "loan"];

/**
 * Balance = starting + sum of signed transaction amounts on the account.
 * Scoped to the household so a caller can't pass an id from another household.
 */
export async function getAccountBalanceCents(
  db: Db,
  householdId: string,
  accountId: string,
): Promise<number> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.id, accountId), eq(accounts.householdId, householdId)),
    )
    .limit(1);
  if (!account) return 0;

  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.householdId, householdId),
      ),
    );

  return account.startingBalanceCents + Number(row?.total ?? 0);
}

/**
 * Available to Assign (derived):
 *   sum(starting balances) + sum(income) + sum(adjustments) − sum(assignments)
 * The first three skip credit/loan accounts entirely (DEBT_ACCOUNT_TYPES).
 * Spending does not change Available — only assigns do.
 * Balance adjustments move Available (up if cash was understated, down if overstated).
 * Bucket/goal reassign transfers net to zero in the assignment sum.
 * Personal debt settlement (negative assignment, no bucket/goal) raises Available.
 * Account transfers do not affect Available.
 */
export async function getAvailableToAssignCents(
  db: Db,
  householdId: string,
): Promise<number> {
  // The four sums are independent, so they run at the same time (one round trip, not four).
  const startingQuery = db
    .select({
      total: sql<number>`coalesce(sum(${accounts.startingBalanceCents}), 0)`,
    })
    .from(accounts)
    .where(
      and(
        eq(accounts.householdId, householdId),
        notInArray(accounts.type, DEBT_ACCOUNT_TYPES),
      ),
    );

  // Income and adjustments are joined to their account so debt accounts' rows drop out.
  const incomeQuery = db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.type, "income"),
        notInArray(accounts.type, DEBT_ACCOUNT_TYPES),
      ),
    );

  const adjustmentQuery = db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.type, "adjustment"),
        notInArray(accounts.type, DEBT_ACCOUNT_TYPES),
      ),
    );

  const assignQuery = db
    .select({
      total: sql<number>`coalesce(sum(${assignments.amountCents}), 0)`,
    })
    .from(assignments)
    .where(eq(assignments.householdId, householdId));

  const [[startingRow], [incomeRow], [adjustmentRow], [assignRow]] =
    await Promise.all([startingQuery, incomeQuery, adjustmentQuery, assignQuery]);

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
  householdId: string,
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
        eq(assignments.householdId, householdId),
        eq(assignments.bucketId, bucketId),
        sql`${assignments.monthKey} <= ${monthKey}`,
      ),
    );
  return Number(row?.total ?? 0);
}

/** Cumulative expense through monthKey. */
export async function getBucketSpentThroughCents(
  db: Db,
  householdId: string,
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
        eq(transactions.householdId, householdId),
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
  householdId: string,
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
        eq(assignments.householdId, householdId),
        eq(assignments.bucketId, bucketId),
        eq(assignments.monthKey, monthKey),
      ),
    );
  return Number(row?.total ?? 0);
}

/** Expenses on a bucket in one calendar month only. */
export async function getBucketSpentInMonthCents(
  db: Db,
  householdId: string,
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
        eq(transactions.householdId, householdId),
        eq(transactions.bucketId, bucketId),
        eq(transactions.type, "expense"),
        sql`to_char(${transactions.date}::timestamp, 'YYYY-MM') = ${monthKey}`,
      ),
    );
  return Number(row?.total ?? 0);
}

/**
 * Plan bucket stats for a month.
 * assignedCents / spentCents = this month only (reset each month).
 * remainingCents = cumulative assigned − spent through monthKey (leftover rolls).
 */
export async function getBucketMonthStats(
  db: Db,
  householdId: string,
  bucketId: string,
  monthKey: string,
) {
  // Independent sums: run them at the same time.
  const [assignedThrough, spentThrough, thisMonthAssignedCents, thisMonthSpentCents] =
    await Promise.all([
      getBucketAssignedThroughCents(db, householdId, bucketId, monthKey),
      getBucketSpentThroughCents(db, householdId, bucketId, monthKey),
      getBucketAssignedInMonthCents(db, householdId, bucketId, monthKey),
      getBucketSpentInMonthCents(db, householdId, bucketId, monthKey),
    ]);
  return {
    assignedCents: thisMonthAssignedCents,
    spentCents: thisMonthSpentCents,
    remainingCents: assignedThrough - spentThrough,
    thisMonthAssignedCents,
  };
}
