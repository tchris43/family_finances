"use client";

import { useOptimistic } from "react";
import {
  addShoppingItem,
  clearCheckedShoppingItems,
  deleteShoppingItem,
  toggleShoppingItem,
} from "@/app/shopping/actions";
import { SubmitButton } from "@/components/submit-button";

type Item = { id: string; label: string; checked: boolean };

type OptimisticAction =
  | { type: "toggle"; id: string }
  | { type: "delete"; id: string }
  | { type: "clearChecked" };

function applyOptimisticAction(items: Item[], action: OptimisticAction): Item[] {
  switch (action.type) {
    case "toggle":
      return items.map((i) =>
        i.id === action.id ? { ...i, checked: !i.checked } : i,
      );
    case "delete":
      return items.filter((i) => i.id !== action.id);
    case "clearChecked":
      return items.filter((i) => !i.checked);
  }
}

export function ShoppingList({ items }: { items: Item[] }) {
  const [optimisticItems, applyOptimistic] = useOptimistic(
    items,
    applyOptimisticAction,
  );

  const open = optimisticItems.filter((i) => !i.checked);
  const done = optimisticItems.filter((i) => i.checked);

  async function handleToggle(formData: FormData) {
    applyOptimistic({ type: "toggle", id: String(formData.get("id") ?? "") });
    await toggleShoppingItem(formData);
  }

  async function handleDelete(formData: FormData) {
    applyOptimistic({ type: "delete", id: String(formData.get("id") ?? "") });
    await deleteShoppingItem(formData);
  }

  async function handleClearChecked() {
    applyOptimistic({ type: "clearChecked" });
    await clearCheckedShoppingItems();
  }

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
        <SubmitButton
          pendingLabel="Adding…"
          className="rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
        >
          Add
        </SubmitButton>
      </form>

      {optimisticItems.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">List is empty.</p>
      ) : (
        <>
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {open.map((item) => (
              <ShoppingRow
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </ul>

          {done.length > 0 ? (
            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-[var(--muted)]">
                  Checked off ({done.length})
                </h2>
                <form action={handleClearChecked}>
                  <SubmitButton
                    pendingLabel="Clearing…"
                    className="text-xs text-[var(--muted)] hover:text-red-700"
                  >
                    Clear checked
                  </SubmitButton>
                </form>
              </div>
              <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {done.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
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
  onToggle,
  onDelete,
}: {
  item: Item;
  onToggle: (formData: FormData) => void;
  onDelete: (formData: FormData) => void;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <form action={onToggle} className="flex min-w-0 flex-1 items-center gap-3">
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
      <form action={onDelete}>
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
