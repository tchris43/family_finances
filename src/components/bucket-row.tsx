"use client";

import { useState } from "react";
import { MoneyAmountInput } from "@/components/money-amount-input";
import { assignToBucket } from "@/app/plan/actions";
import { formatCents } from "@/lib/money";

export function BucketRow({
  bucketId,
  name,
  assignedCents,
  spentCents,
  remainingCents,
  monthKey,
}: {
  bucketId: string;
  name: string;
  assignedCents: number;
  spentCents: number;
  remainingCents: number;
  monthKey: string;
}) {
  const [open, setOpen] = useState(false);

  async function onAssign(formData: FormData) {
    await assignToBucket(formData);
    setOpen(false);
  }

  return (
    <li className="border-b border-[var(--border)] py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-[var(--muted)]">
            Assigned {formatCents(assignedCents)} · Spent{" "}
            {formatCents(spentCents)}
          </p>
        </div>
        <p
          className={`tabular-nums font-medium ${
            remainingCents < 0 ? "text-red-800" : ""
          }`}
        >
          {formatCents(remainingCents)}
          <span className="ml-1 text-xs font-normal text-[var(--muted)]">
            left
          </span>
        </p>
      </button>

      {open ? (
        <form
          action={onAssign}
          className="mt-3 grid gap-3 rounded-lg border border-[var(--border)] bg-white/70 p-3"
        >
          <input type="hidden" name="bucketId" value={bucketId} />
          <input type="hidden" name="monthKey" value={monthKey} />
          <p className="text-sm text-[var(--muted)]">
            Assign Available dollars to <strong>{name}</strong>
          </p>
          <MoneyAmountInput label="Assign amount" />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
            >
              Assign
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
      ) : null}
    </li>
  );
}
