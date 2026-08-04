import { desc, eq } from "drizzle-orm";
import { AddAccountForm } from "@/components/add-account-form";
import { AppNav } from "@/components/app-nav";
import { accounts } from "@/db/schema";
import {
  getAccountBalanceCents,
  getAvailableToAssignCents,
} from "@/lib/ledger";
import { formatCents, todayISO } from "@/lib/money";
import { requireSession } from "@/lib/session";
import { adjustAccountBalance, setMainAccount } from "./actions";

export default async function AccountsPage() {
  const { householdId, db } = await requireSession();
  const available = await getAvailableToAssignCents(db, householdId);

  const list = await db
    .select()
    .from(accounts)
    .where(eq(accounts.householdId, householdId))
    .orderBy(desc(accounts.isMain));

  const withBalances = await Promise.all(
    list.map(async (account) => ({
      ...account,
      balanceCents: await getAccountBalanceCents(db, account.id),
    })),
  );

  return (
    <>
      <AppNav availableCents={available} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="font-serif text-3xl tracking-tight">Accounts</h1>
        <p className="mt-2 text-[var(--muted)]">
          Mark one as Main (default for new transactions). Adjust balance when
          the bank statement disagrees.
        </p>

        <ul className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {withBalances.map((account) => (
            <li key={account.id} className="space-y-3 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {account.name}
                    {account.isMain ? (
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        Main
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {account.type}
                    {account.institution ? ` · ${account.institution}` : ""}
                  </p>
                </div>
                <p className="tabular-nums font-medium">
                  {formatCents(account.balanceCents)}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {!account.isMain ? (
                  <form action={setMainAccount}>
                    <input type="hidden" name="accountId" value={account.id} />
                    <button
                      type="submit"
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      Make Main
                    </button>
                  </form>
                ) : null}
                <form
                  action={adjustAccountBalance}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="accountId" value={account.id} />
                  <input type="hidden" name="date" value={todayISO()} />
                  <label className="text-sm">
                    <span className="sr-only">New balance</span>
                    <input
                      name="newBalance"
                      type="number"
                      step="0.01"
                      placeholder="Set balance"
                      className="w-32 rounded-md border border-[var(--border)] bg-white px-2 py-1.5"
                    />
                  </label>
                  <button
                    type="submit"
                    className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Adjust
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>

        <section className="mt-10">
          <AddAccountForm />
        </section>

        <section className="mt-14 border-t border-[var(--border)] pt-10">
          <h2 className="font-serif text-xl">Backup</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Download a full JSON copy of this household (accounts, buckets,
            goals, transactions, plan). Passwords are not included. Restore is
            not built yet — keep this file safe.
          </p>
          <a
            href="/api/backup"
            className="mt-4 inline-block rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--accent)]"
          >
            Download backup
          </a>
        </section>
      </main>
    </>
  );
}
