"use client";

import { AddDisclosure } from "@/components/add-disclosure";
import { MoneyAmountInput } from "@/components/money-amount-input";
import { createPlannedExpense } from "@/app/plan/planned-expense-actions";

export function AddPlannedExpenseForm({
  buckets,
}: {
  buckets: { id: string; name: string }[];
}) {
  const field =
    "mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

  if (buckets.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Add a bucket first, then link upcoming bills to it.
      </p>
    );
  }

  return (
    <AddDisclosure label="+ Add planned expense">
      <form action={createPlannedExpense} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="text-[var(--muted)]">Name</span>
          <input name="name" required placeholder="Rent" className={field} />
        </label>
        <div className="sm:col-span-2">
          <MoneyAmountInput />
        </div>
        <label className="text-sm">
          <span className="text-[var(--muted)]">Due date</span>
          <input name="dueDate" type="date" required className={field} />
        </label>
        <label className="text-sm">
          <span className="text-[var(--muted)]">Linked bucket</span>
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
          <span className="text-[var(--muted)]">Recurrence</span>
          <select name="recurrence" defaultValue="monthly" className={field}>
            <option value="once">Once</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white sm:col-span-2 sm:w-fit"
        >
          Save
        </button>
      </form>
    </AddDisclosure>
  );
}
