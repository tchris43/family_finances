"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assignments, buckets, plannedExpenses, transactions } from "@/db/schema";
import { getBucketMonthStats } from "@/lib/ledger";
import { dollarsToCents, currentMonthKey } from "@/lib/money";
import { requireSession } from "@/lib/session";

function revalidateMoneyPaths() {
  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/goals");
}

export async function assignToBucket(formData: FormData) {
  const { db, householdId } = await requireSession();
  const bucketId = String(formData.get("bucketId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const monthKey = String(formData.get("monthKey") ?? currentMonthKey());

  if (amount <= 0) throw new Error("Amount must be positive");
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

  revalidateMoneyPaths();
}

/** Move assigned money bucket → bucket. Does not change Available. */
export async function transferBucketToBucket(
  formData: FormData,
): Promise<{ error?: string }> {
  const { db, householdId } = await requireSession();
  const fromBucketId = String(formData.get("fromBucketId") ?? "");
  const toBucketId = String(formData.get("toBucketId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const monthKey = String(formData.get("monthKey") ?? currentMonthKey());

  if (amount <= 0) return { error: "Amount must be positive" };
  if (!fromBucketId || !toBucketId) return { error: "Pick two buckets" };
  if (fromBucketId === toBucketId) {
    return { error: "Pick two different buckets" };
  }

  for (const id of [fromBucketId, toBucketId]) {
    const [bucket] = await db
      .select()
      .from(buckets)
      .where(and(eq(buckets.id, id), eq(buckets.householdId, householdId)))
      .limit(1);
    if (!bucket) return { error: "Bucket not found" };
  }

  const { remainingCents } = await getBucketMonthStats(
    db,
    fromBucketId,
    monthKey,
  );
  if (amount > remainingCents) {
    return { error: "Not enough remaining in the source bucket" };
  }

  await db.insert(assignments).values([
    {
      householdId,
      bucketId: fromBucketId,
      goalId: null,
      amountCents: -amount,
      monthKey,
    },
    {
      householdId,
      bucketId: toBucketId,
      goalId: null,
      amountCents: amount,
      monthKey,
    },
  ]);

  revalidateMoneyPaths();
  return {};
}

/** Record personal money used to cover over-assignment. Raises Available. */
export async function settlePersonalDebt(
  formData: FormData,
): Promise<{ error?: string }> {
  const { db, householdId } = await requireSession();
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const monthKey = String(formData.get("monthKey") ?? currentMonthKey());

  if (amount <= 0) return { error: "Amount must be positive" };

  await db.insert(assignments).values({
    householdId,
    bucketId: null,
    goalId: null,
    amountCents: -amount,
    monthKey,
  });

  revalidateMoneyPaths();
  return {};
}

/** Move assigned money from a bucket to settle personal debt. Raises Available. */
export async function transferBucketToPersonalDebt(
  formData: FormData,
): Promise<{ error?: string }> {
  const { db, householdId } = await requireSession();
  const fromBucketId = String(formData.get("fromBucketId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const monthKey = String(formData.get("monthKey") ?? currentMonthKey());

  if (amount <= 0) return { error: "Amount must be positive" };
  if (!fromBucketId) return { error: "Bucket required" };

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(
      and(eq(buckets.id, fromBucketId), eq(buckets.householdId, householdId)),
    )
    .limit(1);
  if (!bucket) return { error: "Bucket not found" };

  const { remainingCents } = await getBucketMonthStats(
    db,
    fromBucketId,
    monthKey,
  );
  if (amount > remainingCents) {
    return { error: "Not enough remaining in the source bucket" };
  }

  await db.insert(assignments).values({
    householdId,
    bucketId: fromBucketId,
    goalId: null,
    amountCents: -amount,
    monthKey,
  });

  revalidateMoneyPaths();
  return {};
}

export async function createBucket(formData: FormData) {
  const { db, householdId } = await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  const fundKindRaw = String(formData.get("fundKind") ?? "necessary");
  const fundKind =
    fundKindRaw === "unnecessary" ? "unnecessary" : "necessary";
  if (!name) throw new Error("Name is required");

  const existing = await db
    .select({ sortOrder: buckets.sortOrder })
    .from(buckets)
    .where(
      and(eq(buckets.householdId, householdId), eq(buckets.fundKind, fundKind)),
    );
  const nextOrder =
    existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

  await db.insert(buckets).values({
    householdId,
    name,
    fundKind,
    sortOrder: nextOrder,
  });
  revalidatePath("/plan");
  revalidatePath("/");
}

/**
 * Persist Necessary / Unnecessary lists and their order.
 * orderedIds must include every household bucket exactly once across both lists.
 */
export async function saveBucketLayout(formData: FormData): Promise<{
  error?: string;
}> {
  const { db, householdId } = await requireSession();
  const necessaryIds = String(formData.get("necessaryIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const unnecessaryIds = String(formData.get("unnecessaryIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allIds = [...necessaryIds, ...unnecessaryIds];
  if (new Set(allIds).size !== allIds.length) {
    return { error: "Duplicate bucket in layout" };
  }

  const householdBuckets = await db
    .select()
    .from(buckets)
    .where(eq(buckets.householdId, householdId));

  if (allIds.length !== householdBuckets.length) {
    return { error: "Layout is out of date — refresh and try again" };
  }

  const owned = new Set(householdBuckets.map((b) => b.id));
  if (allIds.some((id) => !owned.has(id))) {
    return { error: "Unknown bucket in layout" };
  }

  await Promise.all([
    ...necessaryIds.map((id, index) =>
      db
        .update(buckets)
        .set({ fundKind: "necessary", sortOrder: index })
        .where(and(eq(buckets.id, id), eq(buckets.householdId, householdId))),
    ),
    ...unnecessaryIds.map((id, index) =>
      db
        .update(buckets)
        .set({ fundKind: "unnecessary", sortOrder: index })
        .where(and(eq(buckets.id, id), eq(buckets.householdId, householdId))),
    ),
  ]);

  revalidatePath("/plan");
  revalidatePath("/");
  return {};
}

/**
 * Delete a bucket. Blocks if any expense transactions still point at it
 * (history stays intact). Removes planned expenses for the bucket; bucket
 * assignments cascade so that money returns to Available.
 */
export async function deleteBucket(
  formData: FormData,
): Promise<{ error?: string }> {
  const { db, householdId } = await requireSession();
  const bucketId = String(formData.get("bucketId") ?? "");
  if (!bucketId) return { error: "Bucket required" };

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(
      and(eq(buckets.id, bucketId), eq(buckets.householdId, householdId)),
    )
    .limit(1);
  if (!bucket) return { error: "Bucket not found" };

  const [expenseRow] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.bucketId, bucketId),
        eq(transactions.type, "expense"),
      ),
    );
  if (Number(expenseRow?.count ?? 0) > 0) {
    return {
      error:
        "This bucket still has expenses. Delete or move those transactions first.",
    };
  }

  await db
    .delete(plannedExpenses)
    .where(
      and(
        eq(plannedExpenses.householdId, householdId),
        eq(plannedExpenses.bucketId, bucketId),
      ),
    );

  await db
    .delete(buckets)
    .where(
      and(eq(buckets.id, bucketId), eq(buckets.householdId, householdId)),
    );

  revalidateMoneyPaths();
  return {};
}
