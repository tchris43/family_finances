"use client";

import { useState } from "react";
import { MoneyAmountInput } from "@/components/money-amount-input";
import {
  assignToBucket,
  deleteBucket,
  transferBucketToBucket,
} from "@/app/plan/actions";
import { formatCents } from "@/lib/money";

type Peer = { id: string; name: string };

export function BucketRow({
  bucketId,
  name,
  fundKind,
  assignedCents,
  spentCents,
  remainingCents,
  thisMonthAssignedCents = 0,
  suggestedCents = null,
  monthKey,
  otherBuckets,
  dragging,
  onDragStart,
  onDragEnd,
  onMoveKind,
  onDeleted,
}: {
  bucketId: string;
  name: string;
  fundKind: "necessary" | "unnecessary";
  assignedCents: number;
  spentCents: number;
  remainingCents: number;
  thisMonthAssignedCents?: number;
  suggestedCents?: number | null;
  monthKey: string;
  otherBuckets: Peer[];
  dragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onMoveKind?: (kind: "necessary" | "unnecessary") => void;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"assign" | "transfer">("assign");
  const [transferDir, setTransferDir] = useState<"out" | "in">("out");
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
    const otherId = String(formData.get("otherBucketId") ?? "");
    if (transferDir === "out") {
      formData.set("fromBucketId", bucketId);
      formData.set("toBucketId", otherId);
    } else {
      formData.set("fromBucketId", otherId);
      formData.set("toBucketId", bucketId);
    }
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

  async function onDelete(formData: FormData) {
    setError(null);
    try {
      const result = await deleteBucket(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted?.();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete bucket");
    }
  }

  return (
    <li
      className={`border-b border-[var(--border)] py-3 ${
        dragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          draggable
          aria-label={`Drag ${name}`}
          title="Drag to reorder"
          className="mt-0.5 cursor-grab touch-none select-none rounded px-1.5 py-1 text-[var(--muted)] hover:bg-black/5 active:cursor-grabbing"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", bucketId);
            onDragStart?.();
          }}
          onDragEnd={() => onDragEnd?.()}
          onClick={(e) => e.stopPropagation()}
        >
          ⋮⋮
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setError(null);
          }}
          className="flex min-w-0 flex-1 items-start justify-between gap-4 text-left"
        >
          <div className="min-w-0">
            <p className="font-medium">{name}</p>
            <p className="text-sm text-[var(--muted)]">
              Assigned {formatCents(assignedCents)} · Spent{" "}
              {formatCents(spentCents)}
              <span className="text-[var(--muted)]"> (this month)</span>
            </p>
            {suggestedCents != null && suggestedCents > 0 ? (
              <p
                className={`mt-0.5 text-sm ${
                  thisMonthAssignedCents >= suggestedCents
                    ? "text-teal-800"
                    : "text-amber-900"
                }`}
              >
                {formatCents(thisMonthAssignedCents)} /{" "}
                {formatCents(suggestedCents)} this month
                {thisMonthAssignedCents >= suggestedCents
                  ? " · met"
                  : ` · ${formatCents(suggestedCents - thisMonthAssignedCents)} short`}
              </p>
            ) : null}
          </div>
          <p
            className={`shrink-0 tabular-nums font-medium ${
              remainingCents < 0 ? "text-red-800" : ""
            }`}
          >
            {formatCents(remainingCents)}
            <span className="ml-1 text-xs font-normal text-[var(--muted)]">
              left
            </span>
          </p>
        </button>
      </div>

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
              <input type="hidden" name="monthKey" value={monthKey} />
              <div className="flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setTransferDir("in")}
                  className={`rounded-full px-3 py-1 ${
                    transferDir === "in"
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  Into {name}
                </button>
                <button
                  type="button"
                  onClick={() => setTransferDir("out")}
                  className={`rounded-full px-3 py-1 ${
                    transferDir === "out"
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border)] text-[var(--muted)]"
                  }`}
                >
                  Out of {name}
                </button>
              </div>
              <p className="text-sm text-[var(--muted)]">
                {transferDir === "in" ? (
                  <>
                    Pull into <strong>{name}</strong> from another bucket
                  </>
                ) : (
                  <>
                    Move from <strong>{name}</strong> (
                    {formatCents(remainingCents)} left) to another bucket
                  </>
                )}
              </p>
              <label className="text-sm">
                <span className="text-[var(--muted)]">
                  {transferDir === "in" ? "From" : "To"}
                </span>
                <select
                  name="otherBucketId"
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

          <div className="flex flex-wrap items-center gap-3">
            {onMoveKind ? (
              <button
                type="button"
                className="text-xs text-[var(--muted)] hover:text-[var(--accent)]"
                onClick={() =>
                  onMoveKind(
                    fundKind === "necessary" ? "unnecessary" : "necessary",
                  )
                }
              >
                Move to{" "}
                {fundKind === "necessary" ? "Unnecessary" : "Necessary"}
              </button>
            ) : null}
            <form action={onDelete}>
              <input type="hidden" name="bucketId" value={bucketId} />
              <button
                type="submit"
                className="text-xs text-[var(--muted)] hover:text-red-700"
              >
                Delete bucket
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </li>
  );
}
