"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  buckets,
  cashflowGoalExclusions,
  cashflowLines,
  goals,
} from "@/db/schema";
import { getGoalStats } from "@/lib/goals";
import { dollarsToCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

function revalidateCashflow() {
  revalidatePath("/cashflow");
}

function nextSortOrder(rows: { sortOrder: number }[]): number {
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}

export async function addCashflowPaycheck(formData: FormData) {
  const { scoped } = await requireSession();
  const label = String(formData.get("label") ?? "").trim() || "Paycheck";
  const amountCents = dollarsToCents(String(formData.get("amount") ?? "0"));
  if (amountCents <= 0) throw new Error("Amount must be positive");

  const existing = await scoped.select(
    cashflowLines,
    eq(cashflowLines.kind, "paycheck"),
  );

  await scoped.insert(cashflowLines, {
    kind: "paycheck",
    label,
    amountCents,
    sortOrder: nextSortOrder(existing),
  });
  revalidateCashflow();
}

export async function addCashflowExpense(formData: FormData) {
  const { scoped } = await requireSession();
  const bucketId = String(formData.get("bucketId") ?? "").trim() || null;
  let label = String(formData.get("label") ?? "").trim();
  const amountCents = dollarsToCents(String(formData.get("amount") ?? "0"));
  if (amountCents <= 0) throw new Error("Amount must be positive");

  if (bucketId) {
    const bucket = await scoped.requireById(buckets, bucketId, "Bucket");
    if (!label) label = bucket.name;
  }
  if (!label) throw new Error("Label or bucket required");

  const existing = await scoped.select(
    cashflowLines,
    eq(cashflowLines.kind, "expense"),
  );

  await scoped.insert(cashflowLines, {
    kind: "expense",
    label,
    amountCents,
    bucketId,
    sortOrder: nextSortOrder(existing),
  });
  revalidateCashflow();
}

/** Add goals that are not on the forecast and not excluded from it. */
export async function pullGoalsIntoCashflow() {
  const { db, householdId, scoped } = await requireSession();

  const [goalList, existingGoalLines, exclusions] = await Promise.all([
    db
      .select()
      .from(goals)
      .where(eq(goals.householdId, householdId))
      .orderBy(asc(goals.priority), asc(goals.name)),
    scoped.select(cashflowLines, eq(cashflowLines.kind, "goal")),
    scoped.select(cashflowGoalExclusions),
  ]);

  const already = new Set(
    existingGoalLines.map((l) => l.goalId).filter(Boolean) as string[],
  );
  const excluded = new Set(exclusions.map((e) => e.goalId));
  let nextOrder = nextSortOrder(existingGoalLines);

  for (const goal of goalList) {
    if (already.has(goal.id) || excluded.has(goal.id)) continue;
    const stats = await getGoalStats(db, householdId, goal);
    const monthly =
      stats.suggestedMonthlyCents ??
      (stats.remainingCents > 0
        ? Math.ceil(stats.remainingCents / 12)
        : 0);
    if (monthly <= 0) continue;

    await scoped.insert(cashflowLines, {
      kind: "goal",
      label: goal.name,
      amountCents: monthly,
      goalId: goal.id,
      sortOrder: nextOrder,
    });
    nextOrder += 1;
  }

  revalidateCashflow();
}

/** Put an excluded goal back on the forecast. */
export async function restoreGoalToCashflow(formData: FormData) {
  const { db, householdId, scoped } = await requireSession();
  const goalId = String(formData.get("goalId") ?? "");
  if (!goalId) throw new Error("Goal required");

  const goal = await scoped.requireById(goals, goalId, "Goal");

  await db
    .delete(cashflowGoalExclusions)
    .where(
      and(
        eq(cashflowGoalExclusions.householdId, householdId),
        eq(cashflowGoalExclusions.goalId, goalId),
      ),
    );

  const [existing] = await scoped.select(
    cashflowLines,
    and(
      eq(cashflowLines.kind, "goal"),
      eq(cashflowLines.goalId, goalId),
    ),
  );
  if (existing) {
    revalidateCashflow();
    return;
  }

  const stats = await getGoalStats(db, householdId, goal);
  const monthly =
    stats.suggestedMonthlyCents ??
    (stats.remainingCents > 0 ? Math.ceil(stats.remainingCents / 12) : 0);
  if (monthly <= 0) {
    revalidateCashflow();
    return;
  }

  const existingGoalLines = await scoped.select(
    cashflowLines,
    eq(cashflowLines.kind, "goal"),
  );

  await scoped.insert(cashflowLines, {
    kind: "goal",
    label: goal.name,
    amountCents: monthly,
    goalId: goal.id,
    sortOrder: nextSortOrder(existingGoalLines),
  });

  revalidateCashflow();
}

export async function updateCashflowLine(formData: FormData) {
  const { scoped } = await requireSession();
  const id = String(formData.get("id") ?? "");
  const amountCents = dollarsToCents(String(formData.get("amount") ?? "0"));
  const label = String(formData.get("label") ?? "").trim();

  if (!id) throw new Error("Line required");
  if (amountCents <= 0) throw new Error("Amount must be positive");

  await scoped.updateById(
    cashflowLines,
    id,
    { amountCents, ...(label ? { label } : {}) },
    "Line",
  );

  revalidateCashflow();
}

/**
 * Remove a line from the forecast only.
 * For goal lines, the goal itself is unchanged and stays excluded until restored.
 */
export async function deleteCashflowLine(formData: FormData) {
  const { scoped } = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Line required");

  const line = await scoped.requireById(cashflowLines, id, "Line");

  if (line.kind === "goal" && line.goalId) {
    const [existing] = await scoped.select(
      cashflowGoalExclusions,
      eq(cashflowGoalExclusions.goalId, line.goalId),
    );
    if (!existing) {
      await scoped.insert(cashflowGoalExclusions, { goalId: line.goalId });
    }
  }

  await scoped.deleteById(cashflowLines, id, "Line");
  revalidateCashflow();
}
