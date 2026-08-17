"use client";

import { useState } from "react";
import { settlePersonalDebt } from "@/app/plan/actions";
import { MoneyAmountInput } from "@/components/money-amount-input";
import { formatCents } from "@/lib/money";

export function SettlePersonalDebtForm({
  monthKey,
  shortfallCents,
}: {
  monthKey: string;
  shortfallCents: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    try {
      const result = await settlePersonalDebt(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not settle debt");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-sm font-medium text-[var(--accent)] hover:underline"
      >
        Settle personal debt
      </button>
    );
  }

  return (
    <form action={onSubmit} className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4">
      <input type="hidden" name="monthKey" value={monthKey} />
      <p className="text-sm text-[var(--muted)]">
        Record personal money used to cover over-assignment. This raises
        Available by the amount you enter (short by{" "}
        {formatCents(shortfallCents)}).
      </p>
      {error ? <p className="text-sm text-amber-900">{error}</p> : null}
      <MoneyAmountInput label="Settle amount" />
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
        >
          Settle debt
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
