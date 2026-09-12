"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { accounts, transactions } from "@/db/schema";
import { getAccountBalanceCents } from "@/lib/ledger";
import { dollarsToCents, todayISO } from "@/lib/money";
import { requireSession } from "@/lib/session";

export async function createAccount(formData: FormData) {
  const { db, householdId, scoped } = await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "checking");
  const institution = String(formData.get("institution") ?? "").trim() || null;
  const starting = dollarsToCents(String(formData.get("startingBalance") ?? "0"));
  const makeMain = formData.get("isMain") === "on";

  if (!name) throw new Error("Name is required");

  if (makeMain) {
    await db
      .update(accounts)
      .set({ isMain: false })
      .where(eq(accounts.householdId, householdId));
  }

  const existing = await scoped.select(accounts);

  await scoped.insert(accounts, {
    name,
    type,
    institution,
    startingBalanceCents: starting,
    isMain: makeMain || existing.length === 0,
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/plan");
}

export async function setMainAccount(formData: FormData) {
  const { db, householdId, scoped } = await requireSession();
  const accountId = String(formData.get("accountId") ?? "");

  await scoped.requireById(accounts, accountId, "Account");

  await db
    .update(accounts)
    .set({ isMain: false })
    .where(eq(accounts.householdId, householdId));
  await scoped.updateById(accounts, accountId, { isMain: true }, "Account");

  revalidatePath("/");
  revalidatePath("/accounts");
}

/** Manual balance adjust: writes an adjustment transaction so history stays intact. */
export async function adjustAccountBalance(formData: FormData) {
  const { db, householdId, scoped } = await requireSession();
  const accountId = String(formData.get("accountId") ?? "");
  const newBalance = dollarsToCents(String(formData.get("newBalance") ?? "0"));
  const date = String(formData.get("date") ?? todayISO());

  await scoped.requireById(accounts, accountId, "Account");

  const current = await getAccountBalanceCents(db, householdId, accountId);
  const delta = newBalance - current;
  if (delta === 0) return;

  await scoped.insert(transactions, {
    accountId,
    bucketId: null,
    type: "adjustment",
    amountCents: delta,
    date,
    merchant: null,
    notes: "Balance adjustment",
    transferGroupId: null,
  });

  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/plan");
  revalidatePath("/goals");
}
