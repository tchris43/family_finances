"use client";

import { AddDisclosure } from "@/components/add-disclosure";
import { createAccount } from "@/app/accounts/actions";

export function AddAccountForm() {
  const field =
    "mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2";

  return (
    <AddDisclosure label="+ Add account">
      <form action={createAccount} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="text-[var(--muted)]">Name</span>
          <input name="name" required className={field} />
        </label>
        <label className="text-sm">
          <span className="text-[var(--muted)]">Type</span>
          <select name="type" defaultValue="checking" className={field}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit">Credit</option>
            <option value="investment">Investment</option>
            <option value="loan">Loan</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-[var(--muted)]">Starting balance</span>
          <input
            name="startingBalance"
            type="number"
            step="0.01"
            defaultValue="0"
            className={field}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-[var(--muted)]">Institution (optional)</span>
          <input name="institution" className={field} />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input name="isMain" type="checkbox" />
          Make Main account
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
