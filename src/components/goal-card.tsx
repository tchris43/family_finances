"use client";

import { useMemo, useState } from "react";
import { MoneyAmountInput } from "@/components/money-amount-input";
import { assignToGoal, deleteGoal, transferFromGoal } from "@/app/goals/actions";
import { formatCents } from "@/lib/money";

type Peer = { id: string; name: string };

export function GoalCard({
  goalId,
  name,
  targetCents,
  targetDate,
  currentCents,
  remainingCents,
  progressRatio,
  suggestedMonthlyCents,
  onTrack,
  estimatedCompletion,
  monthKey,
  otherGoals,
  buckets,
}: {
  goalId: string;
  name: string;
  targetCents: number;
  targetDate: string | null;
  currentCents: number;
  remainingCents: number;
  progressRatio: number;
  suggestedMonthlyCents: number | null;
  onTrack: boolean | null;
  estimatedCompletion: string | null;
  monthKey: string;
  otherGoals: Peer[];
  buckets: Peer[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"assign" | "transfer">("assign");
  const [error, setError] = useState<string | null>(null);

  const destinations = useMemo(() => {
    const list: { kind: "goal" | "bucket"; id: string; label: string }[] = [];
    for (const g of otherGoals) {
      list.push({ kind: "goal", id: g.id, label: `Goal · ${g.name}` });
    }
    for (const b of buckets) {
      list.push({ kind: "bucket", id: b.id, label: `Bucket · ${b.name}` });
    }
    return list;
  }, [otherGoals, buckets]);

  async function onAssign(formData: FormData) {
    setError(null);
    try {
      await assignToGoal(formData);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign");
    }
  }

  async function onTransfer(formData: FormData) {
    setError(null);
    const destValue = String(formData.get("destination") ?? "");
    const [toKind, toId] = destValue.split(":");
    formData.set("toKind", toKind);
    formData.set("toId", toId);
    try {
      const result = await transferFromGoal(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not transfer");
    }
  }

  const pct = Math.round(progressRatio * 100);

  return (
    <li className="rounded-lg border border-[var(--border)] bg-white/60 p-4">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
        }}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{name}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatCents(currentCents)} of {formatCents(targetCents)}
              {targetDate ? ` · by ${targetDate}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="tabular-nums font-medium">{pct}%</p>
            {onTrack === null ? null : (
              <p
                className={`text-xs ${
                  onTrack ? "text-teal-800" : "text-amber-800"
                }`}
              >
                {onTrack ? "On track" : "Behind"}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {formatCents(remainingCents)} left
          {suggestedMonthlyCents != null
            ? ` · suggest ${formatCents(suggestedMonthlyCents)}/mo`
            : ""}
          {estimatedCompletion && estimatedCompletion !== "Reached"
            ? ` · est. ${estimatedCompletion}`
            : ""}
        </p>
      </button>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
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
              <input type="hidden" name="goalId" value={goalId} />
              <input type="hidden" name="monthKey" value={monthKey} />
              <p className="text-sm text-[var(--muted)]">
                Assign Available dollars to <strong>{name}</strong>
              </p>
              <MoneyAmountInput label="Assign amount" />
              <div className="flex flex-wrap gap-2">
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
          ) : destinations.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Add another goal or a bucket to transfer into.
            </p>
          ) : (
            <form action={onTransfer} className="grid gap-3">
              <input type="hidden" name="fromGoalId" value={goalId} />
              <input type="hidden" name="monthKey" value={monthKey} />
              <p className="text-sm text-[var(--muted)]">
                Move from <strong>{name}</strong> (
                {formatCents(currentCents)} funded) to a goal or bucket
              </p>
              <label className="text-sm">
                <span className="text-[var(--muted)]">To</span>
                <select
                  name="destination"
                  required
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
                  defaultValue={`${destinations[0].kind}:${destinations[0].id}`}
                >
                  {destinations.map((d) => (
                    <option key={`${d.kind}:${d.id}`} value={`${d.kind}:${d.id}`}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <MoneyAmountInput label="Transfer amount" />
              <div className="flex flex-wrap gap-2">
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

          <form action={deleteGoal}>
            <input type="hidden" name="goalId" value={goalId} />
            <button
              type="submit"
              className="text-xs text-[var(--muted)] hover:text-red-700"
            >
              Delete goal
            </button>
          </form>
        </div>
      ) : null}
    </li>
  );
}
