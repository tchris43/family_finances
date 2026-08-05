"use client";

import { AddDisclosure } from "@/components/add-disclosure";
import { createBucket } from "@/app/plan/actions";

export function AddBucketForm() {
  return (
    <AddDisclosure label="+ Add bucket">
      <form action={createBucket} className="flex flex-wrap items-end gap-2">
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className="text-[var(--muted)]">Name</span>
          <input
            name="name"
            required
            placeholder="e.g. Groceries"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--muted)]">Group</span>
          <select
            name="fundKind"
            defaultValue="necessary"
            className="mt-1 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            <option value="necessary">Necessary</option>
            <option value="unnecessary">Unnecessary</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
        >
          Save
        </button>
      </form>
    </AddDisclosure>
  );
}
