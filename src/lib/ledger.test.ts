/**
 * Pinning tests for src/lib/ledger.ts — they lock in what the math does TODAY,
 * including behavior listed in specs/suspected-bugs.md. A failure means the
 * behavior changed; decide whether that was intended before updating a test.
 * Each test's "Fails if" line is the code change it exists to catch.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import {
  getAccountBalanceCents,
  getAvailableToAssignCents,
  getBucketAssignedInMonthCents,
  getBucketAssignedThroughCents,
  getBucketMonthStats,
  getBucketSpentInMonthCents,
  getBucketSpentThroughCents,
} from "@/lib/ledger";
import { createTestDb, fixtures } from "@/test/test-db";

let db: Db;
let close: () => Promise<void>;
let f: ReturnType<typeof fixtures>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  f = fixtures(db);
});
afterAll(async () => {
  await close();
});

// Every test makes its own household, so tests never see each other's rows.

describe("getAccountBalanceCents", () => {
  it("is starting balance plus every signed transaction on the account, of any type", async () => {
    const h = await f.household();
    const acct = await f.account(h, 10_000);
    await f.tx(h, acct, "income", 5_000, "2026-03-01");
    await f.tx(h, acct, "expense", -1_200, "2026-03-02");
    await f.tx(h, acct, "transfer", -300, "2026-03-03");
    await f.tx(h, acct, "adjustment", 250, "2026-03-04");
    // Fails if: starting balance is dropped, or any transaction type is filtered out.
    expect(await getAccountBalanceCents(db, h, acct)).toBe(13_750);
  });

  it("is just the starting balance when the account has no transactions", async () => {
    const h = await f.household();
    const acct = await f.account(h, 4_200);
    // Fails if: an empty sum stops coming back as 0. (Removing only the SQL
    // coalesce won't trip this — the `?? 0` in TypeScript also catches NULL.)
    expect(await getAccountBalanceCents(db, h, acct)).toBe(4_200);
  });

  it("ignores transactions on the household's other accounts", async () => {
    const h = await f.household();
    const acct = await f.account(h, 1_000);
    const other = await f.account(h, 0);
    await f.tx(h, other, "income", 99_999, "2026-03-01");
    // Fails if: the accountId filter on transactions is removed.
    expect(await getAccountBalanceCents(db, h, acct)).toBe(1_000);
  });

  it("returns 0 when the account belongs to a different household", async () => {
    const owner = await f.household();
    const intruder = await f.household();
    const acct = await f.account(owner, 7_000);
    // Fails if: the householdId check on the account lookup is removed.
    expect(await getAccountBalanceCents(db, intruder, acct)).toBe(0);
  });

  it("returns 0 for an account id that doesn't exist", async () => {
    const h = await f.household();
    expect(
      await getAccountBalanceCents(db, h, "00000000-0000-0000-0000-000000000000"),
    ).toBe(0);
  });

  it("only sums transactions stamped with the caller's household", async () => {
    const h = await f.household();
    const other = await f.household();
    const acct = await f.account(h, 0);
    // Can't happen through the app (actions stamp the session's household),
    // but the query defends against it, so pin that.
    await f.tx(other, acct, "income", 500, "2026-03-01");
    await f.tx(h, acct, "income", 100, "2026-03-01");
    // Fails if: the householdId filter on the transaction sum is removed.
    expect(await getAccountBalanceCents(db, h, acct)).toBe(100);
  });
});

describe("getAvailableToAssignCents", () => {
  it("is 0 for a household with nothing in it", async () => {
    const h = await f.household();
    // Fails if: an empty sum stops coming back as 0. (The SQL coalesce and the
    // TypeScript `?? 0` back each other up, so removing just one won't trip it.)
    expect(await getAvailableToAssignCents(db, h)).toBe(0);
  });

  it("adds every account's starting balance, whatever the account type", async () => {
    const h = await f.household();
    await f.account(h, 10_000, "checking");
    await f.account(h, 2_500, "savings");
    // Suspected bug: a credit card's starting balance raises Available too.
    await f.account(h, 50_000, "credit");
    // Fails if: starting balances are dropped, or filtered by account type.
    expect(await getAvailableToAssignCents(db, h)).toBe(62_500);
  });

  it("adds income; expenses and account transfers don't change it", async () => {
    const h = await f.household();
    const acct = await f.account(h, 0);
    const b = await f.bucket(h);
    await f.tx(h, acct, "income", 300_000, "2026-03-01");
    await f.tx(h, acct, "expense", -45_000, "2026-03-05", b);
    await f.tx(h, acct, "transfer", -10_000, "2026-03-06");
    await f.tx(h, acct, "transfer", 10_000, "2026-03-06");
    // Fails if: income is dropped, or expenses/transfers start counting.
    expect(await getAvailableToAssignCents(db, h)).toBe(300_000);
  });

  it("counts income dated in the future", async () => {
    const h = await f.household();
    const acct = await f.account(h, 0);
    await f.tx(h, acct, "income", 1_000, "2099-01-01");
    // Fails if: a date cutoff is added to the income sum.
    expect(await getAvailableToAssignCents(db, h)).toBe(1_000);
  });

  it("adds balance adjustments in both directions", async () => {
    const h = await f.household();
    const acct = await f.account(h, 0);
    await f.tx(h, acct, "adjustment", 2_000, "2026-03-01");
    await f.tx(h, acct, "adjustment", -500, "2026-03-02");
    // Fails if: adjustments are dropped, or their sign is flipped.
    expect(await getAvailableToAssignCents(db, h)).toBe(1_500);
  });

  it("subtracts assignments: bucket moves net to zero, settling personal debt raises it", async () => {
    const h = await f.household();
    await f.account(h, 100_000);
    const groceries = await f.bucket(h, "Groceries");
    const fun = await f.bucket(h, "Fun");
    await f.assign(h, groceries, 30_000, "2026-03"); // assign
    await f.assign(h, groceries, -5_000, "2026-03"); // move out of groceries…
    await f.assign(h, fun, 5_000, "2026-03"); // …into fun
    await f.assign(h, null, -2_000, "2026-03"); // settle personal debt
    // 100_000 − (30_000 − 5_000 + 5_000 − 2_000) = 72_000
    // Fails if: assignments are added instead of subtracted, or bucketless ones are skipped.
    expect(await getAvailableToAssignCents(db, h)).toBe(72_000);
  });

  it("subtracts assignments for future months right away", async () => {
    const h = await f.household();
    await f.account(h, 10_000);
    const b = await f.bucket(h);
    await f.assign(h, b, 4_000, "2099-12");
    // Fails if: a month cutoff is added to the assignment sum.
    expect(await getAvailableToAssignCents(db, h)).toBe(6_000);
  });

  it("ignores every other household's accounts, income, adjustments and assignments", async () => {
    const h = await f.household();
    await f.account(h, 1_000);
    const other = await f.household();
    const otherAcct = await f.account(other, 500_000);
    const otherBucket = await f.bucket(other);
    await f.tx(other, otherAcct, "income", 70_000, "2026-03-01");
    await f.tx(other, otherAcct, "adjustment", 3_000, "2026-03-01");
    await f.assign(other, otherBucket, 9_000, "2026-03");
    // Fails if: the householdId filter is removed from any of the four sums.
    expect(await getAvailableToAssignCents(db, h)).toBe(1_000);
  });
});

describe("bucket assigned totals", () => {
  it("through a month: every month up to and including it, nothing after", async () => {
    const h = await f.household();
    const b = await f.bucket(h);
    await f.assign(h, b, 1_000, "2025-12");
    await f.assign(h, b, 2_000, "2026-02");
    await f.assign(h, b, 4_000, "2026-03");
    await f.assign(h, b, 8_000, "2026-04");
    // Fails if: <= becomes < (drops this month) or the month filter is removed.
    expect(await getBucketAssignedThroughCents(db, h, b, "2026-03")).toBe(7_000);
  });

  it("in a month: only that month's assignments", async () => {
    const h = await f.household();
    const b = await f.bucket(h);
    await f.assign(h, b, 1_000, "2026-02");
    await f.assign(h, b, 4_000, "2026-03");
    await f.assign(h, b, -500, "2026-03"); // moved out this month
    await f.assign(h, b, 8_000, "2026-04");
    // Fails if: = becomes <= (rolls in earlier months).
    expect(await getBucketAssignedInMonthCents(db, h, b, "2026-03")).toBe(3_500);
  });

  it("both only count this bucket in this household", async () => {
    const h = await f.household();
    const b = await f.bucket(h);
    const otherBucket = await f.bucket(h, "Other");
    const otherHousehold = await f.household();
    await f.assign(h, b, 100, "2026-03");
    await f.assign(h, otherBucket, 20_000, "2026-03");
    // Same bucket id under another household can't happen via the app; pin the filter anyway.
    await f.assign(otherHousehold, b, 30_000, "2026-03");
    // Fails if: the bucketId or householdId filter is removed from either query.
    expect(await getBucketAssignedThroughCents(db, h, b, "2026-03")).toBe(100);
    expect(await getBucketAssignedInMonthCents(db, h, b, "2026-03")).toBe(100);
  });

  it("are 0 for a bucket with no assignments", async () => {
    const h = await f.household();
    const b = await f.bucket(h);
    expect(await getBucketAssignedThroughCents(db, h, b, "2026-03")).toBe(0);
    expect(await getBucketAssignedInMonthCents(db, h, b, "2026-03")).toBe(0);
  });
});

describe("bucket spent totals", () => {
  it("in a month: expenses dated in that calendar month, first day to last", async () => {
    const h = await f.household();
    const acct = await f.account(h, 0);
    const b = await f.bucket(h);
    await f.tx(h, acct, "expense", -1, "2026-02-28", b); // day before: out
    await f.tx(h, acct, "expense", -10, "2026-03-01", b); // first day: in
    await f.tx(h, acct, "expense", -100, "2026-03-31", b); // last day: in
    await f.tx(h, acct, "expense", -1_000, "2026-04-01", b); // day after: out
    // Fails if: the month boundary moves, or = becomes <=.
    expect(await getBucketSpentInMonthCents(db, h, b, "2026-03")).toBe(110);
  });

  it("through a month: every expense up to the end of that month", async () => {
    const h = await f.household();
    const acct = await f.account(h, 0);
    const b = await f.bucket(h);
    await f.tx(h, acct, "expense", -5, "2025-11-15", b);
    await f.tx(h, acct, "expense", -10, "2026-03-31", b);
    await f.tx(h, acct, "expense", -1_000, "2026-04-01", b);
    // Fails if: <= becomes < or the month filter is removed.
    expect(await getBucketSpentThroughCents(db, h, b, "2026-03")).toBe(15);
  });

  it("only counts expenses — income, transfers and adjustments on the bucket don't", async () => {
    const h = await f.household();
    const acct = await f.account(h, 0);
    const b = await f.bucket(h);
    await f.tx(h, acct, "expense", -700, "2026-03-10", b);
    // The app never puts a bucket on these, but the filter is what keeps them out.
    await f.tx(h, acct, "income", 50_000, "2026-03-10", b);
    await f.tx(h, acct, "transfer", -9_000, "2026-03-10", b);
    await f.tx(h, acct, "adjustment", -300, "2026-03-10", b);
    // Fails if: the type = 'expense' filter is removed from either query.
    expect(await getBucketSpentInMonthCents(db, h, b, "2026-03")).toBe(700);
    expect(await getBucketSpentThroughCents(db, h, b, "2026-03")).toBe(700);
  });

  it("counts a positive-amount expense as spending, not as a refund", async () => {
    const h = await f.household();
    const acct = await f.account(h, 0);
    const b = await f.bucket(h);
    await f.tx(h, acct, "expense", -1_000, "2026-03-10", b);
    // Suspected bug: abs() turns a +200 "refund" into 200 more spent.
    await f.tx(h, acct, "expense", 200, "2026-03-11", b);
    // Fails if: abs() is removed (would give -800) or replaced with a signed sum.
    expect(await getBucketSpentInMonthCents(db, h, b, "2026-03")).toBe(1_200);
    expect(await getBucketSpentThroughCents(db, h, b, "2026-03")).toBe(1_200);
  });

  it("both only count this bucket in this household", async () => {
    const h = await f.household();
    const acct = await f.account(h, 0);
    const b = await f.bucket(h);
    const otherBucket = await f.bucket(h, "Other");
    const otherHousehold = await f.household();
    const otherAcct = await f.account(otherHousehold, 0);
    await f.tx(h, acct, "expense", -40, "2026-03-10", b);
    await f.tx(h, acct, "expense", -5_000, "2026-03-10", otherBucket);
    await f.tx(h, acct, "expense", -6_000, "2026-03-10", null); // no bucket
    await f.tx(otherHousehold, otherAcct, "expense", -7_000, "2026-03-10", b);
    // Fails if: the bucketId or householdId filter is removed from either query.
    expect(await getBucketSpentInMonthCents(db, h, b, "2026-03")).toBe(40);
    expect(await getBucketSpentThroughCents(db, h, b, "2026-03")).toBe(40);
  });

  it("are 0 for a bucket with no expenses", async () => {
    const h = await f.household();
    const b = await f.bucket(h);
    expect(await getBucketSpentInMonthCents(db, h, b, "2026-03")).toBe(0);
    expect(await getBucketSpentThroughCents(db, h, b, "2026-03")).toBe(0);
  });
});

describe("getBucketMonthStats", () => {
  it("shows this month's assigned and spent, and remaining rolled over from earlier months", async () => {
    const h = await f.household();
    const acct = await f.account(h, 0);
    const b = await f.bucket(h);
    await f.assign(h, b, 50_000, "2026-02");
    await f.tx(h, acct, "expense", -20_000, "2026-02-14", b);
    await f.assign(h, b, 40_000, "2026-03");
    await f.tx(h, acct, "expense", -15_000, "2026-03-09", b);
    await f.assign(h, b, 99_000, "2026-04"); // next month: not yet
    await f.tx(h, acct, "expense", -99_000, "2026-04-02", b);
    // remaining = (50_000 + 40_000) − (20_000 + 15_000) = 55_000
    // Fails if: assigned/spent use the cumulative totals, remaining uses only this
    // month, or remaining subtracts the wrong way round.
    expect(await getBucketMonthStats(db, h, b, "2026-03")).toEqual({
      assignedCents: 40_000,
      spentCents: 15_000,
      remainingCents: 55_000,
      thisMonthAssignedCents: 40_000,
    });
  });

  it("lets remaining go negative when a bucket is overspent", async () => {
    const h = await f.household();
    const acct = await f.account(h, 0);
    const b = await f.bucket(h);
    await f.assign(h, b, 1_000, "2026-03");
    await f.tx(h, acct, "expense", -2_500, "2026-03-20", b);
    // Fails if: remaining is clamped at 0.
    expect((await getBucketMonthStats(db, h, b, "2026-03")).remainingCents).toBe(-1_500);
  });

  it("is all zeros for a brand-new bucket", async () => {
    const h = await f.household();
    const b = await f.bucket(h);
    expect(await getBucketMonthStats(db, h, b, "2026-03")).toEqual({
      assignedCents: 0,
      spentCents: 0,
      remainingCents: 0,
      thisMonthAssignedCents: 0,
    });
  });
});
