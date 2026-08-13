import { asc, eq } from "drizzle-orm";
import { AppNav } from "@/components/app-nav";
import { ShoppingList } from "@/components/shopping-list";
import { shoppingItems } from "@/db/schema";
import { getAvailableToAssignCents } from "@/lib/ledger";
import { requireSession } from "@/lib/session";

export default async function ShoppingPage() {
  const { householdId, db } = await requireSession();
  const available = await getAvailableToAssignCents(db, householdId);

  const items = await db
    .select()
    .from(shoppingItems)
    .where(eq(shoppingItems.householdId, householdId))
    .orderBy(asc(shoppingItems.checked), asc(shoppingItems.sortOrder), asc(shoppingItems.createdAt));

  return (
    <>
      <AppNav availableCents={available} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="font-serif text-3xl tracking-tight">Shopping</h1>
        <p className="mt-2 text-[var(--muted)]">
          Shared list — check items off as you go, delete when you don’t need
          them.
        </p>

        <div className="mt-8">
          <ShoppingList
            items={items.map((i) => ({
              id: i.id,
              label: i.label,
              checked: i.checked,
            }))}
          />
        </div>
      </main>
    </>
  );
}
