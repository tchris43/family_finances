"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assignments, goals } from "@/db/schema";
import { currentMonthKey, dollarsToCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

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

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath("/plan");
}

export async function assignToGoal(formData: FormData) {
  const { db, householdId } = await requireSession();
  const goalId = String(formData.get("goalId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const monthKey = String(formData.get("monthKey") ?? currentMonthKey());

  if (!goalId) throw new Error("Goal required");
  if (amount === 0) throw new Error("Amount required");

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

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath("/plan");
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

  revalidatePath("/");
  revalidatePath("/goals");
  revalidatePath("/plan");
}
