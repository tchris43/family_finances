"use client";

import { AddDisclosure } from "@/components/add-disclosure";
import { MoneyAmountInput } from "@/components/money-amount-input";
import {
  addCashflowExpense,
  addCashflowPaycheck,
  deleteCashflowLine,
  pullGoalsIntoCashflow,
  restoreGoalToCashflow,
  updateCashflowLine,
} from "@/app/cashflow/actions";
import { formatCents } from "@/lib/money";

type Line = {
  id: string;
  label: string;
  amountCents: number;
  kind?: "paycheck" | "expense" | "goal";
};

type Bucket = { id: string; name: string; fundKind: string };
type ExcludedGoal = { goalId: string; name: string };

const field =
  "mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

export function CashflowPaychecks({ lines }: { lines: Line[] }) {
  return (
    <section>
      <h2 className="font-serif text-xl">Paychecks</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Expected take-home each month — add each one separately.
      </p>
      <LineList lines={lines} empty="No paychecks yet." />
      <div className="mt-3">
        <AddDisclosure label="+ Add paycheck">
          <form action={addCashflowPaycheck} className="grid gap-3">
            <label className="text-sm">
              <span className="text-[var(--muted)]">Label</span>
              <input
                name="label"
                placeholder="Paycheck — Chris"
                className={field}
              />
            </label>
            <MoneyAmountInput label="Monthly amount" />
            <button
              type="submit"
              className="w-fit rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
          </form>
        </AddDisclosure>
      </div>
    </section>
  );
}

export function CashflowGoals({
  lines,
  hasGoalsToPull,
  excludedGoals,
}: {
  lines: Line[];
  hasGoalsToPull: boolean;
  excludedGoals: ExcludedGoal[];
}) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl">Goals (monthly)</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Suggested monthly contributions. Remove from forecast leaves the
            goal on Goals unchanged.
          </p>
        </div>
        {hasGoalsToPull ? (
          <form action={pullGoalsIntoCashflow}>
            <button
              type="submit"
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
            >
              Add from Goals
            </button>
          </form>
        ) : null}
      </div>
      <LineList
        lines={lines.map((l) => ({ ...l, kind: "goal" as const }))}
        empty="No goal lines — pull from Goals above."
        removeLabel="Remove from forecast"
      />
      {excludedGoals.length > 0 ? (
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-white/50 p-3">
          <p className="text-sm text-[var(--muted)]">
            Left out of this forecast
          </p>
          <ul className="mt-2 space-y-2">
            {excludedGoals.map((g) => (
              <li
                key={g.goalId}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>{g.name}</span>
                <form action={restoreGoalToCashflow}>
                  <input type="hidden" name="goalId" value={g.goalId} />
                  <button
                    type="submit"
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    Add back
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function CashflowExpenses({
  lines,
  buckets,
}: {
  lines: Line[];
  buckets: Bucket[];
}) {
  const necessary = buckets.filter((b) => b.fundKind !== "unnecessary");
  const unnecessary = buckets.filter((b) => b.fundKind === "unnecessary");

  return (
    <section>
      <h2 className="font-serif text-xl">Monthly expenses</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        What you plan to spend on groceries, rent, eating out, etc.
      </p>
      <LineList lines={lines} empty="No expenses yet." />
      <div className="mt-3">
        <AddDisclosure label="+ Add expense">
          <form action={addCashflowExpense} className="grid gap-3">
            <label className="text-sm">
              <span className="text-[var(--muted)]">Bucket (optional)</span>
              <select name="bucketId" className={field} defaultValue="">
                <option value="">Custom label…</option>
                {necessary.length > 0 ? (
                  <optgroup label="Necessary">
                    {necessary.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {unnecessary.length > 0 ? (
                  <optgroup label="Unnecessary">
                    {unnecessary.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-[var(--muted)]">Label (if custom)</span>
              <input name="label" placeholder="Optional override" className={field} />
            </label>
            <MoneyAmountInput label="Monthly amount" />
            <button
              type="submit"
              className="w-fit rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
          </form>
        </AddDisclosure>
      </div>
    </section>
  );
}

function LineList({
  lines,
  empty,
  removeLabel = "Delete",
}: {
  lines: Line[];
  empty: string;
  removeLabel?: string;
}) {
  if (lines.length === 0) {
    return <p className="mt-4 text-sm text-[var(--muted)]">{empty}</p>;
  }

  return (
    <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
      {lines.map((line) => (
        <CashflowLineRow
          key={line.id}
          line={line}
          removeLabel={removeLabel}
        />
      ))}
    </ul>
  );
}

function CashflowLineRow({
  line,
  removeLabel,
}: {
  line: Line;
  removeLabel: string;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <form
        action={updateCashflowLine}
        className="flex min-w-0 flex-1 flex-wrap items-end gap-2"
      >
        <input type="hidden" name="id" value={line.id} />
        <label className="min-w-[8rem] flex-1 text-sm">
          <span className="sr-only">Label</span>
          <input
            name="label"
            defaultValue={line.label}
            className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="sr-only">Amount</span>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={(line.amountCents / 100).toFixed(2)}
            className="w-28 rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm tabular-nums"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-[var(--border)] px-2 py-1.5 text-xs hover:border-[var(--accent)]"
        >
          Save
        </button>
      </form>
      <div className="flex items-center gap-3">
        <span className="tabular-nums text-sm text-[var(--muted)] sm:hidden">
          {formatCents(line.amountCents)}
        </span>
        <form action={deleteCashflowLine}>
          <input type="hidden" name="id" value={line.id} />
          <button
            type="submit"
            className="text-xs text-[var(--muted)] hover:text-red-700"
          >
            {removeLabel}
          </button>
        </form>
      </div>
    </li>
  );
}
