import { asc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { assignments, goals } from "@/db/schema";

export type GoalStats = {
  currentCents: number;
  remainingCents: number;
  progressRatio: number;
  suggestedMonthlyCents: number | null;
  monthsRemaining: number | null;
  onTrack: boolean | null;
  estimatedCompletion: string | null;
};

/** Goal progress = sum of assigns to that goal (spends never move goals). */
export async function getGoalCurrentCents(
  db: Db,
  goalId: string,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${assignments.amountCents}), 0)`,
    })
    .from(assignments)
    .where(eq(assignments.goalId, goalId));
  return Number(row?.total ?? 0);
}

export function monthsBetween(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  return Math.max(years * 12 + months, 0);
}

export async function getGoalStats(
  db: Db,
  goal: {
    id: string;
    targetCents: number;
    targetDate: string | null;
    createdAt: Date;
  },
): Promise<GoalStats> {
  const currentCents = await getGoalCurrentCents(db, goal.id);
  const remainingCents = Math.max(goal.targetCents - currentCents, 0);
  const progressRatio =
    goal.targetCents > 0
      ? Math.min(currentCents / goal.targetCents, 1)
      : 0;

  if (!goal.targetDate) {
    return {
      currentCents,
      remainingCents,
      progressRatio,
      suggestedMonthlyCents: null,
      monthsRemaining: null,
      onTrack: null,
      estimatedCompletion: null,
    };
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const target = new Date(goal.targetDate + "T12:00:00");
  const monthsRemaining = Math.max(monthsBetween(today, target), 1);

  const suggestedMonthlyCents = Math.ceil(remainingCents / monthsRemaining);

  const created = new Date(goal.createdAt);
  created.setHours(12, 0, 0, 0);
  const monthsElapsed = Math.max(monthsBetween(created, today), 1);
  const avgMonthly = currentCents / monthsElapsed;
  const projectedCents = currentCents + avgMonthly * monthsRemaining;
  const onTrack =
    remainingCents === 0 ? true : projectedCents >= goal.targetCents * 0.98;

  let estimatedCompletion: string | null = null;
  if (remainingCents === 0) {
    estimatedCompletion = "Reached";
  } else if (avgMonthly > 0) {
    const monthsNeeded = Math.ceil(remainingCents / avgMonthly);
    const est = new Date(today);
    est.setMonth(est.getMonth() + monthsNeeded);
    estimatedCompletion = `${est.getFullYear()}-${String(est.getMonth() + 1).padStart(2, "0")}`;
  }

  return {
    currentCents,
    remainingCents,
    progressRatio,
    suggestedMonthlyCents,
    monthsRemaining,
    onTrack,
    estimatedCompletion,
  };
}

export async function listGoalsWithStats(db: Db, householdId: string) {
  const list = await db
    .select()
    .from(goals)
    .where(eq(goals.householdId, householdId))
    .orderBy(asc(goals.priority), asc(goals.name));

  return Promise.all(
    list.map(async (goal) => ({
      goal,
      stats: await getGoalStats(db, goal),
    })),
  );
}
