import Link from "next/link";

export function GettingStarted({
  hasAccounts,
  hasBuckets,
  hasTransactions,
}: {
  hasAccounts: boolean;
  hasBuckets: boolean;
  hasTransactions: boolean;
}) {
  if (hasAccounts && hasBuckets && hasTransactions) return null;

  const steps = [
    {
      done: hasAccounts,
      title: "Add an account",
      body: "Set the real balance you have now — that cash is Available to Assign right away.",
      href: "/accounts",
      cta: "Accounts",
    },
    {
      done: hasBuckets,
      title: "Confirm spend buckets",
      body: "Groceries, Housing, etc. — used when you record expenses and plan.",
      href: "/plan",
      cta: "Plan",
    },
    {
      done: hasTransactions,
      title: "Record activity as it happens",
      body: "Spends and paychecks on Home keep balances and Available honest.",
      href: "/",
      cta: "Home",
    },
  ];

  return (
    <section className="mt-8 rounded-xl border border-[var(--border)] bg-white/70 p-5">
      <h2 className="font-serif text-xl">Getting started</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Add accounts with starting balances, then assign that money on Plan —
        no paycheck required first.
      </p>
      <ol className="mt-5 space-y-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                step.done
                  ? "bg-teal-800 text-white"
                  : "border border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </span>
            <div>
              <p className="font-medium">{step.title}</p>
              <p className="text-sm text-[var(--muted)]">{step.body}</p>
              {!step.done && step.href !== "/" ? (
                <Link
                  href={step.href}
                  className="mt-1 inline-block text-sm text-[var(--accent)] hover:underline"
                >
                  {step.cta} →
                </Link>
              ) : null}
              {!step.done && step.href === "/" ? (
                <p className="mt-1 text-sm text-[var(--accent)]">
                  Tap + Transaction above when you’re ready.
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
