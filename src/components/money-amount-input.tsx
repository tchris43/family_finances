"use client";

import { useState } from "react";
import { formatCents } from "@/lib/money";

/**
 * ATM-style amount entry: digits enter from the right.
 * Typing 5 0 0 0 0 → $500.00
 */
export function MoneyAmountInput({
  name = "amount",
  label = "Amount",
  className = "",
}: {
  name?: string;
  label?: string;
  className?: string;
}) {
  const [cents, setCents] = useState(0);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      setCents((prev) => Math.min(prev * 10 + Number(e.key), 9_999_999_999));
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      setCents((prev) => Math.floor(prev / 10));
      return;
    }
    // Block decimal/point/$ and other junk
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!digits) return;
    setCents(Math.min(Number(digits), 9_999_999_999));
  }

  return (
    <label className={`text-sm ${className}`}>
      <span className="text-[var(--muted)]">{label}</span>
      <input type="hidden" name={name} value={(cents / 100).toFixed(2)} />
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatCents(cents)}
        onChange={() => {}}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2.5 font-medium tabular-nums outline-none focus:border-[var(--accent)]"
        aria-label={label}
      />
      <span className="mt-1 block text-xs text-[var(--muted)]">
        Digits only — e.g. 50000 = $500.00
      </span>
    </label>
  );
}
