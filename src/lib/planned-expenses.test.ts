/**
 * Pinning tests for planned-expense coverage. Written when its bucket loads
 * moved from one-at-a-time to all-at-once: the claim order (due date, then
 * priority) and the shared-pool rule must not change.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { plannedExpenses } from "@/db/schema";
import { listPlannedExpensesWithCoverage, listUpcomingPlannedExpenses } from "@/lib/planned-expenses";
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

async function bill(
  householdId: string,
  bucketId: string,
  name: string,
  amountCents: number,
  dueDate: string,
  priority = 0,
) {
  await db.insert(plannedExpenses).values({ householdId, bucketId, name, amountCents, dueDate, priority });
}

describe("listPlannedExpensesWithCoverage", () => {
  it("bills in one bucket share its remaining, claimed in due-date order", async () => {
    const h = await f.household();
    const b = await f.bucket(h, "Utilities");
    await f.assign(h, b, 10_000, "2026-03");
    await bill(h, b, "Electric", 6_000, "2026-03-05");
    await bill(h, b, "Water", 3_000, "2026-03-10");
    await bill(h, b, "Internet", 2_000, "2026-03-20"); // only 1_000 left by now
    const rows = await listPlannedExpensesWithCoverage(db, h);
    // Fails if: each bill is checked against the full 10_000, or the order changes.
    expect(rows.map((r) => [r.expense.name, r.covered, r.shortfallCents, r.bucketRemainingCents])).toEqual([
      ["Electric", true, 0, 10_000],
      ["Water", true, 0, 10_000],
      ["Internet", false, 1_000, 10_000],
    ]);
  });

  it("breaks same-day ties by priority, and an uncovered bill doesn't claim anything", async () => {
    const h = await f.household();
    const b = await f.bucket(h);
    await f.assign(h, b, 5_000, "2026-03");
    await bill(h, b, "Big", 9_000, "2026-03-01", 0); // can't be covered: claims nothing
    await bill(h, b, "Small", 4_000, "2026-03-01", 1);
    const rows = await listPlannedExpensesWithCoverage(db, h);
    // Fails if: priority stops breaking ties, or an uncovered bill eats into the pool.
    expect(rows.map((r) => [r.expense.name, r.covered, r.shortfallCents])).toEqual([
      ["Big", false, 4_000],
      ["Small", true, 0],
    ]);
  });

  it("checks each bill against its own bucket and its due month's remaining", async () => {
    const h = await f.household();
    const rent = await f.bucket(h, "Housing");
    const car = await f.bucket(h, "Car");
    await f.assign(h, rent, 100_000, "2026-03");
    await f.assign(h, car, 1_000, "2026-03");
    await f.assign(h, car, 2_000, "2026-04"); // only counts for bills due in April or later
    await bill(h, rent, "Rent", 90_000, "2026-03-01");
    await bill(h, car, "Insurance", 2_500, "2026-03-15");
    await bill(h, car, "Registration", 2_500, "2026-04-15");
    const rows = await listPlannedExpensesWithCoverage(db, h);
    // Fails if: remaining is looked up for the wrong bucket or the wrong month.
    expect(rows.map((r) => [r.expense.name, r.bucketName, r.covered, r.bucketRemainingCents])).toEqual([
      ["Rent", "Housing", true, 100_000],
      ["Insurance", "Car", false, 1_000],
      ["Registration", "Car", true, 3_000],
    ]);
  });

  it("returns nothing for a household with no bills", async () => {
    const h = await f.household();
    expect(await listPlannedExpensesWithCoverage(db, h)).toEqual([]);
  });
});

describe("listUpcomingPlannedExpenses", () => {
  it("puts uncovered bills first, then by due date, and caps the count", async () => {
    const h = await f.household();
    const b = await f.bucket(h);
    await f.assign(h, b, 1_000, "2026-03");
    await bill(h, b, "A covered", 500, "2026-03-02");
    await bill(h, b, "B uncovered", 5_000, "2026-03-20");
    await bill(h, b, "C uncovered", 5_000, "2026-03-10");
    const rows = await listUpcomingPlannedExpenses(db, h, 2);
    // Fails if: the uncovered-first sort or the limit changes.
    expect(rows.map((r) => r.expense.name)).toEqual(["C uncovered", "B uncovered"]);
  });
});
