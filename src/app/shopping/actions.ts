"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { shoppingItems } from "@/db/schema";
import { requireSession } from "@/lib/session";

function revalidateShopping() {
  revalidatePath("/shopping");
}

export async function addShoppingItem(formData: FormData) {
  const { db, householdId } = await requireSession();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Item required");

  const existing = await db
    .select({ sortOrder: shoppingItems.sortOrder })
    .from(shoppingItems)
    .where(eq(shoppingItems.householdId, householdId));
  const nextOrder =
    existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

  await db.insert(shoppingItems).values({
    householdId,
    label,
    checked: false,
    sortOrder: nextOrder,
  });
  revalidateShopping();
}

export async function toggleShoppingItem(formData: FormData) {
  const { db, householdId } = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Item required");

  const [item] = await db
    .select()
    .from(shoppingItems)
    .where(
      and(eq(shoppingItems.id, id), eq(shoppingItems.householdId, householdId)),
    )
    .limit(1);
  if (!item) throw new Error("Item not found");

  await db
    .update(shoppingItems)
    .set({ checked: !item.checked })
    .where(eq(shoppingItems.id, id));
  revalidateShopping();
}

export async function deleteShoppingItem(formData: FormData) {
  const { db, householdId } = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Item required");

  const [item] = await db
    .select()
    .from(shoppingItems)
    .where(
      and(eq(shoppingItems.id, id), eq(shoppingItems.householdId, householdId)),
    )
    .limit(1);
  if (!item) throw new Error("Item not found");

  await db.delete(shoppingItems).where(eq(shoppingItems.id, id));
  revalidateShopping();
}

export async function clearCheckedShoppingItems() {
  const { db, householdId } = await requireSession();
  await db
    .delete(shoppingItems)
    .where(
      and(
        eq(shoppingItems.householdId, householdId),
        eq(shoppingItems.checked, true),
      ),
    );
  revalidateShopping();
}
