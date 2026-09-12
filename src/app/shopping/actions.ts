"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { shoppingItems } from "@/db/schema";
import { requireSession } from "@/lib/session";

function revalidateShopping() {
  revalidatePath("/shopping");
}

export async function addShoppingItem(formData: FormData) {
  const { scoped } = await requireSession();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Item required");

  const existing = await scoped.select(shoppingItems);
  const nextOrder =
    existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;

  await scoped.insert(shoppingItems, {
    label,
    checked: false,
    sortOrder: nextOrder,
  });
  revalidateShopping();
}

export async function toggleShoppingItem(formData: FormData) {
  const { scoped } = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Item required");

  const item = await scoped.requireById(shoppingItems, id, "Item");
  await scoped.updateById(shoppingItems, id, { checked: !item.checked }, "Item");
  revalidateShopping();
}

export async function deleteShoppingItem(formData: FormData) {
  const { scoped } = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Item required");

  await scoped.deleteById(shoppingItems, id, "Item");
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
