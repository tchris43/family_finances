"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { accounts, transactions } from "@/db/schema";
import { dollarsToCents, todayISO } from "@/lib/money";
import { requireSession } from "@/lib/session";

export async function createAccount(formData: FormData) {
  const { db, householdId } = await requireSession();

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

  const existing = await db
    .select()
    .from(accounts)
    .where(eq(accounts.householdId, householdId));

  await db.insert(accounts).values({
    householdId,
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
  const { db, householdId } = await requireSession();
  const accountId = String(formData.get("accountId") ?? "");

  const [account] = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.id, accountId), eq(accounts.householdId, householdId)),
    )
    .limit(1);
  if (!account) throw new Error("Account not found");

  await db
    .update(accounts)
    .set({ isMain: false })
    .where(eq(accounts.householdId, householdId));
  await db
    .update(accounts)
    .set({ isMain: true })
    .where(eq(accounts.id, accountId));

  revalidatePath("/");
  revalidatePath("/accounts");
}

/** Manual balance adjust: writes an adjustment transaction so history stays intact. */
export async function adjustAccountBalance(formData: FormData) {
  const { db, householdId } = await requireSession();
  const accountId = String(formData.get("accountId") ?? "");
  const newBalance = dollarsToCents(String(formData.get("newBalance") ?? "0"));
  const date = String(formData.get("date") ?? todayISO());

  const [account] = await db
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.id, accountId), eq(accounts.householdId, householdId)),
    )
    .limit(1);
  if (!account) throw new Error("Account not found");

  const { getAccountBalanceCents } = await import("@/lib/ledger");
  const current = await getAccountBalanceCents(db, accountId);
  const delta = newBalance - current;
  if (delta === 0) return;

  await db.insert(transactions).values({
    householdId,
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
