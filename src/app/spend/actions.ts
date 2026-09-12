"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { accounts, buckets, transactions } from "@/db/schema";
import { dollarsToCents, todayISO } from "@/lib/money";
import { requireSession } from "@/lib/session";

export async function createIncome(formData: FormData) {
  const { scoped } = await requireSession();
  const accountId = String(formData.get("accountId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const date = String(formData.get("date") ?? todayISO());
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const merchant = String(formData.get("merchant") ?? "").trim() || null;

  if (amount <= 0) throw new Error("Amount must be positive");
  await scoped.requireById(accounts, accountId, "Account");

  await scoped.insert(transactions, {
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
  const { scoped } = await requireSession();
  const accountId = String(formData.get("accountId") ?? "");
  const bucketId = String(formData.get("bucketId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const date = String(formData.get("date") ?? todayISO());
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const merchant = String(formData.get("merchant") ?? "").trim() || null;

  if (amount <= 0) return { error: "Amount must be positive" };
  if (!bucketId) return { error: "Bucket is required" };
  try {
    await scoped.requireById(buckets, bucketId, "Bucket");
    await scoped.requireById(accounts, accountId, "Account");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid account or bucket" };
  }

  await scoped.insert(transactions, {
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

export async function createTransfer(formData: FormData) {
  const { scoped } = await requireSession();
  const fromAccountId = String(formData.get("fromAccountId") ?? "");
  const toAccountId = String(formData.get("toAccountId") ?? "");
  const amount = dollarsToCents(String(formData.get("amount") ?? "0"));
  const date = String(formData.get("date") ?? todayISO());
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (amount <= 0) throw new Error("Amount must be positive");
  if (fromAccountId === toAccountId) {
    throw new Error("Pick two different accounts");
  }
  await scoped.requireById(accounts, fromAccountId, "Account");
  await scoped.requireById(accounts, toAccountId, "Account");

  const groupId = randomUUID();

  await scoped.insert(transactions, [
    {
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
  const { db, householdId, scoped } = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Not found");

  const tx = await scoped.requireById(transactions, id, "Transaction");

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
    await scoped.deleteById(transactions, id, "Transaction");
  }

  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/accounts");
}
