"use client";

import { useState, useTransition } from "react";
import { completeOnboarding } from "@/app/onboarding-actions";

function steps(householdName: string) {
  return [
    {
      title: `Welcome, ${householdName}`,
      body: "A few things to know before you start. This takes under a minute.",
    },
    {
      title: "Add an account with its real balance",
      body: "Whatever cash you have right now becomes your Available to Assign — no paycheck needed first.",
    },
    {
      title: "Buckets are already set up",
      body: "Groceries, Housing, and a few others are ready on Plan. Rename, reorder, or add your own any time.",
    },
    {
      title: "Record activity as it happens",
      body: "Use + Transaction on Home for spends and paychecks — it keeps balances and Available honest.",
    },
  ];
}

export function OnboardingWalkthrough({
  householdName,
}: {
  householdName: string;
}) {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [, startTransition] = useTransition();

  if (dismissed) return null;

  const list = steps(householdName);
  const isLast = step === list.length - 1;
  const current = list[step];

  function finish() {
    setDismissed(true);
    startTransition(() => {
      completeOnboarding();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {step + 1} of {list.length}
          </p>
          <button
            type="button"
            onClick={finish}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Skip
          </button>
        </div>

        <h2 id="onboarding-title" className="mt-3 font-serif text-2xl">
          {current.title}
        </h2>
        <p className="mt-2 text-[var(--muted)]">{current.body}</p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
            className="text-sm text-[var(--muted)] disabled:opacity-0"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {isLast ? "Let's go" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
