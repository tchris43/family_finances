"use client";

import { useMemo, useState } from "react";
import { MoneyAmountInput } from "@/components/money-amount-input";
import {
  assignToGoal,
  deleteGoal,
  transferFromGoal,
  updateGoal,
} from "@/app/goals/actions";
import { formatCents } from "@/lib/money";

type Peer = { id: string; name: string };

export function GoalCard({
  goalId,
  name,
  targetCents,
  targetDate,
  priority,
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
  priority: number;
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
  const [mode, setMode] = useState<"assign" | "transfer" | "edit">("assign");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const field =
    "mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2";

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

  async function onEdit(formData: FormData) {
    setError(null);
    setSaved(false);
    try {
      await updateGoal(formData);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update goal");
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
          setSaved(false);
        }}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{name}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatCents(currentCents)} of {formatCents(targetCents)}
              {targetDate ? ` · by ${targetDate}` : ""}
              {` · priority ${priority}`}
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
          <div className="flex flex-wrap gap-2 text-sm">
            {(
              [
                ["assign", "Assign"],
                ["transfer", "Transfer"],
                ["edit", "Edit"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError(null);
                  setSaved(false);
                }}
                className={`rounded-full px-3 py-1 ${
                  mode === value
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                {label}
              </button>
            ))}
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
          ) : null}

          {mode === "transfer" ? (
            destinations.length === 0 ? (
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
                    className={field}
                    defaultValue={`${destinations[0].kind}:${destinations[0].id}`}
                  >
                    {destinations.map((d) => (
                      <option
                        key={`${d.kind}:${d.id}`}
                        value={`${d.kind}:${d.id}`}
                      >
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
            )
          ) : null}

          {mode === "edit" ? (
            <form action={onEdit} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="goalId" value={goalId} />
              <label className="text-sm sm:col-span-2">
                <span className="text-[var(--muted)]">Target amount</span>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={(targetCents / 100).toFixed(2)}
                  className={field}
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--muted)]">Priority (0 = highest)</span>
                <input
                  name="priority"
                  type="number"
                  required
                  defaultValue={priority}
                  className={field}
                />
              </label>
              <label className="text-sm">
                <span className="text-[var(--muted)]">Target date (optional)</span>
                <input
                  name="targetDate"
                  type="date"
                  defaultValue={targetDate ?? ""}
                  className={field}
                />
              </label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
                >
                  Save changes
                </button>
                {saved ? (
                  <span className="text-sm text-teal-800">Saved</span>
                ) : null}
              </div>
            </form>
          ) : null}

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
