"use server";

import { revalidatePath } from "next/cache";
import { buckets, plannedExpenses } from "@/db/schema";
import { dollarsToCents, todayISO } from "@/lib/money";
import { requireSession } from "@/lib/session";

export async function createPlannedExpense(formData: FormData) {
  const { scoped } = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const bucketId = String(formData.get("bucketId") ?? "");
  const amountCents = dollarsToCents(String(formData.get("amount") ?? "0"));
  const dueDate = String(formData.get("dueDate") ?? todayISO());
  const recurrence = String(formData.get("recurrence") ?? "once");
  const priority = Number(formData.get("priority") ?? 0) || 0;

  if (!name) throw new Error("Name required");
  if (!bucketId) throw new Error("Bucket required");
  if (amountCents <= 0) throw new Error("Amount must be positive");

  await scoped.requireById(buckets, bucketId, "Bucket");

  await scoped.insert(plannedExpenses, {
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
  const { scoped } = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Not found");

  await scoped.deleteById(plannedExpenses, id, "Planned expense");

  revalidatePath("/");
  revalidatePath("/plan");
}
