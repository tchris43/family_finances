"use client";

import { useMemo, useState } from "react";
import { affordCashAnswer, affordGoalImpacts } from "@/lib/afford";
import { formatCents } from "@/lib/money";

type GoalInput = {
  id: string;
  name: string;
  targetCents: number;
  targetDate: string | null;
  currentCents: number;
  estimatedCompletion: string | null;
  suggestedMonthlyCents: number | null;
};

export function AffordabilityCalculator({
  availableCents,
  goals,
}: {
  availableCents: number;
  goals: GoalInput[];
}) {
  const [purchaseCents, setPurchaseCents] = useState(0);
  const [label, setLabel] = useState("");

  // Mirror ATM pad locally for live results (hidden field still posts if needed)
  const cash = useMemo(
    () => affordCashAnswer(availableCents, purchaseCents),
    [availableCents, purchaseCents],
  );
  const impacts = useMemo(
    () => affordGoalImpacts(purchaseCents, goals),
    [purchaseCents, goals],
  );

  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <AtmAmount
          label="Purchase amount"
          onCentsChange={setPurchaseCents}
        />
        <label className="text-sm">
          <span className="text-[var(--muted)]">What is it? (optional)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Car / trip / couch"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2.5"
          />
        </label>
      </div>

      {purchaseCents > 0 ? (
        <>
          <section className="rounded-lg border border-[var(--border)] bg-white/60 p-5">
            <h2 className="font-serif text-xl">Cash / Available</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {label ? `For “${label}”: ` : ""}
              Available is {formatCents(availableCents)}.
            </p>
            <p
              className={`mt-3 font-serif text-2xl ${
                cash.canCoverFromAvailable ? "text-teal-900" : "text-amber-900"
              }`}
            >
              {cash.canCoverFromAvailable
                ? `Yes — you’d have ${formatCents(cash.leftoverAvailableCents)} left to assign.`
                : `Not from Available alone — short ${formatCents(-cash.leftoverAvailableCents)}.`}
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl">Goal impact</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              What-if only — nothing is saved. Assumes this money could have
              funded goals.
            </p>
            {goals.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Add goals to see timeline impact.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {impacts.map((row) => (
                  <li key={row.goalId} className="py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{row.goalName}</p>
                        <p className="text-sm text-[var(--muted)]">{row.note}</p>
                      </div>
                      <div className="text-right text-sm tabular-nums">
                        {row.monthsDelay != null ? (
                          <p className="font-medium text-amber-900">
                            +{row.monthsDelay} mo
                          </p>
                        ) : (
                          <p className="text-[var(--muted)]">—</p>
                        )}
                        {row.beforeEstimatedCompletion ||
                        row.afterEstimatedCompletion ? (
                          <p className="mt-1 text-[var(--muted)]">
                            {row.beforeEstimatedCompletion ?? "?"} →{" "}
                            {row.afterEstimatedCompletion ?? "?"}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Enter an amount to see both answers.
        </p>
      )}
    </div>
  );
}

/** Local ATM pad that reports cents to parent (for live calculator). */
function AtmAmount({
  label,
  onCentsChange,
}: {
  label: string;
  onCentsChange: (cents: number) => void;
}) {
  const [cents, setCents] = useState(0);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const next = Math.min(cents * 10 + Number(e.key), 9_999_999_999);
      setCents(next);
      onCentsChange(next);
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = Math.floor(cents / 10);
      setCents(next);
      onCentsChange(next);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) e.preventDefault();
  }

  return (
    <label className="text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatCents(cents)}
        onChange={() => {}}
        onKeyDown={onKeyDown}
        className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2.5 font-medium tabular-nums outline-none focus:border-[var(--accent)]"
      />
      <span className="mt-1 block text-xs text-[var(--muted)]">
        Digits only — e.g. 50000 = $500.00
      </span>
    </label>
  );
}
