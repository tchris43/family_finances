"use client";

import { useState } from "react";
import { MoneyAmountInput } from "@/components/money-amount-input";
import {
  createExpense,
  createIncome,
  createTransfer,
} from "@/app/spend/actions";

type Account = { id: string; name: string };
type Bucket = { id: string; name: string };

export function QuickAddTransaction({
  accounts,
  buckets,
  mainAccountId,
}: {
  accounts: Account[];
  buckets: Bucket[];
  mainAccountId: string;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"expense" | "income" | "transfer">(
    "expense",
  );
  const [error, setError] = useState<string | null>(null);

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Add an account before recording transactions.
      </p>
    );
  }

  const field =
    "mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

  async function onIncome(formData: FormData) {
    setError(null);
    try {
      await createIncome(formData);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save income");
    }
  }
  async function onExpense(formData: FormData) {
    setError(null);
    try {
      const result = await createExpense(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense");
    }
  }
  async function onTransfer(formData: FormData) {
    setError(null);
    try {
      await createTransfer(formData);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not transfer");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        + Transaction
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add transaction"
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-lg sm:rounded-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-serif text-2xl">Add transaction</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex gap-2 text-sm">
              {(
                [
                  ["expense", "Expense"],
                  ["income", "Income"],
                  ["transfer", "Transfer"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setKind(value);
                    setError(null);
                  }}
                  className={`rounded-full px-3 py-1 ${
                    kind === value
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {error ? (
              <p className="mt-4 text-sm text-amber-900">{error}</p>
            ) : null}

            {kind === "expense" ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Overspend is fine — the bucket can go negative; assign more later.
              </p>
            ) : null}

            {kind === "income" ? (
              <form action={onIncome} className="mt-5 grid gap-3">
                <MoneyAmountInput />
                <label className="text-sm">
                  <span className="text-[var(--muted)]">Account</span>
                  <select
                    name="accountId"
                    defaultValue={mainAccountId}
                    className={field}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-[var(--muted)]">Date</span>
                  <input
                    name="date"
                    type="date"
                    defaultValue={todayLocal()}
                    required
                    className={field}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-[var(--muted)]">Label (optional)</span>
                  <input
                    name="merchant"
                    placeholder="Paycheck"
                    className={field}
                  />
                </label>
                <button
                  type="submit"
                  className="mt-2 rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
                >
                  Save income
                </button>
              </form>
            ) : null}

            {kind === "expense" ? (
              <form action={onExpense} className="mt-5 grid gap-3">
                <MoneyAmountInput />
                <label className="text-sm">
                  <span className="text-[var(--muted)]">Bucket</span>
                  <select name="bucketId" required className={field}>
                    <option value="">Select…</option>
                    {buckets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-[var(--muted)]">Account</span>
                  <select
                    name="accountId"
                    defaultValue={mainAccountId}
                    className={field}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-[var(--muted)]">Date</span>
                  <input
                    name="date"
                    type="date"
                    defaultValue={todayLocal()}
                    required
                    className={field}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-[var(--muted)]">Merchant (optional)</span>
                  <input name="merchant" className={field} />
                </label>
                <button
                  type="submit"
                  className="mt-2 rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
                >
                  Save expense
                </button>
              </form>
            ) : null}

            {kind === "transfer" ? (
              accounts.length < 2 ? (
                <p className="mt-5 text-sm text-[var(--muted)]">
                  Add a second account to transfer.
                </p>
              ) : (
                <form action={onTransfer} className="mt-5 grid gap-3">
                  <MoneyAmountInput />
                  <label className="text-sm">
                    <span className="text-[var(--muted)]">From</span>
                    <select
                      name="fromAccountId"
                      defaultValue={mainAccountId}
                      className={field}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="text-[var(--muted)]">To</span>
                    <select
                      name="toAccountId"
                      defaultValue={
                        accounts.find((a) => a.id !== mainAccountId)?.id ?? ""
                      }
                      className={field}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="text-[var(--muted)]">Date</span>
                    <input
                      name="date"
                      type="date"
                      defaultValue={todayLocal()}
                      required
                      className={field}
                    />
                  </label>
                  <button
                    type="submit"
                    className="mt-2 rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
                  >
                    Transfer
                  </button>
                </form>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
