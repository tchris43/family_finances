"use client";

import { AddDisclosure } from "@/components/add-disclosure";
import { MoneyAmountInput } from "@/components/money-amount-input";
import { createGoal } from "@/app/goals/actions";

export function AddGoalForm() {
  const field =
    "mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2";

  return (
    <AddDisclosure label="+ Add goal">
      <form action={createGoal} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="text-[var(--muted)]">Name</span>
          <input
            name="name"
            required
            placeholder="House fund"
            className={field}
          />
        </label>
        <div className="sm:col-span-2">
          <MoneyAmountInput label="Target amount" />
        </div>
        <label className="text-sm">
          <span className="text-[var(--muted)]">Target date (optional)</span>
          <input name="targetDate" type="date" className={field} />
        </label>
        <label className="text-sm">
          <span className="text-[var(--muted)]">Priority (0 = highest)</span>
          <input
            name="priority"
            type="number"
            defaultValue={0}
            className={field}
          />
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
