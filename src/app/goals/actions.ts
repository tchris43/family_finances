"use server";

import { revalidatePath } from "next/cache";
import { assignments, buckets, goals } from "@/db/schema";
import { getGoalCurrentCents } from "@/lib/goals";
import { currentMonthKey, dollarsToCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

function revalidateMoneyPaths() {
  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath("/plan");
}

export async function createGoal(formData: FormData) {
  const { scoped } = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const targetCents = dollarsToCents(String(formData.get("amount") ?? "0"));
  const targetDate = String(formData.get("targetDate") ?? "").trim() || null;
  const priority = Number(formData.get("priority") ?? 0) || 0;

  if (!name) throw new Error("Name required");
  if (targetCents <= 0) throw new Error("Target must be positive");

  await scoped.insert(goals, { name, targetCents, targetDate, priority });

  revalidateMoneyPaths();
}

export async function assignToGoal(formData: FormData) {
  const { scoped } = await requireSession();
  const goalId = String(formData.get("goalId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const monthKey = String(formData.get("monthKey") ?? currentMonthKey());

  if (!goalId) throw new Error("Goal required");
  if (amount <= 0) throw new Error("Amount must be positive");

  await scoped.requireById(goals, goalId, "Goal");

  await scoped.insert(assignments, {
    bucketId: null,
    goalId,
    amountCents: amount,
    monthKey,
  });

  revalidateMoneyPaths();
}

/**
 * Move money out of a goal into another goal or a bucket.
 * Does not change Available.
 */
export async function transferFromGoal(
  formData: FormData,
): Promise<{ error?: string }> {
  const { db, householdId, scoped } = await requireSession();
  const fromGoalId = String(formData.get("fromGoalId") ?? "");
  const toKind = String(formData.get("toKind") ?? ""); // goal | bucket
  const toId = String(formData.get("toId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const monthKey = String(formData.get("monthKey") ?? currentMonthKey());

  if (amount <= 0) return { error: "Amount must be positive" };
  if (!fromGoalId || !toId) return { error: "Pick a source and destination" };
  if (toKind !== "goal" && toKind !== "bucket") {
    return { error: "Destination must be a goal or bucket" };
  }
  if (toKind === "goal" && fromGoalId === toId) {
    return { error: "Pick a different goal" };
  }

  const fromGoal = await scoped.findById(goals, fromGoalId);
  if (!fromGoal) return { error: "Goal not found" };

  const current = await getGoalCurrentCents(db, householdId, fromGoalId);
  if (amount > current) {
    return { error: "Not enough in this goal" };
  }

  if (toKind === "goal") {
    if (!(await scoped.findById(goals, toId))) {
      return { error: "Destination goal not found" };
    }

    await scoped.insert(assignments, [
      { bucketId: null, goalId: fromGoalId, amountCents: -amount, monthKey },
      { bucketId: null, goalId: toId, amountCents: amount, monthKey },
    ]);
  } else {
    if (!(await scoped.findById(buckets, toId))) {
      return { error: "Destination bucket not found" };
    }

    await scoped.insert(assignments, [
      { bucketId: null, goalId: fromGoalId, amountCents: -amount, monthKey },
      { bucketId: toId, goalId: null, amountCents: amount, monthKey },
    ]);
  }

  revalidateMoneyPaths();
  return {};
}

export async function updateGoal(formData: FormData) {
  const { scoped } = await requireSession();
  const goalId = String(formData.get("goalId") ?? "");
  const targetCents = dollarsToCents(String(formData.get("amount") ?? "0"));
  const priority = Number(formData.get("priority") ?? 0);
  const targetDateRaw = String(formData.get("targetDate") ?? "").trim();
  const targetDate = targetDateRaw || null;

  if (!goalId) throw new Error("Goal required");
  if (targetCents <= 0) throw new Error("Target must be positive");
  if (!Number.isFinite(priority)) throw new Error("Priority must be a number");

  await scoped.updateById(
    goals,
    goalId,
    { targetCents, priority: Math.trunc(priority), targetDate },
    "Goal",
  );

  revalidateMoneyPaths();
}

export async function deleteGoal(formData: FormData) {
  const { scoped } = await requireSession();
  const goalId = String(formData.get("goalId") ?? "");
  if (!goalId) throw new Error("Goal required");

  await scoped.deleteById(goals, goalId, "Goal");

  revalidateMoneyPaths();
}
