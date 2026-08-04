"use client";

import { useState } from "react";
import { MoneyAmountInput } from "@/components/money-amount-input";
import { assignToGoal, deleteGoal } from "@/app/goals/actions";
import { formatCents } from "@/lib/money";

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
}) {
  const [open, setOpen] = useState(false);

  async function onAssign(formData: FormData) {
    await assignToGoal(formData);
    setOpen(false);
  }

  const pct = Math.round(progressRatio * 100);

  return (
    <li className="rounded-lg border border-[var(--border)] bg-white/60 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
