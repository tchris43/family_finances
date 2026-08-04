"use client";

import { useState } from "react";

export function AddDisclosure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--accent)]"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Cancel
        </button>
      </div>
      {children}
    </div>
  );
}
