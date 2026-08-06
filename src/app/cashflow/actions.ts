"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { buckets, cashflowLines, goals } from "@/db/schema";
import { getGoalStats } from "@/lib/goals";
import { dollarsToCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

function revalidateCashflow() {
  revalidatePath("/cashflow");
}

export async function addCashflowPaycheck(formData: FormData) {
  const { db, householdId } = await requireSession();
  const label = String(formData.get("label") ?? "").trim() || "Paycheck";
  const amountCents = dollarsToCents(String(formData.get("amount") ?? "0"));
  if (amountCents <= 0) throw new Error("Amount must be positive");

  const existing = await db
    .select({ sortOrder: cashflowLines.sortOrder })
    .from(cashflowLines)
    .where(
      and(
        eq(cashflowLines.householdId, householdId),
        eq(cashflowLines.kind, "paycheck"),
      ),
    );
  const nextOrder =
    existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

  await db.insert(cashflowLines).values({
    householdId,
    kind: "paycheck",
    label,
    amountCents,
    sortOrder: nextOrder,
  });
  revalidateCashflow();
}

export async function addCashflowExpense(formData: FormData) {
  const { db, householdId } = await requireSession();
  const bucketId = String(formData.get("bucketId") ?? "").trim() || null;
  let label = String(formData.get("label") ?? "").trim();
  const amountCents = dollarsToCents(String(formData.get("amount") ?? "0"));
  if (amountCents <= 0) throw new Error("Amount must be positive");

  if (bucketId) {
    const [bucket] = await db
      .select()
      .from(buckets)
      .where(
        and(eq(buckets.id, bucketId), eq(buckets.householdId, householdId)),
      )
      .limit(1);
    if (!bucket) throw new Error("Bucket not found");
    if (!label) label = bucket.name;
  }
  if (!label) throw new Error("Label or bucket required");

  const existing = await db
    .select({ sortOrder: cashflowLines.sortOrder })
    .from(cashflowLines)
    .where(
      and(
        eq(cashflowLines.householdId, householdId),
        eq(cashflowLines.kind, "expense"),
      ),
    );
  const nextOrder =
    existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

  await db.insert(cashflowLines).values({
    householdId,
    kind: "expense",
    label,
    amountCents,
    bucketId,
    sortOrder: nextOrder,
  });
  revalidateCashflow();
}

/** Add any goals not already on the cashflow as monthly contribution lines. */
export async function pullGoalsIntoCashflow() {
  const { db, householdId } = await requireSession();

  const [goalList, existingGoalLines] = await Promise.all([
    db
      .select()
      .from(goals)
      .where(eq(goals.householdId, householdId))
      .orderBy(asc(goals.priority), asc(goals.name)),
    db
      .select()
      .from(cashflowLines)
      .where(
        and(
          eq(cashflowLines.householdId, householdId),
          eq(cashflowLines.kind, "goal"),
        ),
      ),
  ]);

  const already = new Set(
    existingGoalLines.map((l) => l.goalId).filter(Boolean) as string[],
  );
  let nextOrder =
    existingGoalLines.reduce((max, row) => Math.max(max, row.sortOrder), -1) +
    1;

  for (const goal of goalList) {
    if (already.has(goal.id)) continue;
    const stats = await getGoalStats(db, goal);
    const monthly =
      stats.suggestedMonthlyCents ??
      (stats.remainingCents > 0
        ? Math.ceil(stats.remainingCents / 12)
        : 0);
    if (monthly <= 0) continue;

    await db.insert(cashflowLines).values({
      householdId,
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

export async function updateCashflowLine(formData: FormData) {
  const { db, householdId } = await requireSession();
  const id = String(formData.get("id") ?? "");
  const amountCents = dollarsToCents(String(formData.get("amount") ?? "0"));
  const label = String(formData.get("label") ?? "").trim();

  if (!id) throw new Error("Line required");
  if (amountCents <= 0) throw new Error("Amount must be positive");

  const [line] = await db
    .select()
    .from(cashflowLines)
    .where(
      and(eq(cashflowLines.id, id), eq(cashflowLines.householdId, householdId)),
    )
    .limit(1);
  if (!line) throw new Error("Line not found");

  await db
    .update(cashflowLines)
    .set({
      amountCents,
      ...(label ? { label } : {}),
    })
    .where(eq(cashflowLines.id, id));

  revalidateCashflow();
}

export async function deleteCashflowLine(formData: FormData) {
  const { db, householdId } = await requireSession();
  const id = String(formData.get("id") ?? "");

  const [line] = await db
    .select()
    .from(cashflowLines)
    .where(
      and(eq(cashflowLines.id, id), eq(cashflowLines.householdId, householdId)),
    )
    .limit(1);
  if (!line) throw new Error("Line not found");

  await db.delete(cashflowLines).where(eq(cashflowLines.id, id));
  revalidateCashflow();
}
