import { AppNav } from "@/components/app-nav";
import { AffordabilityCalculator } from "@/components/affordability-calculator";
import { listGoalsWithStats } from "@/lib/goals";
import { getAvailableToAssignCents } from "@/lib/ledger";
import { requireSession } from "@/lib/session";

export default async function DecisionsPage() {
  const { householdId, db } = await requireSession();
  const available = await getAvailableToAssignCents(db, householdId);
  const goalRows = await listGoalsWithStats(db, householdId);

  return (
    <>
      <AppNav availableCents={available} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="font-serif text-3xl tracking-tight">Decisions</h1>
        <p className="mt-2 text-[var(--muted)]">
          Can we afford this? Two answers: cash/Available, and goal impact.
          Nothing here saves a transaction.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          <li>
            <strong className="text-[var(--foreground)]">Cash:</strong> is the
            amount ≤ Available to Assign right now?
          </li>
          <li>
            <strong className="text-[var(--foreground)]">Goals:</strong> if that
            money had gone to each goal at its suggested $/month pace, about how
            many months would the finish date slip? (what-if only)
          </li>
        </ul>

        <AffordabilityCalculator
          availableCents={available}
          goals={goalRows.map(({ goal, stats }) => ({
            id: goal.id,
            name: goal.name,
            targetCents: goal.targetCents,
            targetDate: goal.targetDate,
            currentCents: stats.currentCents,
            estimatedCompletion: stats.estimatedCompletion,
            suggestedMonthlyCents: stats.suggestedMonthlyCents,
          }))}
        />
      </main>
    </>
  );
}
