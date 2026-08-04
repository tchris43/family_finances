"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { buckets, plannedExpenses } from "@/db/schema";
import { dollarsToCents, todayISO } from "@/lib/money";
import { requireSession } from "@/lib/session";

export async function createPlannedExpense(formData: FormData) {
  const { db, householdId } = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const bucketId = String(formData.get("bucketId") ?? "");
  const amountCents = dollarsToCents(String(formData.get("amount") ?? "0"));
  const dueDate = String(formData.get("dueDate") ?? todayISO());
  const recurrence = String(formData.get("recurrence") ?? "once");
  const priority = Number(formData.get("priority") ?? 0) || 0;

  if (!name) throw new Error("Name required");
  if (!bucketId) throw new Error("Bucket required");
  if (amountCents <= 0) throw new Error("Amount must be positive");

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(
      and(eq(buckets.id, bucketId), eq(buckets.householdId, householdId)),
    )
    .limit(1);
  if (!bucket) throw new Error("Bucket not found");

  await db.insert(plannedExpenses).values({
    householdId,
    bucketId,
    name,
    amountCents,
    dueDate,
    recurrence,
    priority,
  });

  revalidatePath("/");
  revalidatePath("/plan");
}

export async function deletePlannedExpense(formData: FormData) {
  const { db, householdId } = await requireSession();
  const id = String(formData.get("id") ?? "");

  const [row] = await db
    .select()
    .from(plannedExpenses)
    .where(
      and(
        eq(plannedExpenses.id, id),
        eq(plannedExpenses.householdId, householdId),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Not found");

  await db.delete(plannedExpenses).where(eq(plannedExpenses.id, id));

  revalidatePath("/");
  revalidatePath("/plan");
}
