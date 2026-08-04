"use client";

import { useState } from "react";
import { MoneyAmountInput } from "@/components/money-amount-input";
import { assignToBucket, transferBucketToBucket } from "@/app/plan/actions";
import { formatCents } from "@/lib/money";

type Peer = { id: string; name: string };

export function BucketRow({
  bucketId,
  name,
  assignedCents,
  spentCents,
  remainingCents,
  monthKey,
  otherBuckets,
}: {
  bucketId: string;
  name: string;
  assignedCents: number;
  spentCents: number;
  remainingCents: number;
  monthKey: string;
  otherBuckets: Peer[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"assign" | "transfer">("assign");
  const [error, setError] = useState<string | null>(null);

  async function onAssign(formData: FormData) {
    setError(null);
    try {
      await assignToBucket(formData);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign");
    }
  }

  async function onTransfer(formData: FormData) {
    setError(null);
    try {
      const result = await transferBucketToBucket(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not transfer");
    }
  }

  return (
    <li className="border-b border-[var(--border)] py-3">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
        }}
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
        <div className="mt-3 space-y-3 rounded-lg border border-[var(--border)] bg-white/70 p-3">
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode("assign");
                setError(null);
              }}
              className={`rounded-full px-3 py-1 ${
                mode === "assign"
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              Assign
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("transfer");
                setError(null);
              }}
              className={`rounded-full px-3 py-1 ${
                mode === "transfer"
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              Transfer
            </button>
          </div>

          {error ? (
            <p className="text-sm text-amber-900">{error}</p>
          ) : null}

          {mode === "assign" ? (
            <form action={onAssign} className="grid gap-3">
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
          ) : otherBuckets.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Add another bucket to transfer between categories.
            </p>
          ) : (
            <form action={onTransfer} className="grid gap-3">
              <input type="hidden" name="fromBucketId" value={bucketId} />
              <input type="hidden" name="monthKey" value={monthKey} />
              <p className="text-sm text-[var(--muted)]">
                Move from <strong>{name}</strong> (
                {formatCents(remainingCents)} left) to another bucket
              </p>
              <label className="text-sm">
                <span className="text-[var(--muted)]">To</span>
                <select
                  name="toBucketId"
                  required
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
                  defaultValue={otherBuckets[0]?.id}
                >
                  {otherBuckets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <MoneyAmountInput label="Transfer amount" />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
                >
                  Transfer
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
          )}
        </div>
      ) : null}
    </li>
  );
}
