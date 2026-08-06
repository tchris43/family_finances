import { asc, eq } from "drizzle-orm";
import { AppNav } from "@/components/app-nav";
import {
  CashflowExpenses,
  CashflowGoals,
  CashflowPaychecks,
} from "@/components/cashflow-sections";
import { buckets, cashflowLines, goals } from "@/db/schema";
import { getAvailableToAssignCents } from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

export default async function CashflowPage() {
  const { householdId, db } = await requireSession();
  const available = await getAvailableToAssignCents(db, householdId);

  const [lines, bucketList, goalList] = await Promise.all([
    db
      .select()
      .from(cashflowLines)
      .where(eq(cashflowLines.householdId, householdId))
      .orderBy(asc(cashflowLines.sortOrder), asc(cashflowLines.createdAt)),
    db
      .select({
        id: buckets.id,
        name: buckets.name,
        fundKind: buckets.fundKind,
      })
      .from(buckets)
      .where(eq(buckets.householdId, householdId))
      .orderBy(asc(buckets.fundKind), asc(buckets.sortOrder), asc(buckets.name)),
    db.select().from(goals).where(eq(goals.householdId, householdId)),
  ]);

  const paychecks = lines.filter((l) => l.kind === "paycheck");
  const goalLines = lines.filter((l) => l.kind === "goal");
  const expenses = lines.filter((l) => l.kind === "expense");

  const incomeTotal = paychecks.reduce((s, l) => s + l.amountCents, 0);
  const goalsTotal = goalLines.reduce((s, l) => s + l.amountCents, 0);
  const expensesTotal = expenses.reduce((s, l) => s + l.amountCents, 0);
  const leftover = incomeTotal - goalsTotal - expensesTotal;

  const linkedGoalIds = new Set(
    goalLines.map((l) => l.goalId).filter(Boolean) as string[],
  );
  const hasGoalsToPull = goalList.some((g) => !linkedGoalIds.has(g.id));

  return (
    <>
      <AppNav availableCents={available} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="font-serif text-3xl tracking-tight">Cashflow</h1>
        <p className="mt-2 text-[var(--muted)]">
          A simple monthly picture: what comes in, what goes to goals, what you
          plan to spend — and whether you need more income to stay on track.
        </p>

        <section className="mt-8 rounded-lg border border-[var(--border)] bg-white/60 p-5">
          <p className="text-sm text-[var(--muted)]">Monthly leftover</p>
          <p
            className={`mt-1 font-serif text-3xl tabular-nums ${
              leftover < 0 ? "text-amber-900" : ""
            }`}
          >
            {formatCents(leftover)}
          </p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[var(--muted)]">Income</dt>
              <dd className="tabular-nums font-medium">
                {formatCents(incomeTotal)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Goals</dt>
              <dd className="tabular-nums font-medium">
                −{formatCents(goalsTotal)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Expenses</dt>
              <dd className="tabular-nums font-medium">
                −{formatCents(expensesTotal)}
              </dd>
            </div>
          </dl>
          {leftover < 0 ? (
            <p className="mt-4 text-sm text-amber-900">
              Short {formatCents(-leftover)} — cut expenses, pause a goal line,
              or add income (extra shifts / another paycheck).
            </p>
          ) : leftover === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              Income covers goals and expenses exactly.
            </p>
          ) : (
            <p className="mt-4 text-sm text-teal-900">
              {formatCents(leftover)} left after goals and expenses — buffer or
              extra savings.
            </p>
          )}
        </section>

        <div className="mt-12 space-y-12">
          <CashflowPaychecks
            lines={paychecks.map((l) => ({
              id: l.id,
              label: l.label,
              amountCents: l.amountCents,
            }))}
          />
          <CashflowGoals
            lines={goalLines.map((l) => ({
              id: l.id,
              label: l.label,
              amountCents: l.amountCents,
            }))}
            hasGoalsToPull={hasGoalsToPull}
          />
          <CashflowExpenses
            lines={expenses.map((l) => ({
              id: l.id,
              label: l.label,
              amountCents: l.amountCents,
            }))}
            buckets={bucketList}
          />
        </div>
      </main>
    </>
  );
}
