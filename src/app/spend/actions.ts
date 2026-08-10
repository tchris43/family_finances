"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { accounts, buckets, transactions } from "@/db/schema";
import { dollarsToCents, todayISO } from "@/lib/money";
import { requireSession } from "@/lib/session";

async function assertAccount(householdId: string, accountId: string) {
  const { db } = await requireSession();
  const [account] = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.id, accountId), eq(accounts.householdId, householdId)),
    )
    .limit(1);
  if (!account) throw new Error("Account not found");
  return account;
}

export async function createIncome(formData: FormData) {
  const { db, householdId } = await requireSession();
  const accountId = String(formData.get("accountId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const date = String(formData.get("date") ?? todayISO());
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const merchant = String(formData.get("merchant") ?? "").trim() || null;

  if (amount <= 0) throw new Error("Amount must be positive");
  await assertAccount(householdId, accountId);

  await db.insert(transactions).values({
    householdId,
    accountId,
    bucketId: null,
    type: "income",
    amountCents: amount,
    date,
    merchant,
    notes,
    transferGroupId: null,
  });

  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/accounts");
}

export async function createExpense(
  formData: FormData,
): Promise<{ error?: string }> {
  const { db, householdId } = await requireSession();
  const accountId = String(formData.get("accountId") ?? "");
  const bucketId = String(formData.get("bucketId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const date = String(formData.get("date") ?? todayISO());
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const merchant = String(formData.get("merchant") ?? "").trim() || null;

  if (amount <= 0) return { error: "Amount must be positive" };
  if (!bucketId) return { error: "Bucket is required" };
  try {
    await assertBucket(householdId, bucketId);
    await assertAccount(householdId, accountId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid account or bucket" };
  }

  await db.insert(transactions).values({
    householdId,
    accountId,
    bucketId,
    type: "expense",
    amountCents: -Math.abs(amount),
    date,
    merchant,
    notes,
    transferGroupId: null,
  });

  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/accounts");
  return {};
}

async function assertBucket(householdId: string, bucketId: string) {
  const { db } = await requireSession();
  const [bucket] = await db
    .select()
    .from(buckets)
    .where(
      and(eq(buckets.id, bucketId), eq(buckets.householdId, householdId)),
    )
    .limit(1);
  if (!bucket) throw new Error("Bucket not found");
}

export async function createTransfer(formData: FormData) {
  const { db, householdId } = await requireSession();
  const fromAccountId = String(formData.get("fromAccountId") ?? "");
  const toAccountId = String(formData.get("toAccountId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const date = String(formData.get("date") ?? todayISO());
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (amount <= 0) throw new Error("Amount must be positive");
  if (fromAccountId === toAccountId) {
    throw new Error("Pick two different accounts");
  }
  await assertAccount(householdId, fromAccountId);
  await assertAccount(householdId, toAccountId);

  const groupId = randomUUID();

  await db.insert(transactions).values([
    {
      householdId,
      accountId: fromAccountId,
      bucketId: null,
      type: "transfer",
      amountCents: -Math.abs(amount),
      date,
      merchant: null,
      notes,
      transferGroupId: groupId,
    },
    {
      householdId,
      accountId: toAccountId,
      bucketId: null,
      type: "transfer",
      amountCents: Math.abs(amount),
      date,
      merchant: null,
      notes,
      transferGroupId: groupId,
    },
  ]);

  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/accounts");
}

export async function deleteTransaction(formData: FormData) {
  const { db, householdId } = await requireSession();
  const id = String(formData.get("id") ?? "");

  const [tx] = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.id, id), eq(transactions.householdId, householdId)),
    )
    .limit(1);
  if (!tx) throw new Error("Not found");

  if (tx.transferGroupId) {
    await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.householdId, householdId),
          eq(transactions.transferGroupId, tx.transferGroupId),
        ),
      );
  } else {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/accounts");
}
