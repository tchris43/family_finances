import { and, desc, eq, ilike, inArray, or, SQL } from "drizzle-orm";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { deleteTransaction } from "@/app/spend/actions";
import { AppNav } from "@/components/app-nav";
import { GettingStarted } from "@/components/getting-started";
import { QuickAddTransaction } from "@/components/quick-add-transaction";
import { getDb } from "@/db";
import { accounts, buckets, households, transactions } from "@/db/schema";
import { listGoalsWithStats } from "@/lib/goals";
import {
  getAccountBalanceCents,
  getAvailableToAssignCents,
} from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { listUpcomingPlannedExpenses } from "@/lib/planned-expenses";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await auth();
  if (!session?.user) return null;

  const householdId = session.user.householdId;
  if (!householdId) {
    throw new Error(
      "Signed in, but session is missing householdId. Check AUTH_SECRET matches between deploys and re-login.",
    );
  }

  const db = getDb();

  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  const householdAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.householdId, householdId))
    .orderBy(desc(accounts.isMain));

  const bucketList = await db
    .select()
    .from(buckets)
    .where(eq(buckets.householdId, householdId));

  const available = await getAvailableToAssignCents(db, householdId);
  const goalRows = await listGoalsWithStats(db, householdId);
  const upcomingBills = await listUpcomingPlannedExpenses(db, householdId, 5);

  const withBalances = await Promise.all(
    householdAccounts.map(async (account) => ({
      ...account,
      balanceCents: await getAccountBalanceCents(db, account.id),
    })),
  );

  const main = withBalances.find((a) => a.isMain) ?? withBalances[0];
  const totalCash = withBalances
    .filter((a) => a.type !== "loan" && a.type !== "credit")
    .reduce((sum, a) => sum + a.balanceCents, 0);

  const query = (q ?? "").trim();

  const [anyTx] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.householdId, householdId))
    .limit(1);
  const hasTransactions = !!anyTx;

  const matchingBucketIds = query
    ? bucketList
        .filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
        .map((b) => b.id)
    : [];
  const matchingAccountIds = query
    ? householdAccounts
        .filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
        .map((a) => a.id)
    : [];

  const searchParts: SQL[] = [];
  if (query) {
    searchParts.push(ilike(transactions.merchant, `%${query}%`));
    searchParts.push(ilike(transactions.notes, `%${query}%`));
    searchParts.push(ilike(transactions.type, `%${query}%`));
    if (matchingBucketIds.length) {
      searchParts.push(inArray(transactions.bucketId, matchingBucketIds));
    }
    if (matchingAccountIds.length) {
      searchParts.push(inArray(transactions.accountId, matchingAccountIds));
    }
  }

  const txList = await db
    .select()
    .from(transactions)
    .where(
      query
        ? and(
            eq(transactions.householdId, householdId),
            or(...searchParts),
          )
        : eq(transactions.householdId, householdId),
    )
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(50);

  const accountName = Object.fromEntries(
    householdAccounts.map((a) => [a.id, a.name]),
  );
  const bucketName = Object.fromEntries(bucketList.map((b) => [b.id, b.name]));

  return (
    <>
      <AppNav availableCents={available} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl tracking-tight">
              {household?.name ?? "Household"}
            </h1>
            <p className="mt-2 text-[var(--muted)]">
              Signed in as {session.user.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {main ? (
              <QuickAddTransaction
                accounts={householdAccounts.map((a) => ({
                  id: a.id,
                  name: a.name,
                }))}
                buckets={bucketList.map((b) => ({ id: b.id, name: b.name }))}
                mainAccountId={main.id}
              />
            ) : null}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <GettingStarted
          hasAccounts={householdAccounts.length > 0}
          hasBuckets={bucketList.length > 0}
          hasTransactions={hasTransactions}
        />

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-white/60 p-5">
            <p className="text-sm text-[var(--muted)]">Available to Assign</p>
            <p className="mt-1 font-serif text-3xl tabular-nums">
              {formatCents(available)}
            </p>
            <Link
              href="/plan"
              className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline"
            >
              Assign on Plan →
            </Link>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-white/60 p-5">
            <p className="text-sm text-[var(--muted)]">Cash (ex-credit/loans)</p>
            <p className="mt-1 font-serif text-3xl tabular-nums">
              {formatCents(totalCash)}
            </p>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-xl">Upcoming</h2>
            <Link
              href="/plan"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Plan
            </Link>
          </div>
          {upcomingBills.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              No planned expenses.{" "}
              <Link href="/plan" className="text-[var(--accent)] underline">
                Add on Plan
              </Link>
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {upcomingBills.map(({ expense, covered, bucketName }) => (
                <li
                  key={expense.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium">{expense.name}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {expense.dueDate} · {bucketName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums text-sm">
                      {formatCents(expense.amountCents)}
                    </p>
                    <p
                      className={`text-xs ${
                        covered ? "text-teal-800" : "text-amber-800"
                      }`}
                    >
                      {covered ? "Covered" : "Not covered"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-xl">Goals</h2>
            <Link
              href="/goals"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              All goals
            </Link>
          </div>
          {goalRows.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              No goals yet.{" "}
              <Link href="/goals" className="text-[var(--accent)] underline">
                Add one
              </Link>
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {goalRows.slice(0, 3).map(({ goal, stats }) => (
                <li
                  key={goal.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium">{goal.name}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {Math.round(stats.progressRatio * 100)}%
                      {stats.onTrack === null
                        ? ""
                        : stats.onTrack
                          ? " · on track"
                          : " · behind"}
                    </p>
                  </div>
                  <p className="tabular-nums text-sm">
                    {formatCents(stats.currentCents)} /{" "}
                    {formatCents(goal.targetCents)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-xl">Accounts</h2>
            <Link
              href="/accounts"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Manage
            </Link>
          </div>
          {withBalances.length === 0 ? (
            <p className="mt-3 text-[var(--muted)]">
              No accounts yet.{" "}
              <Link href="/accounts" className="text-[var(--accent)] underline">
                Add an account
              </Link>
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {withBalances.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {account.name}
                      {account.isMain ? (
                        <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                          Main
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {account.type}
                      {account.institution ? ` · ${account.institution}` : ""}
                    </p>
                  </div>
                  <p className="tabular-nums">
                    {formatCents(account.balanceCents)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-serif text-xl">Recent activity</h2>
            <form className="flex gap-2">
              <input
                name="q"
                defaultValue={query}
                placeholder="Search merchant, bucket, account…"
                className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                Search
              </button>
            </form>
          </div>
          <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {txList.length === 0 ? (
              <li className="py-4 text-sm text-[var(--muted)]">
                {query
                  ? "No matches."
                  : "No transactions yet — use + Transaction."}
              </li>
            ) : (
              txList.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {tx.merchant ||
                        (tx.type === "transfer"
                          ? "Transfer"
                          : tx.type === "adjustment"
                            ? "Balance adjustment"
                            : tx.type)}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {tx.date} · {accountName[tx.accountId] ?? "Account"}
                      {tx.bucketId
                        ? ` · ${bucketName[tx.bucketId] ?? "Bucket"}`
                        : ""}
                      {tx.notes ? ` · ${tx.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p
                      className={`tabular-nums ${
                        tx.amountCents < 0 ? "text-red-800" : ""
                      }`}
                    >
                      {formatCents(tx.amountCents)}
                    </p>
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={tx.id} />
                      <button
                        type="submit"
                        className="text-xs text-[var(--muted)] hover:text-red-700"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    </>
  );
}
