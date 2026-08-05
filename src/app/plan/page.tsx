import { asc, eq } from "drizzle-orm";
import { AddBucketForm } from "@/components/add-bucket-form";
import { AddPlannedExpenseForm } from "@/components/add-planned-expense-form";
import { AppNav } from "@/components/app-nav";
import { BucketBoard } from "@/components/bucket-board";
import { buckets } from "@/db/schema";
import {
  getAvailableToAssignCents,
  getBucketMonthStats,
} from "@/lib/ledger";
import { currentMonthKey, formatCents } from "@/lib/money";
import { listPlannedExpensesWithCoverage } from "@/lib/planned-expenses";
import { requireSession } from "@/lib/session";
import { deletePlannedExpense } from "./planned-expense-actions";

export default async function PlanPage() {
  const { householdId, db } = await requireSession();
  const monthKey = currentMonthKey();
  const available = await getAvailableToAssignCents(db, householdId);

  const bucketList = await db
    .select()
    .from(buckets)
    .where(eq(buckets.householdId, householdId))
    .orderBy(asc(buckets.sortOrder), asc(buckets.name));

  const rows = await Promise.all(
    bucketList.map(async (bucket) => {
      const stats = await getBucketMonthStats(db, bucket.id, monthKey);
      return { bucket, ...stats };
    }),
  );

  rows.sort((a, b) => {
    if (a.bucket.fundKind !== b.bucket.fundKind) {
      return a.bucket.fundKind === "necessary" ? -1 : 1;
    }
    if (a.bucket.sortOrder !== b.bucket.sortOrder) {
      return a.bucket.sortOrder - b.bucket.sortOrder;
    }
    return a.bucket.name.localeCompare(b.bucket.name);
  });

  const upcoming = await listPlannedExpensesWithCoverage(db, householdId);

  return (
    <>
      <AppNav availableCents={available} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="font-serif text-3xl tracking-tight">Plan</h1>
        <p className="mt-2 text-[var(--muted)]">
          Give every dollar a job. Assign from Available, or transfer between
          buckets. Spend only works when a bucket has enough remaining.
        </p>

        <div className="mt-8 rounded-lg border border-[var(--border)] bg-white/60 p-5">
          <p className="text-sm text-[var(--muted)]">Available to Assign</p>
          <p className="mt-1 font-serif text-3xl tabular-nums">
            {formatCents(available)}
          </p>
        </div>

        <section className="mt-10">
          <h2 className="font-serif text-xl">Upcoming expenses</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Covered when the linked bucket has enough remaining.
          </p>
          <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {upcoming.length === 0 ? (
              <li className="py-4 text-sm text-[var(--muted)]">
                No planned expenses yet.
              </li>
            ) : (
              upcoming.map(
                ({ expense, bucketName, covered, shortfallCents }) => (
                  <li
                    key={expense.id}
                    className="flex items-start justify-between gap-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{expense.name}</p>
                      <p className="text-sm text-[var(--muted)]">
                        Due {expense.dueDate} · {bucketName} ·{" "}
                        {expense.recurrence}
                      </p>
                      {!covered ? (
                        <p className="mt-1 text-sm text-amber-800">
                          Short {formatCents(shortfallCents)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="tabular-nums">
                        {formatCents(expense.amountCents)}
                      </p>
                      <span
                        className={`text-xs ${
                          covered ? "text-teal-800" : "text-amber-800"
                        }`}
                      >
                        {covered ? "Covered" : "Not covered"}
                      </span>
                      <form action={deletePlannedExpense}>
                        <input type="hidden" name="id" value={expense.id} />
                        <button
                          type="submit"
                          className="text-xs text-[var(--muted)] hover:text-red-700"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </li>
                ),
              )
            )}
          </ul>

          <div className="mt-4">
            <AddPlannedExpenseForm
              buckets={bucketList.map((b) => ({ id: b.id, name: b.name }))}
            />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-xl">Buckets</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Month {monthKey} · leftover rolls forward
          </p>
          {rows.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              No buckets yet — add one below.
            </p>
          ) : (
            <div className="mt-4">
              <BucketBoard
                key={rows
                  .map(
                    (r) =>
                      `${r.bucket.id}:${r.bucket.fundKind}:${r.bucket.sortOrder}`,
                  )
                  .join("|")}
                monthKey={monthKey}
                initialBuckets={rows.map(
                  ({ bucket, assignedCents, spentCents, remainingCents }) => ({
                    bucketId: bucket.id,
                    name: bucket.name,
                    fundKind:
                      bucket.fundKind === "unnecessary"
                        ? "unnecessary"
                        : "necessary",
                    assignedCents,
                    spentCents,
                    remainingCents,
                  }),
                )}
              />
            </div>
          )}
          <div className="mt-4">
            <AddBucketForm />
          </div>
        </section>
      </main>
    </>
  );
}
