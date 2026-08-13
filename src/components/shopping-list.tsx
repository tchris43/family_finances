"use client";

import {
  addShoppingItem,
  clearCheckedShoppingItems,
  deleteShoppingItem,
  toggleShoppingItem,
} from "@/app/shopping/actions";

export function ShoppingList({
  items,
}: {
  items: { id: string; label: string; checked: boolean }[];
}) {
  const open = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  return (
    <div className="space-y-8">
      <form action={addShoppingItem} className="flex flex-wrap gap-2">
        <input
          name="label"
          required
          placeholder="Add an item…"
          autoComplete="off"
          className="min-w-[12rem] flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
        >
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">List is empty.</p>
      ) : (
        <>
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {open.map((item) => (
              <ShoppingRow key={item.id} item={item} />
            ))}
          </ul>

          {done.length > 0 ? (
            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-[var(--muted)]">
                  Checked off ({done.length})
                </h2>
                <form action={clearCheckedShoppingItems}>
                  <button
                    type="submit"
                    className="text-xs text-[var(--muted)] hover:text-red-700"
                  >
                    Clear checked
                  </button>
                </form>
              </div>
              <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {done.map((item) => (
                  <ShoppingRow key={item.id} item={item} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function ShoppingRow({
  item,
}: {
  item: { id: string; label: string; checked: boolean };
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <form action={toggleShoppingItem} className="flex min-w-0 flex-1 items-center gap-3">
        <input type="hidden" name="id" value={item.id} />
        <button
          type="submit"
          aria-label={item.checked ? `Uncheck ${item.label}` : `Check ${item.label}`}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs ${
            item.checked
              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
              : "border-[var(--border)] bg-white"
          }`}
        >
          {item.checked ? "✓" : ""}
        </button>
        <span
          className={`min-w-0 truncate text-sm ${
            item.checked ? "text-[var(--muted)] line-through" : ""
          }`}
        >
          {item.label}
        </span>
      </form>
      <form action={deleteShoppingItem}>
        <input type="hidden" name="id" value={item.id} />
        <button
          type="submit"
          className="text-xs text-[var(--muted)] hover:text-red-700"
        >
          Delete
        </button>
      </form>
    </li>
  );
}
