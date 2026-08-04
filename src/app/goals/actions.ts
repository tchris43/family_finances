"use server";

import { and, eq } from "drizzle-orm";
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
  const { db, householdId } = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const targetCents = dollarsToCents(String(formData.get("amount") ?? "0"));
  const targetDate = String(formData.get("targetDate") ?? "").trim() || null;
  const priority = Number(formData.get("priority") ?? 0) || 0;

  if (!name) throw new Error("Name required");
  if (targetCents <= 0) throw new Error("Target must be positive");

  await db.insert(goals).values({
    householdId,
    name,
    targetCents,
    targetDate,
    priority,
  });

  revalidateMoneyPaths();
}

export async function assignToGoal(formData: FormData) {
  const { db, householdId } = await requireSession();
  const goalId = String(formData.get("goalId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const monthKey = String(formData.get("monthKey") ?? currentMonthKey());

  if (!goalId) throw new Error("Goal required");
  if (amount <= 0) throw new Error("Amount must be positive");

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.householdId, householdId)))
    .limit(1);
  if (!goal) throw new Error("Goal not found");

  await db.insert(assignments).values({
    householdId,
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
  const { db, householdId } = await requireSession();
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

  const [fromGoal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, fromGoalId), eq(goals.householdId, householdId)))
    .limit(1);
  if (!fromGoal) return { error: "Goal not found" };

  const current = await getGoalCurrentCents(db, fromGoalId);
  if (amount > current) {
    return { error: "Not enough in this goal" };
  }

  if (toKind === "goal") {
    const [toGoal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, toId), eq(goals.householdId, householdId)))
      .limit(1);
    if (!toGoal) return { error: "Destination goal not found" };

    await db.insert(assignments).values([
      {
        householdId,
        bucketId: null,
        goalId: fromGoalId,
        amountCents: -amount,
        monthKey,
      },
      {
        householdId,
        bucketId: null,
        goalId: toId,
        amountCents: amount,
        monthKey,
      },
    ]);
  } else {
    const [toBucket] = await db
      .select()
      .from(buckets)
      .where(and(eq(buckets.id, toId), eq(buckets.householdId, householdId)))
      .limit(1);
    if (!toBucket) return { error: "Destination bucket not found" };

    await db.insert(assignments).values([
      {
        householdId,
        bucketId: null,
        goalId: fromGoalId,
        amountCents: -amount,
        monthKey,
      },
      {
        householdId,
        bucketId: toId,
        goalId: null,
        amountCents: amount,
        monthKey,
      },
    ]);
  }

  revalidateMoneyPaths();
  return {};
}

export async function deleteGoal(formData: FormData) {
  const { db, householdId } = await requireSession();
  const goalId = String(formData.get("goalId") ?? "");

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.householdId, householdId)))
    .limit(1);
  if (!goal) throw new Error("Goal not found");

  await db.delete(goals).where(eq(goals.id, goalId));

  revalidateMoneyPaths();
}
