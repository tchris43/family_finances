"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assignments, buckets } from "@/db/schema";
import { dollarsToCents, currentMonthKey } from "@/lib/money";
import { requireSession } from "@/lib/session";

export async function assignToBucket(formData: FormData) {
  const { db, householdId } = await requireSession();
  const bucketId = String(formData.get("bucketId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const monthKey = String(formData.get("monthKey") ?? currentMonthKey());

  if (amount === 0) throw new Error("Amount required");
  if (!bucketId) throw new Error("Bucket required");

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(
      and(eq(buckets.id, bucketId), eq(buckets.householdId, householdId)),
    )
    .limit(1);
  if (!bucket) throw new Error("Bucket not found");

  await db.insert(assignments).values({
    householdId,
    bucketId,
    goalId: null,
    amountCents: amount,
    monthKey,
  });

  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/goals");
}

export async function createBucket(formData: FormData) {
  const { db, householdId } = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  await db.insert(buckets).values({ householdId, name });
  revalidatePath("/plan");
}
