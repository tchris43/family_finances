import { eq } from "drizzle-orm";
import { AddGoalForm } from "@/components/add-goal-form";
import { AppNav } from "@/components/app-nav";
import { GoalCard } from "@/components/goal-card";
import { buckets } from "@/db/schema";
import { listGoalsWithStats } from "@/lib/goals";
import { getAvailableToAssignCents } from "@/lib/ledger";
import { currentMonthKey, formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

export default async function GoalsPage() {
  const { householdId, db } = await requireSession();
  const available = await getAvailableToAssignCents(db, householdId);
  const monthKey = currentMonthKey();
  const rows = await listGoalsWithStats(db, householdId, monthKey);
  const bucketList = await db
    .select({ id: buckets.id, name: buckets.name })
    .from(buckets)
    .where(eq(buckets.householdId, householdId));

  const thisMonthTotal = rows.reduce(
    (sum, row) => sum + row.stats.thisMonthCents,
    0,
  );

  return (
    <>
      <AppNav availableCents={available} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="font-serif text-3xl tracking-tight">Goals</h1>
        <p className="mt-2 text-[var(--muted)]">
          Longer-term targets. Fund from Available, or transfer freely to other
          goals or buckets. Spends never move goals.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-white/60 p-5">
            <p className="text-sm text-[var(--muted)]">Available to Assign</p>
            <p className="mt-1 font-serif text-3xl tabular-nums">
              {formatCents(available)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-white/60 p-5">
            <p className="text-sm text-[var(--muted)]">
              Contributed this month ({monthKey})
            </p>
            <p className="mt-1 font-serif text-3xl tabular-nums">
              {formatCents(thisMonthTotal)}
            </p>
          </div>
        </div>

        <ul className="mt-10 grid gap-4">
          {rows.length === 0 ? (
            <li className="text-sm text-[var(--muted)]">
              No goals yet — add House, Car, Emergency Fund, etc. below.
            </li>
          ) : (
            rows.map(({ goal, stats }) => (
              <GoalCard
                key={goal.id}
                goalId={goal.id}
                name={goal.name}
                targetCents={goal.targetCents}
                targetDate={goal.targetDate}
                priority={goal.priority}
                currentCents={stats.currentCents}
                remainingCents={stats.remainingCents}
                progressRatio={stats.progressRatio}
                suggestedMonthlyCents={stats.suggestedMonthlyCents}
                onTrack={stats.onTrack}
                estimatedCompletion={stats.estimatedCompletion}
                monthKey={monthKey}
                thisMonthCents={stats.thisMonthCents}
                otherGoals={rows
                  .filter((r) => r.goal.id !== goal.id)
                  .map((r) => ({ id: r.goal.id, name: r.goal.name }))}
                buckets={bucketList}
              />
            ))
          )}
        </ul>

        <section className="mt-10">
          <AddGoalForm />
        </section>
      </main>
    </>
  );
}
