"use client";

import { AddDisclosure } from "@/components/add-disclosure";
import { createBucket } from "@/app/plan/actions";

export function AddBucketForm() {
  return (
    <AddDisclosure label="+ Add bucket">
      <form action={createBucket} className="flex flex-wrap gap-2">
        <input
          name="name"
          required
          placeholder="e.g. Groceries"
          className="min-w-[12rem] flex-1 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
        />
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
